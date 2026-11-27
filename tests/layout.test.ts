// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, describe, expect, test } from 'bun:test';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { clampSplit, groupBySection, isCurrentPath } from '../packages/ui/src/layout/navigation.ts';

const load = async (path: string) => ((await import(path)) as { default: never }).default;
const SiteHeader = await load('../packages/ui/src/layout/SiteHeader.svelte');
const SiteFooter = await load('../packages/ui/src/layout/SiteFooter.svelte');
const DocsLayout = await load('../packages/ui/src/layout/DocsLayout.svelte');
const TableOfContents = await load('../packages/ui/src/layout/TableOfContents.svelte');
const PlaygroundShell = await load('../packages/ui/src/layout/PlaygroundShell.svelte');

const mounted: object[] = [];
const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
    localStorage.clear();
});

function render(component: never, props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(component, { target, props: props as never }));
    flushSync();
    return target;
}

describe('navigation helpers', () => {
    test('match the current path, group by section and clamp splits', () => {
        expect(isCurrentPath('/', '/')).toBe(true);
        expect(isCurrentPath('/', '/docs')).toBe(false);
        expect(isCurrentPath('/docs', '/docs/api')).toBe(true);
        expect(isCurrentPath('/docs', '/docsx')).toBe(false);
        expect(
            groupBySection([
                { href: '/a', label: 'A', section: 'Start' },
                { href: '/b', label: 'B' },
                { href: '/c', label: 'C', section: 'Start' }
            ]).map(([section, links]) => [section, links.map(link => link.label)])
        ).toEqual([
            ['Start', ['A', 'C']],
            ['', ['B']]
        ]);
        expect(clampSplit(0.1)).toBe(0.2);
        expect(clampSplit(0.95)).toBe(0.8);
        expect(clampSplit(0.6)).toBe(0.6);
        expect(clampSplit(Number.NaN)).toBe(0.5);
    });
});

describe('site chrome', () => {
    test('the header marks the current link and renders the brand and actions', () => {
        const host = render(SiteHeader, {
            brand: snippet('<span>Brand</span>'),
            links: [
                { href: '/', label: 'Home' },
                { href: '/docs', label: 'Docs' }
            ],
            current: '/docs/api',
            actions: snippet('<span class="extra">x</span>'),
            class: 'custom'
        });
        expect(host.querySelector('[aria-label="Home"]')?.textContent).toBe('Brand');
        expect(host.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Docs');
        expect(host.querySelector('.extra')).not.toBeNull();
        expect(host.querySelector('header')?.className).toContain('custom');
        const bare = render(SiteHeader, { brand: snippet('<span>B</span>') });
        expect(bare.querySelectorAll('nav a').length).toBe(0);
    });

    test('the footer shows its content and optional links', () => {
        const host = render(SiteFooter, {
            links: [{ href: '/license', label: 'License' }],
            children: snippet('<span>Made here</span>')
        });
        expect(host.textContent).toContain('Made here');
        expect(host.querySelector('nav a')?.getAttribute('href')).toBe('/license');
        expect(render(SiteFooter, {}).querySelector('nav')).toBeNull();
    });
});

describe('docs layout and table of contents', () => {
    test('groups the sidebar and follows the scroll position', () => {
        const rect = Element.prototype.getBoundingClientRect;
        const tops: Record<string, number> = { intro: 10, usage: 400 };
        Element.prototype.getBoundingClientRect = function (this: Element) {
            return { top: tops[this.id] ?? 0 } as DOMRect;
        };
        try {
            document.body.innerHTML = '<h2 id="intro">Intro</h2><h3 id="usage">Usage</h3>';
            const host = render(DocsLayout, {
                nav: [
                    { href: '/docs/start', label: 'Start', section: 'Guide' },
                    { href: '/docs/api', label: 'API' }
                ],
                current: '/docs/api',
                headings: [
                    { id: 'intro', text: 'Intro', level: 2 },
                    { id: 'usage', text: 'Usage', level: 3 },
                    { id: 'missing', text: 'Missing', level: 3 }
                ],
                children: snippet('<p>Body</p>')
            });
            expect(host.textContent).toContain('Guide');
            expect(host.querySelector('nav [aria-current="page"]')?.textContent?.trim()).toBe(
                'API'
            );
            const active = () =>
                host.querySelector('[aria-current="location"]')?.textContent?.trim();
            expect(active()).toBe('Intro');
            tops.usage = 50;
            window.dispatchEvent(new Event('scroll'));
            flushSync();
            expect(active()).toBe('Usage');
            expect(host.querySelector('a[href="#usage"]')?.getAttribute('style')).toContain(
                '1.5rem'
            );
        } finally {
            Element.prototype.getBoundingClientRect = rect;
        }
        const empty = render(TableOfContents, { headings: [] });
        expect(empty.querySelector('nav')).toBeNull();
        const defaults = render(DocsLayout, {
            nav: [],
            current: '/',
            children: snippet('<p>x</p>')
        });
        expect(defaults.querySelector('main')?.textContent).toBe('x');
    });
});

describe('playground shell', () => {
    function shell(props: Record<string, unknown> = {}) {
        const host = render(PlaygroundShell, {
            header: snippet('<h1>Play</h1>'),
            source: snippet('<textarea></textarea>'),
            output: snippet('<div>out</div>'),
            ...props
        });
        const separator = host.querySelector<HTMLElement>('[role="separator"]')!;
        const columns = host.querySelector<HTMLElement>('.playground-columns')!;
        const value = () => Number(separator.getAttribute('aria-valuenow'));
        const key = (name: string) => {
            separator.dispatchEvent(
                new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })
            );
            flushSync();
        };
        return { host, separator, columns, value, key };
    }

    test('resizes with the keyboard, double-click and the pointer, and remembers the split', () => {
        const ui = shell({ status: snippet('<span>ready</span>'), storageKey: 'split' });
        expect(ui.value()).toBe(50);
        expect(ui.host.querySelector('[role="status"]')?.textContent).toBe('ready');
        ui.key('ArrowRight');
        expect(ui.value()).toBe(55);
        ui.key('ArrowLeft');
        ui.key('ArrowLeft');
        expect(ui.value()).toBe(45);
        ui.key('Home');
        expect(ui.value()).toBe(20);
        ui.key('End');
        expect(ui.value()).toBe(80);
        ui.key('x');
        expect(localStorage.getItem('split')).toBe('0.8');
        ui.separator.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        flushSync();
        expect(ui.value()).toBe(50);

        ui.columns.getBoundingClientRect = () => ({ width: 1000 }) as DOMRect;
        const pointer = (type: string, init: PointerEventInit) =>
            ui.separator.dispatchEvent(
                new PointerEvent(type, { bubbles: true, cancelable: true, ...init })
            );
        pointer('pointerdown', { button: 2, pointerId: 1, clientX: 500 });
        pointer('pointermove', { pointerId: 1, clientX: 600 });
        flushSync();
        expect(ui.value()).toBe(50);
        pointer('pointerdown', { button: 0, pointerId: 1, clientX: 500 });
        pointer('pointermove', { pointerId: 2, clientX: 900 });
        pointer('pointermove', { pointerId: 1, clientX: 600 });
        flushSync();
        expect(ui.value()).toBe(60);
        pointer('pointerup', { pointerId: 1 });
        pointer('pointermove', { pointerId: 1, clientX: 900 });
        flushSync();
        expect(ui.value()).toBe(60);
        ui.columns.getBoundingClientRect = () => ({ width: 0 }) as DOMRect;
        pointer('pointerdown', { button: 0, pointerId: 3, clientX: 0 });
        pointer('pointermove', { pointerId: 3, clientX: 100 });
        pointer('pointercancel', { pointerId: 3 });
        flushSync();
        expect(ui.value()).toBe(60);

        const again = shell({ storageKey: 'split' });
        expect(again.value()).toBe(60);
    });

    test('switches between source and output on small screens', () => {
        const ui = shell({ sourceLabel: 'Mermaid', outputLabel: 'SVG' });
        const [source, output] = ui.host.querySelectorAll<HTMLElement>('[role="tab"]');
        const panel = (name: string) =>
            [...ui.host.querySelectorAll('[role="tabpanel"]')].find(
                section =>
                    ui.host.querySelector(
                        `#${CSS.escape(section.getAttribute('aria-labelledby')!)}`
                    )?.textContent === name
            )!;
        expect(source.getAttribute('aria-selected')).toBe('true');
        expect(panel('SVG').className).toContain('hidden');
        output.click();
        flushSync();
        expect(output.getAttribute('aria-selected')).toBe('true');
        expect(panel('Mermaid').className).toContain('hidden');
        source.click();
        flushSync();
        expect(panel('SVG').className).toContain('hidden');
        expect(source.tabIndex).toBe(0);
        expect(output.tabIndex).toBe(-1);
        const list = ui.host.querySelector('[role="tablist"]')!;
        const press = (key: string) => {
            list.dispatchEvent(
                new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
            );
            flushSync();
        };
        press('ArrowRight');
        expect(output.getAttribute('aria-selected')).toBe('true');
        expect(document.activeElement).toBe(output);
        press('ArrowLeft');
        expect(source.getAttribute('aria-selected')).toBe('true');
        press('ArrowLeft');
        expect(output.getAttribute('aria-selected')).toBe('true');
        press('ArrowRight');
        press('End');
        expect(output.getAttribute('aria-selected')).toBe('true');
        press('Home');
        expect(source.getAttribute('aria-selected')).toBe('true');
        press('x');
        expect(source.getAttribute('aria-selected')).toBe('true');
        expect(ui.separator.getAttribute('aria-valuetext')).toBe('50% Mermaid, 50% SVG');
        expect(ui.host.querySelector('[role="status"]')).toBeNull();
    });

    test('falls back to an even split when storage is unavailable', () => {
        const working = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
        const fail = () => {
            throw new Error('blocked');
        };
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: { getItem: fail, setItem: fail }
        });
        try {
            const ui = shell();
            expect(ui.value()).toBe(50);
            ui.key('ArrowRight');
            expect(ui.value()).toBe(55);
        } finally {
            if (working) Object.defineProperty(globalThis, 'localStorage', working);
        }
    });
});
