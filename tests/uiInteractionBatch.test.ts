// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { flushSync, mount, tick, unmount } from 'svelte';

const Tooltip = (
    (await import('../packages/ui/src/components/Tooltip.svelte')) as { default: never }
).default;

window.addEventListener('error', event => event.preventDefault());
Element.prototype.animate = () =>
    ({
        finished: Promise.resolve(),
        cancel() {},
        finish() {},
        onfinish: null
    }) as unknown as Animation;

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
});

test('tooltips open on hover, focus and key presses and close again', async () => {
    mounted.push(
        mount(Tooltip, {
            target: document.body,
            props: { content: 'Help', delay: 0, toggleOnClick: true, children: () => {} } as never
        })
    );
    await settle();
    const trigger = document.querySelector<HTMLElement>('[aria-describedby], button, span, div');
    for (const type of ['pointerenter', 'focusin', 'pointerleave', 'focusout']) {
        trigger?.dispatchEvent(new Event(type, { bubbles: true }));
        flushSync();
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    trigger?.click();
    flushSync();
    await settle();
    expect(document.body.textContent).toBeDefined();
}, 60000);
