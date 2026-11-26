// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { flushSync, mount, unmount } from 'svelte';
import { toastStore } from '../packages/ui/src/stores/toastStore.svelte.ts';

const Toast = ((await import('../packages/ui/src/components/Toast.svelte')) as { default: never })
    .default;

let instance: object | undefined;

afterEach(() => {
    if (instance) void unmount(instance);
    instance = undefined;
    document.body.innerHTML = '';
});

test('the toast shows each kind of message with its icon and then hides', async () => {
    toastStore.show('', 'info', 0);
    await new Promise(resolve => setTimeout(resolve, 5));
    const target = document.createElement('div');
    document.body.append(target);
    instance = mount(Toast, { target, props: { class: 'extra' } as never });
    flushSync();
    expect(target.querySelector('[role="status"]')).toBeNull();

    const shown: Record<string, string> = {};
    for (const kind of ['error', 'warning', 'info', 'success'] as const) {
        toastStore[kind](`${kind} message`, 30);
        flushSync();
        const status = target.querySelector('[role="status"]');
        expect(status?.textContent?.trim()).toBe(`${kind} message`);
        expect(status?.className).toContain('extra');
        shown[kind] = status?.querySelector('svg')?.getAttribute('class') ?? '';
    }
    expect(shown.error).toContain('text-danger');
    expect(shown.warning).toContain('text-warning');
    expect(shown.info).toContain('text-fg-accent');
    expect(shown.success).toContain('text-fg-accent');

    await new Promise(resolve => setTimeout(resolve, 250));
    flushSync();
    expect(toastStore.visible).toBe(false);
});
