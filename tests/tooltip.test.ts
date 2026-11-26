// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';

const Tooltip = (
    (await import('../packages/ui/src/components/Tooltip.svelte')) as { default: never }
).default;

const mounted: object[] = [];
const originalRect = Element.prototype.getBoundingClientRect;
let triggerBox = { top: 300, left: 400, width: 100, height: 30 };
const tooltipBox = { width: 80, height: 20 };

function stubbedRect(this: Element) {
    const box =
        this.getAttribute('role') === 'tooltip' ? { top: 0, left: 0, ...tooltipBox } : triggerBox;
    return {
        ...box,
        right: box.left + box.width,
        bottom: box.top + box.height,
        x: box.left,
        y: box.top,
        toJSON() {}
    } as DOMRect;
}

beforeEach(() => {
    Element.prototype.getBoundingClientRect = stubbedRect;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
});

afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect;
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
    triggerBox = { top: 300, left: 400, width: 100, height: 30 };
});

const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
const button = createRawSnippet(() => ({ render: () => '<button type="button">Trigger</button>' }));
const label = createRawSnippet(() => ({ render: () => '<b>Rich help</b>' }));

function open(props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(
        mount(Tooltip, {
            target,
            props: { content: 'Help', delay: 0, children: button, ...props } as never
        })
    );
    flushSync();
    const wrapper = target.querySelector<HTMLElement>('[role="presentation"]')!;
    wrapper.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    flushSync();
    const tip = [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')].at(-1) ?? null;
    return { wrapper, tip, at: () => [parseFloat(tip!.style.top), parseFloat(tip!.style.left)] };
}

test('flips to the side with room and keeps to the viewport', () => {
    triggerBox = { top: 740, left: 400, width: 100, height: 20 };
    expect(open({ placement: 'bottom' }).at()[0]).toBe(740 - 20 - 6);
    triggerBox = { top: 2, left: 400, width: 100, height: 20 };
    expect(open({ placement: 'top' }).at()[0]).toBe(2 + 20 + 6);
    triggerBox = { top: 300, left: 10, width: 100, height: 20 };
    expect(open({ placement: 'left' }).at()[1]).toBe(10 + 100 + 6);
    triggerBox = { top: 300, left: 930, width: 80, height: 20 };
    expect(open({ placement: 'right' }).at()[1]).toBe(930 - 80 - 6);
    triggerBox = { top: 300, left: 400, width: 100, height: 20 };
    expect(open({ placement: 'top' }).at()[0]).toBe(300 - 20 - 6);
    expect(open({ placement: 'right' }).at()[1]).toBe(400 + 100 + 6);
    expect(open({ placement: 'left' }).at()).toEqual([300, 400 - 80 - 6]);
});

test('aligns to the start, the end or the centre of the trigger', () => {
    expect(open({ align: 'start' }).at()[1]).toBe(400);
    expect(open({ align: 'left' }).at()[1]).toBe(400);
    expect(open({ align: 'end' }).at()[1]).toBe(500 - 80);
    expect(open({ align: 'right' }).at()[1]).toBe(500 - 80);
    expect(open({}).at()[1]).toBe(400 + 10);
});

test('waits for the delay, ignores touch hovers and closes on outside presses', async () => {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(
        mount(Tooltip, {
            target,
            props: { tooltipSnippet: label, delay: 10, children: button, class: 'tip' } as never
        })
    );
    flushSync();
    const wrapper = target.querySelector<HTMLElement>('[role="presentation"]')!;
    const tip = () => document.querySelector<HTMLElement>('[role="tooltip"]');

    wrapper.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    wrapper.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    wrapper.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }));
    await wait(20);
    flushSync();
    expect(tip()).toBeNull();

    wrapper.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    wrapper.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    flushSync();
    expect(tip()).toBeNull();
    await wait(20);
    flushSync();
    expect(tip()?.innerHTML).toContain('<b>Rich help</b>');
    expect(tip()?.className).toContain('tip');

    wrapper
        .querySelector('button')!
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushSync();
    expect(tip()).not.toBeNull();
    window.dispatchEvent(new Event('resize'));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushSync();
    await wait(150);
    flushSync();
    expect(tip()).toBeNull();
});

test('toggles on click and on Enter outside native controls', async () => {
    const text = createRawSnippet(() => ({ render: () => '<span tabindex="0">Text</span>' }));
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(
        mount(Tooltip, {
            target,
            props: { content: 'Help', toggleOnClick: true, delay: 100, children: text } as never
        })
    );
    flushSync();
    const span = target.querySelector('span')!;
    const tip = () => document.querySelector('[role="tooltip"]');
    span.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flushSync();
    expect(tip()).not.toBeNull();
    span.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    flushSync();
    await wait(150);
    flushSync();
    expect(tip()).toBeNull();
});

test('opens on keyboard focus and closes on mouse leave and blur', () => {
    const { wrapper, tip } = open({});
    expect(tip).not.toBeNull();
    const count = () => document.querySelectorAll('[role="tooltip"]').length;
    wrapper.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    flushSync();
    wrapper.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flushSync();
    expect(count()).toBe(1);
    wrapper.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    flushSync();
    expect(wrapper.isConnected).toBe(true);
});

test('stays closed when disabled or empty', () => {
    expect(open({ disabled: true }).tip).toBeNull();
    expect(open({ content: '' }).tip).toBeNull();
});
