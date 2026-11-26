// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { flushSync, mount, unmount } from 'svelte';
import SkipLink from '../packages/ui/src/components/SkipLink.svelte';

const mounted: object[] = [];

afterEach(() => {
    for (const instance of mounted.splice(0)) {
        try {
            void unmount(instance);
        } catch {}
    }
    document.body.innerHTML = '';
});

function render(component: unknown, props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(component as never, { target, props: props as never }));
    flushSync();
    return target;
}

const key = (name: string) =>
    window.dispatchEvent(
        new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })
    );

function setup(props: Record<string, unknown> = {}) {
    const main = document.createElement('main');
    main.id = 'main';
    document.body.append(main);
    const target = render(SkipLink, props);
    const button = target.querySelector('button')!;
    const focus = () => {
        button.dispatchEvent(new FocusEvent('focus'));
        flushSync();
    };
    return { main, target, button, focus };
}

test('skip link shows on focus and moves focus to the main content on enter', () => {
    const { main, target, focus } = setup();
    expect(target.textContent).toContain('Skip to main content');
    expect(target.querySelector('[role="presentation"]')).toBeNull();
    key('Enter');
    expect(document.activeElement).not.toBe(main);
    focus();
    expect(target.querySelector('[role="presentation"]')).not.toBeNull();
    key('x');
    key('Enter');
    flushSync();
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
    main.dispatchEvent(new FocusEvent('blur'));
    expect(main.hasAttribute('tabindex')).toBe(false);
});

test('skip link hides on escape, tab, blur and a click on the overlay', () => {
    const { target, button, focus } = setup({ label: 'Skip', class: 'extra' });
    const overlay = () => target.querySelector<HTMLElement>('[role="presentation"]');
    focus();
    key('Escape');
    flushSync();
    expect(overlay()).toBeNull();
    focus();
    key('Tab');
    flushSync();
    expect(overlay()).toBeNull();
    focus();
    overlay()!.click();
    flushSync();
    expect(overlay()).toBeNull();
    focus();
    button.dispatchEvent(new FocusEvent('blur'));
    flushSync();
    expect(overlay()).toBeNull();
    expect(target.innerHTML).toContain('extra');
});

test('skip link activation without a target only hides it', () => {
    const { main, target, focus } = setup({ targetId: 'missing' });
    focus();
    key(' ');
    flushSync();
    expect(target.querySelector('[role="presentation"]')).toBeNull();
    expect(main.hasAttribute('tabindex')).toBe(false);
});
