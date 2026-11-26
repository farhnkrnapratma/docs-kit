// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, describe, expect, test } from 'bun:test';
import { detectPlatform } from '../packages/ui/src/platform.ts';
import { popoverPosition } from '../packages/ui/src/utils/popoverPosition.ts';

describe('detectPlatform', () => {
    test('reads the client hints, platform and user agent', () => {
        expect(detectPlatform(null)).toBe('other');
        expect(detectPlatform({ userAgentData: { platform: 'macOS' } })).toBe('mac');
        expect(detectPlatform({ platform: 'iPhone' })).toBe('mac');
        expect(detectPlatform({ userAgent: 'Mozilla Windows NT' })).toBe('windows');
        expect(detectPlatform({ userAgent: 'X11; Linux x86_64' })).toBe('linux');
        expect(detectPlatform({ userAgent: 'Plan9' })).toBe('other');
        expect(detectPlatform({ userAgentData: null })).toBe('other');
    });
});

describe('popoverPosition', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    function layout(anchorRect: Partial<DOMRect>, popoverSize: { w: number; h: number }) {
        document.body.innerHTML = '<div id="anchor"><div id="pop"></div></div>';
        const anchor = document.getElementById('anchor') as HTMLElement;
        const node = document.getElementById('pop') as HTMLElement;
        const full = { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0, ...anchorRect };
        full.bottom = full.top + full.height;
        full.right = full.left + full.width;
        anchor.getBoundingClientRect = () => full as DOMRect;
        Object.defineProperty(node, 'offsetWidth', { value: popoverSize.w, configurable: true });
        Object.defineProperty(node, 'offsetHeight', { value: popoverSize.h, configurable: true });
        Object.defineProperty(document.documentElement, 'clientWidth', {
            value: 1000,
            configurable: true
        });
        Object.defineProperty(document.documentElement, 'clientHeight', {
            value: 800,
            configurable: true
        });
        return { anchor, node };
    }

    const settle = () => new Promise(resolve => setTimeout(resolve, 30));

    test('places below by default and aligns to the end', async () => {
        const { node } = layout(
            { top: 100, left: 300, width: 100, height: 20 },
            { w: 150, h: 100 }
        );
        const action = popoverPosition(node, { matchWidth: true });
        await settle();
        expect(node.getAttribute('data-placement')).toBe('bottom');
        expect(node.style.width).toBe('100px');
        expect(node.style.top).toBe('26px');
        action.destroy();
    });

    test('flips above when there is no room below and centres without a suffix', async () => {
        const { node } = layout(
            { top: 700, left: 450, width: 100, height: 20 },
            { w: 200, h: 300 }
        );
        const action = popoverPosition(node, { placement: 'bottom' });
        await settle();
        expect(node.getAttribute('data-placement')).toBe('top');
        expect(node.style.left).toBe('-50px');
        action.destroy();
    });

    test('honours top placement, falls back below, and clamps to the viewport', async () => {
        const { node } = layout({ top: 20, left: 900, width: 100, height: 20 }, { w: 300, h: 500 });
        const action = popoverPosition(node, { placement: 'top-start', strategy: 'fixed' });
        await settle();
        expect(node.getAttribute('data-placement')).toBe('bottom');
        expect(Number.parseInt(node.style.left)).toBeLessThanOrEqual(700);
        action.update({ placement: 'top-end', anchor: node.parentElement, offset: 2, padding: 4 });
        await settle();
        action.update();
        await settle();
        action.destroy();
    });

    test('keeps the popover inside the left edge and prefers top when it fits', async () => {
        const { node } = layout({ top: 600, left: 0, width: 20, height: 20 }, { w: 400, h: 100 });
        const action = popoverPosition(node, { placement: 'top-end', autoMaxHeight: false });
        await settle();
        expect(node.getAttribute('data-placement')).toBe('top');
        expect(node.style.left).toBe('8px');
        expect(node.style.maxHeight).toBe('');
        action.destroy();
    });

    test('does nothing without an anchor', async () => {
        const node = document.createElement('div');
        const action = popoverPosition(node);
        await settle();
        expect(node.getAttribute('data-placement')).toBeNull();
        action.destroy();
    });
});
