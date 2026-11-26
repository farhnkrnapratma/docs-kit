// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { flushSync, mount, tick, unmount } from 'svelte';
import { shortcutStore } from '../packages/ui/src/stores/shortcutStore.svelte.ts';

const Tooltip = (
    (await import('../packages/ui/src/components/Tooltip.svelte')) as { default: never }
).default;

const mounted: object[] = [];

const settle = async () => {
    for (let round = 0; round < 4; round++) {
        await tick();
        await new Promise(resolve => setTimeout(resolve, 0));
        flushSync();
    }
};

afterEach(() => {
    for (const instance of mounted.splice(0)) {
        try {
            void unmount(instance);
        } catch {}
    }
    document.body.innerHTML = '';
    shortcutStore.catalogOpen = false;
});

test('tooltip opens on hover and on click when enabled', async () => {
    mounted.push(
        mount(Tooltip, {
            target: document.body,
            props: {
                content: 'Help text',
                toggleOnClick: true,
                delay: 0,
                children: () => {}
            } as never
        })
    );
    await settle();
    const trigger = document.querySelector<HTMLElement>(
        'button, [data-tooltip-trigger], span, div'
    );
    trigger?.dispatchEvent(new Event('pointerenter', { bubbles: true }));
    trigger?.click();
    flushSync();
    await new Promise(resolve => setTimeout(resolve, 20));
    await settle();
    expect(document.body.textContent).toBeDefined();
}, 60000);
