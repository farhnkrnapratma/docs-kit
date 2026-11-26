// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';

const Button = ((await import('../packages/ui/src/components/Button.svelte')) as { default: never })
    .default;

const mounted: object[] = [];
const icon = createRawSnippet(() => ({ render: () => '<svg></svg>' }));
const text = createRawSnippet(() => ({ render: () => '<b>Body</b>' }));

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
});

function render(props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(Button, { target, props: props as never }));
    flushSync();
    return target.querySelector<HTMLElement>('button, a')!;
}

const parts = (element: HTMLElement) =>
    [...element.querySelectorAll('span')].map(span =>
        span.textContent?.replace(/\s+/g, ' ').trim()
    );

test('middle truncation splits labels at a space, an extension or the 60% mark', () => {
    expect(parts(render({ label: 'Download report', truncateMiddle: true }))).toContain('report');
    expect(parts(render({ label: 'notes.mdrs', truncateMiddle: true }))).toContain('.mdrs');
    const long = render({ label: 'abcdefghijkl', truncateMiddle: true });
    expect(parts(long)).toContain('ijkl');
    expect(long.getAttribute('title')).toBe('abcdefghijkl');
    const short = render({ label: '  short  ', truncateMiddle: true });
    expect(short.querySelectorAll('span span').length).toBe(1);
});

test('responsive icon-only buttons hide their label or content on small screens', () => {
    for (const size of ['3xs', 'md']) {
        const truncated = render({
            label: 'Copy link',
            responsiveIconOnly: true,
            truncateMiddle: true,
            size,
            leading: icon,
            trailing: icon
        });
        expect(truncated.querySelector('.hidden')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
            'Copy link'
        );
        expect(truncated.getAttribute('title')).toBe('Copy link');
        const plain = render({ label: 'Copy', responsiveIconOnly: true, size, leading: icon });
        expect(plain.querySelector('.hidden')?.textContent).toBe('Copy');
        const single = render({ label: 'Go', responsiveIconOnly: true, truncateMiddle: true });
        expect(single.querySelector('.hidden span span')?.textContent).toBe('Go');
    }
    const content = render({ responsiveIconOnly: true, children: text, trailing: icon });
    expect(content.querySelector('.sr-only b')?.textContent).toBe('Body');
    const children = render({ children: text, size: '2xs', leading: icon });
    expect(children.querySelector('b')?.textContent).toBe('Body');
});

test('inactive buttons and links swallow clicks', () => {
    let clicks = 0;
    const onclick = () => clicks++;
    const loading = render({ label: 'Save', isLoading: true, onclick, trailing: icon });
    loading.click();
    expect(loading.getAttribute('aria-busy')).toBe('true');
    const link = render({ label: 'Docs', href: '/docs', disabled: true, onclick, download: true });
    link.click();
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(link.getAttribute('download')).toBe('');
    expect(clicks).toBe(0);
    const named = render({ label: 'Docs', href: '/d', download: 'file.txt', onclick });
    expect(named.getAttribute('download')).toBe('file.txt');
    named.click();
    expect(clicks).toBe(1);
});
