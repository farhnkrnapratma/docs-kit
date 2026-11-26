// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { platformStore } from '../packages/ui/src/stores/platformStore.svelte.ts';
import { themeStore } from '../packages/ui/src/stores/themeStore.svelte.ts';
import { toastStore } from '../packages/ui/src/stores/toastStore.svelte.ts';

const load = async (path: string) => ((await import(path)) as { default: never }).default;
const ShortcutBadge = await load('../packages/ui/src/components/ShortcutBadge.svelte');
const IconButton = await load('../packages/ui/src/components/IconButton.svelte');
const ThemeSelect = await load('../packages/ui/src/components/filter/ThemeSelect.svelte');

const mounted: object[] = [];

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
});

function render(component: never, props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(component, { target, props: props as never }));
    flushSync();
    return target;
}

function onPlatform(platform: string, run: () => void) {
    Object.defineProperty(navigator, 'userAgentData', { configurable: true, value: { platform } });
    platformStore.detect();
    try {
        run();
    } finally {
        delete (navigator as { userAgentData?: unknown }).userAgentData;
        platformStore.detect();
    }
}

test('shortcut badges spell keys as text or icons and mark the leader', () => {
    onPlatform('Windows', () => {
        const badge = render(ShortcutBadge, { combo: 'Ctrl+Shift+K', class: 'extra' });
        expect(badge.querySelector('.sr-only')?.textContent).toBe('Control then Shift then K');
        expect(badge.querySelectorAll('kbd').length).toBe(3);
        expect(badge.innerHTML).toContain('extra');
    });
    onPlatform('macOS', () => {
        const badge = render(ShortcutBadge, { combo: 'Mod+Alt+Enter', leader: true, active: true });
        expect(badge.querySelector('.sr-only')?.textContent).toBe(
            'Leader then Option then Command then Return'
        );
        expect(badge.querySelectorAll('kbd svg').length).toBe(4);
        expect(badge.querySelector('kbd')?.className).toContain('text-fg-accent');
        const more = render(ShortcutBadge, { combo: 'Tab+CapsLock+Shift+Ctrl' });
        expect(more.querySelectorAll('kbd svg').length).toBe(4);
    });
});

test('icon buttons render as buttons or links, with or without a tooltip', async () => {
    const icon = createRawSnippet(() => ({ render: () => '<svg></svg>' }));
    const variants = ['default', 'ghost', 'borderless', 'overlay', 'floating', 'floating-accent'];
    for (const [index, variant] of variants.entries()) {
        const sizes = ['2xs', 'xs', 'sm', 'md', 'lg'];
        const host = render(IconButton, {
            ariaLabel: `Action ${variant}`,
            variant,
            size: sizes[index % sizes.length],
            children: icon
        });
        expect(host.querySelector('button')?.getAttribute('aria-label')).toBe(`Action ${variant}`);
    }
    const link = render(IconButton, {
        ariaLabel: 'Open',
        href: '/docs',
        target: '_blank',
        rel: 'noopener',
        showTooltip: false,
        disabled: true,
        keyboardShortcut: 'Shift+O',
        children: icon
    });
    const anchor = link.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/docs');
    expect(anchor?.hasAttribute('disabled')).toBe(false);
    expect(link.querySelector('[role="presentation"]')).toBeNull();
    const plain = render(IconButton, { ariaLabel: 'Plain', tooltip: 'Hint', type: 'submit' });
    expect(plain.querySelector('button')?.getAttribute('type')).toBe('submit');
    plain
        .querySelector('[role="presentation"]')!
        .dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await new Promise(resolve => setTimeout(resolve, 200));
    flushSync();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Hint');
});

test('the theme switch cycles the theme, reports it and animates the icon', async () => {
    themeStore.apply('auto');
    const host = render(ThemeSelect, { label: 'Theme', class: 'hidden md:flex' });
    expect(host.textContent).toContain('Theme');
    const button = () => host.querySelector('button')!;
    expect(button().getAttribute('aria-label')).toBe('Theme: Auto');
    button().click();
    flushSync();
    expect(themeStore.current).toBe('light');
    expect(toastStore.message).toBe('Switched to light theme');
    button().click();
    expect(themeStore.current).toBe('light');
    await new Promise(resolve => setTimeout(resolve, 300));
    button().click();
    flushSync();
    expect(themeStore.current).toBe('dark');
    expect(toastStore.message).toBe('Switched to dark theme');
    await new Promise(resolve => setTimeout(resolve, 300));
    button().click();
    flushSync();
    expect(toastStore.message).toBe('Switched to system theme');

    const picked: string[] = [];
    const custom = render(ThemeSelect, {
        variant: 'ghost',
        size: 'xs',
        dropdownDirection: 'up',
        onThemeChange: (next: string) => picked.push(next)
    });
    custom.querySelector('button')!.click();
    expect(picked).toEqual(['light']);
    const tiny = render(ThemeSelect, { size: '2xs' });
    expect(tiny.querySelector('button')?.className).not.toContain('sm:size-9');
    themeStore.apply('auto');
});
