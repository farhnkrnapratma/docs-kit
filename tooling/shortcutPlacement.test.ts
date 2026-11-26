// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { shortcut } from '../packages/ui/src/utils/shortcut.svelte.ts';

window.addEventListener('error', event => event.preventDefault());

const cleanups: Array<() => void> = [];

function holdAlt() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', bubbles: true }));
    cleanups.push(() =>
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }))
    );
}

function shortcutWithAlt(host: HTMLElement, params: Parameters<typeof shortcut>[1]) {
    const handle = shortcut(host, params);
    cleanups.push(() => handle.destroy());
    holdAlt();
    handle.update(params);
    return handle;
}

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    document.body.innerHTML = '';
});

function rect(left: number, top: number, width: number, height: number): DOMRect {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON() {}
    } as DOMRect;
}

function withLayout(
    stubs: {
        rect: (element: Element) => DOMRect;
        caret?: (x: number, y: number) => unknown;
        fromPoint?: (x: number, y: number) => Element | null;
        clientRects?: () => DOMRect[];
    },
    run: () => void
) {
    const doc = document as unknown as Record<string, unknown>;
    const originals = {
        rect: Element.prototype.getBoundingClientRect,
        caret: doc.caretPositionFromPoint,
        fromPoint: doc.elementFromPoint,
        clientRects: Range.prototype.getClientRects
    };
    Element.prototype.getBoundingClientRect = function () {
        return stubs.rect(this);
    };
    if (stubs.caret) doc.caretPositionFromPoint = stubs.caret;
    if (stubs.fromPoint) doc.elementFromPoint = stubs.fromPoint;
    if (stubs.clientRects) Range.prototype.getClientRects = stubs.clientRects as never;
    try {
        run();
    } finally {
        Element.prototype.getBoundingClientRect = originals.rect;
        doc.caretPositionFromPoint = originals.caret;
        doc.elementFromPoint = originals.fromPoint;
        Range.prototype.getClientRects = originals.clientRects;
    }
}

test('badge moves away from text it would cover', () => {
    const host = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = 'Visible label';
    host.append(label);
    document.body.append(host);
    const text = label.firstChild as Node;
    withLayout(
        {
            rect: element => (element === host ? rect(0, 0, 200, 40) : rect(150, 0, 40, 20)),
            caret: () => ({ offsetNode: text }),
            clientRects: () => [rect(0, 0, 200, 40)]
        },
        () => {
            shortcutWithAlt(host, { combo: 'a', label: 'Open' } as never);
            expect(host.querySelector('[data-shortcut-hint]')).not.toBeNull();
        }
    );
});

test('badge avoids interactive controls under its candidate positions', () => {
    const host = document.createElement('div');
    const control = document.createElement('button');
    document.body.append(host, control);
    withLayout(
        {
            rect: element => (element === host ? rect(0, 0, 200, 40) : rect(10, 10, 30, 12)),
            fromPoint: () => control
        },
        () => {
            shortcutWithAlt(host, { combo: 'a', label: 'Open' } as never);
            expect(host.querySelector('[data-shortcut-hint]')).not.toBeNull();
        }
    );
});

test('badge outside the viewport takes the heaviest penalty and still renders', () => {
    const host = document.createElement('div');
    document.body.append(host);
    withLayout(
        { rect: element => (element === host ? rect(0, 0, 200, 40) : rect(-900, -900, 30, 12)) },
        () => {
            shortcutWithAlt(host, { combo: 'a', label: 'Open' } as never);
            expect(host.querySelector('[data-shortcut-hint]')).not.toBeNull();
        }
    );
});

test('badge in a clipping container is penalised by the clipped area', () => {
    const clip = document.createElement('div');
    clip.style.overflow = 'hidden';
    const host = document.createElement('div');
    clip.append(host);
    document.body.append(clip);
    withLayout(
        {
            rect: element =>
                element === clip
                    ? rect(0, 0, 100, 40)
                    : element === host
                      ? rect(0, 0, 100, 40)
                      : rect(90, 30, 40, 20)
        },
        () => {
            const handle = shortcutWithAlt(host, { combo: 'a', label: 'Open' } as never);
            handle.update({ combo: 'a', label: 'Open', placement: 'inline' } as never);
            expect(host.style.paddingInlineEnd).not.toBe('');
            handle.update({ combo: '', label: 'Open' } as never);
            expect(host.style.paddingInlineEnd).toBe('');
        }
    );
});

function withViewport(width: number, height: number, run: () => void) {
    const root = document.documentElement;
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: height });
    try {
        run();
    } finally {
        delete (root as unknown as Record<string, unknown>).clientWidth;
        delete (root as unknown as Record<string, unknown>).clientHeight;
    }
}

test('a wide host tries the end positions first and weighs text under the badge', () => {
    const host = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = 'Visible label';
    host.append(label);
    document.body.append(host);
    Object.defineProperty(host, 'offsetWidth', { configurable: true, value: 200 });
    const text = label.firstChild as Node;
    let rangeChecks = 0;
    withViewport(1000, 800, () =>
        withLayout(
            {
                rect: element => (element === host ? rect(0, 0, 200, 40) : rect(150, 0, 40, 20)),
                caret: () => ({ offsetNode: text }),
                clientRects: () => {
                    rangeChecks += 1;
                    return [rect(0, 0, 200, 40)];
                }
            },
            () => {
                shortcutWithAlt(host, { combo: 'a', label: 'Open' } as never);
                expect(host.querySelector('[data-shortcut-hint]')).not.toBeNull();
            }
        )
    );
    expect(rangeChecks).toBeGreaterThan(0);
});

test('a shortcut without a label is named after the element', async () => {
    const { shortcutStore } = await import('../packages/ui/src/stores/shortcutStore.svelte.ts');
    const named = (setup: (node: HTMLElement) => void) => {
        const node = document.createElement('button');
        setup(node);
        document.body.append(node);
        const handle = shortcut(node, { combo: 'Shift+Q' });
        const labels = shortcutStore.catalogEntries().map(entry => entry.label);
        handle.destroy();
        return labels;
    };
    expect(named(node => node.setAttribute('aria-label', 'Close'))).toContain('Close');
    expect(named(node => node.setAttribute('title', 'Help'))).toContain('Help');
    expect(named(node => (node.textContent = '  Save draft  '))).toContain('Save draft');
    expect(named(() => {})).toContain('Action');
});
