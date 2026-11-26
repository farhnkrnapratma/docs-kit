// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, beforeEach, expect, test } from 'bun:test';
import { flushSync, mount, tick, unmount } from 'svelte';
import { setTabPreference } from '../packages/dom/src/tabs.ts';

const CodeTabs = ((await import('../packages/dom/src/CodeTabs.svelte')) as { default: never })
    .default;

const mounted: object[] = [];
const anchorClick = HTMLAnchorElement.prototype.click;
let written: string[] = [];
let clipboardFails = false;
let downloads: string[] = [];

beforeEach(() => {
    written = [];
    downloads = [];
    clipboardFails = false;
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
            writeText: async (text: string) => {
                if (clipboardFails) throw new Error('denied');
                written.push(text);
            }
        }
    });
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        downloads.push(this.getAttribute('href') ?? '');
    };
});

afterEach(() => {
    HTMLAnchorElement.prototype.click = anchorClick;
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
});

const tabs = [
    { label: 'npm', code: 'npm install @mdrs/core' },
    {
        label: 'bun',
        code: 'bun add @mdrs/core',
        copyLabel: 'Command',
        downloadUrl: '/install.sh',
        downloadLabel: 'Download the script'
    },
    { label: 'cargo', code: 'cargo add mdrs', downloadUrl: '/mdrs.toml' }
];

function render(props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(
        mount(CodeTabs, { target, props: { tabs, ariaLabel: 'Install', ...props } as never })
    );
    flushSync();
    const code = () => target.querySelector('code')?.textContent;
    const tab = (index: number) => target.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    const key = (name: string) => {
        target
            .querySelector('[role="tablist"]')!
            .dispatchEvent(
                new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })
            );
        flushSync();
    };
    return { target, code, tab, key };
}

test('tabs switch on click and with the arrow, Home and End keys', () => {
    const ui = render({ command: true, class: 'extra' });
    expect(ui.code()).toBe('npm install @mdrs/core');
    expect(ui.target.querySelector('.mdrs-code-prompt')?.textContent).toBe('$');
    ui.tab(1).click();
    flushSync();
    expect(ui.code()).toBe('bun add @mdrs/core');
    ui.key('ArrowRight');
    expect(ui.code()).toBe('cargo add mdrs');
    expect(document.activeElement).toBe(ui.tab(2));
    ui.key('ArrowRight');
    expect(ui.code()).toBe('npm install @mdrs/core');
    ui.key('ArrowLeft');
    expect(ui.code()).toBe('cargo add mdrs');
    ui.key('Home');
    expect(ui.code()).toBe('npm install @mdrs/core');
    ui.key('End');
    expect(ui.code()).toBe('cargo add mdrs');
    ui.key('x');
    expect(ui.code()).toBe('cargo add mdrs');
    expect(ui.tab(2).getAttribute('aria-selected')).toBe('true');
});

test('synced tab groups follow each other and the stored choice', async () => {
    setTabPreference('installer', 'cargo');
    const first = render({ syncKey: 'installer' });
    const second = render({ syncKey: 'installer' });
    flushSync();
    expect(first.code()).toBe('cargo add mdrs');
    first.tab(1).click();
    flushSync();
    expect(second.code()).toBe('bun add @mdrs/core');
    setTabPreference('installer', 'pip');
    setTabPreference('other', 'npm');
    flushSync();
    expect(second.code()).toBe('bun add @mdrs/core');
    await tick();
});

test('copies the current code and offers its download', async () => {
    const ui = render({});
    const copy = () => ui.target.querySelector<HTMLElement>('[title="Copy"]')!;
    expect(copy().getAttribute('aria-label')).toBe('Copy code');
    expect(ui.target.querySelector('[title^="Download"]')).toBeNull();
    copy().click();
    await new Promise(resolve => setTimeout(resolve, 0));
    flushSync();
    expect(written).toEqual(['npm install @mdrs/core']);
    expect(copy().querySelector('.text-fg-accent')).not.toBeNull();
    copy().click();
    await new Promise(resolve => setTimeout(resolve, 1600));
    flushSync();
    expect(copy().querySelector('.text-fg-accent')).toBeNull();

    ui.tab(1).click();
    flushSync();
    expect(copy().getAttribute('aria-label')).toBe('Copy command');
    ui.target.querySelector<HTMLElement>('[title="Download the script"]')!.click();
    ui.tab(2).click();
    flushSync();
    ui.target.querySelector<HTMLElement>('[title="Download cargo"]')!.click();
    expect(downloads).toEqual(['/install.sh', '/mdrs.toml']);

    clipboardFails = true;
    copy().click();
    await new Promise(resolve => setTimeout(resolve, 0));
    flushSync();
    expect(copy().querySelector('.text-fg-accent')).toBeNull();
});
