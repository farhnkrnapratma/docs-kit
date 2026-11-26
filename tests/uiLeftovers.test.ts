// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { flushSync, mount, unmount } from 'svelte';
import { portal } from '../packages/ui/src/utils/actions.ts';
import { popoverPosition } from '../packages/ui/src/utils/popoverPosition.ts';
import { codeBlockPrefsStore } from '../packages/dom/src/codeBlockPrefsStore.svelte.ts';

const LoadingIndicator = (
    (await import('../packages/ui/src/components/LoadingIndicator.svelte')) as { default: never }
).default;
const MdrsHtml = ((await import('../packages/dom/src/MdrsHtml.svelte')) as { default: never })
    .default;

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

test('portal update accepts an element as well as a selector', () => {
    const node = document.createElement('p');
    const box = document.createElement('section');
    document.body.append(box);
    const action = portal(node);
    action.update(box);
    expect(node.parentElement).toBe(box);
    action.destroy();
});

test('a detached popover measures against the document', async () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const node = document.createElement('div');
    const action = popoverPosition(node, { anchor });
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(node.getAttribute('data-placement')).not.toBeNull();
    action.destroy();
});

test('code block preferences stop listening and drop the callback on cleanup', () => {
    let calls = 0;
    const stop = codeBlockPrefsStore.init(() => calls++);
    window.dispatchEvent(
        new window.StorageEvent('storage', { key: 'codeblock_prefs', newValue: '{"wrap":true}' })
    );
    expect(calls).toBe(1);
    expect(codeBlockPrefsStore.current.wrap).toBe(true);
    stop?.();
    const after = calls;
    window.dispatchEvent(
        new window.StorageEvent('storage', { key: 'codeblock_prefs', newValue: '{"wrap":false}' })
    );
    expect(calls).toBe(after);
    codeBlockPrefsStore.init()?.();
});

test('the loading indicator styles contained and current-colour spinners', () => {
    const contained = render(LoadingIndicator, { contained: true, size: 'sm' });
    expect(contained.innerHTML).toContain('rounded-full');
    const current = render(LoadingIndicator, { tone: 'current', decorative: true });
    expect(current.innerHTML).not.toContain('text-accent');
    expect(current.querySelector('[aria-hidden="true"]')).not.toBeNull();
});

test('MdrsHtml inserts the rendered html in a div or a span', () => {
    const block = render(MdrsHtml, { html: '<p>Hi <strong>there</strong></p>', class: 'prose' });
    expect(block.querySelector('div.prose p strong')?.textContent).toBe('there');
    const inline = render(MdrsHtml, { html: '<em>x</em>', as: 'span' });
    expect(inline.querySelector('span em')?.textContent).toBe('x');
});
