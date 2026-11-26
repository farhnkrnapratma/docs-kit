// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';

const Dropdown = (
    (await import('../packages/ui/src/components/Dropdown.svelte')) as { default: never }
).default;

const mounted: object[] = [];

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(Dropdown, { target, props: props as never }));
    flushSync();
    const toggle = target.querySelector<HTMLElement>('button')!;
    const menu = () =>
        document.querySelector<HTMLElement>('[role="listbox"], [role="menu"], [role="dialog"]');
    const open = async () => {
        toggle.click();
        flushSync();
        await tick();
        await tick();
    };
    const key = (name: string) => {
        menu()!.dispatchEvent(
            new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })
        );
        flushSync();
    };
    return { target, toggle, menu, open, key };
}

const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta', shortLabel: 'B' },
    { value: 3, label: 'Three' }
];

test('a single select shows the choice, moves with the keyboard and closes on pick', async () => {
    const changes: unknown[] = [];
    const opened: boolean[] = [];
    const ui = await render({
        label: 'Kind',
        options,
        value: 'b',
        size: 'sm',
        onChange: (value: unknown) => changes.push(value),
        onOpenChange: (open: boolean) => opened.push(open)
    });
    expect(ui.toggle.getAttribute('aria-label')).toBe('Kind: Beta');
    expect(ui.target.textContent).toContain('B');
    await ui.open();
    expect(ui.menu()?.getAttribute('role')).toBe('listbox');
    expect(document.activeElement?.textContent?.trim()).toBe('Beta');
    for (const name of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'x']) ui.key(name);
    expect(document.activeElement?.textContent?.trim()).toBe('Three');
    (document.activeElement as HTMLElement).blur();
    ui.key('ArrowUp');
    ui.key('ArrowDown');
    const items = ui.menu()!.querySelectorAll<HTMLElement>('[role="option"]');
    expect(items[1].getAttribute('aria-selected')).toBe('true');
    items[2].click();
    flushSync();
    expect(changes).toEqual([3]);
    expect(ui.menu()).toBeNull();
    expect(ui.toggle.getAttribute('aria-label')).toBe('Kind: Three');
    expect(opened).toEqual([true, false]);
});

test('a multiple select toggles values and counts them', async () => {
    const ui = await render({ options, multiple: true, value: [' A '], fullWidth: true });
    expect(ui.toggle.textContent).toContain('1 selected');
    await ui.open();
    expect(ui.menu()?.getAttribute('aria-multiselectable')).toBe('true');
    const items = () => ui.menu()!.querySelectorAll<HTMLElement>('[role="option"]');
    items()[0].click();
    flushSync();
    expect(ui.toggle.textContent).toContain('All');
    items()[1].click();
    items()[2].click();
    flushSync();
    expect(ui.toggle.textContent).toContain('2 selected');
    expect(ui.menu()).not.toBeNull();
    ui.key('Escape');
    expect(ui.menu()).toBeNull();
});

test('an empty select shows the placeholder and an empty list', async () => {
    const ui = await render({ placeholder: 'Pick one', ariaLabel: 'Choices' });
    expect(ui.toggle.textContent).toContain('Pick one');
    await ui.open();
    expect(ui.menu()?.textContent).toContain('No matches found');
    ui.key('ArrowDown');
    ui.key('Tab');
    expect(ui.menu()).toBeNull();
    const unset = await render({ options, value: '' });
    expect(unset.toggle.textContent).toContain('All');
    const unknown = await render({ options, value: 'zzz' });
    expect(unknown.toggle.textContent).toContain('zzz');
});

test('actions run once and close the menu, skipping disabled ones', async () => {
    const ran: string[] = [];
    const icon = (await import('@lucide/svelte')).Copy;
    const ui = await render({
        placement: 'bottom-end',
        shortcutScope: 'menu',
        actions: [
            { label: 'Copy', icon, onSelect: () => ran.push('copy') },
            { label: 'Delete', danger: true, onSelect: () => ran.push('delete') },
            { label: 'Off', disabled: true, onSelect: () => ran.push('off') }
        ]
    });
    await ui.open();
    expect(ui.menu()?.getAttribute('role')).toBe('menu');
    const items = ui.menu()!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    expect(items[2].disabled).toBe(true);
    items[1].click();
    flushSync();
    expect(ran).toEqual(['delete']);
    expect(ui.menu()).toBeNull();
});

test('custom triggers and content get the open state and a close callback', async () => {
    const trigger = createRawSnippet((state: () => { isOpen: boolean; toggle: () => void }) => ({
        render: () =>
            `<button type="button" class="custom">${state().isOpen ? 'open' : 'closed'}</button>`,
        setup: node => {
            node.addEventListener('click', () => state().toggle());
        }
    }));
    const body = createRawSnippet((api: () => { close: () => void }) => ({
        render: () => '<div><button type="button" class="done">Done</button></div>',
        setup: node => {
            node.querySelector('.done')!.addEventListener('click', () => api().close());
        }
    }));
    const ui = await render({ trigger, children: body });
    await ui.open();
    expect(ui.menu()?.getAttribute('role')).toBe('dialog');
    document.querySelector<HTMLElement>('.done')!.click();
    flushSync();
    expect(ui.menu()).toBeNull();
    await ui.open();
    document.querySelector<HTMLElement>('[aria-label="Close menu"]')!.click();
    flushSync();
    expect(ui.menu()).toBeNull();
});

test('a disabled dropdown does not open', async () => {
    const ui = await render({ options, disabled: true });
    await ui.open();
    expect(ui.menu()).toBeNull();
});
