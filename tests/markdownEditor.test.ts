// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { flushSync, mount, tick, unmount } from 'svelte';

const MarkdownEditor = (
    (await import('../packages/editor/src/MarkdownEditor.svelte')) as { default: never }
).default;

const mounted: object[] = [];
const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
const settle = async (ms = 0) => {
    await tick();
    await wait(ms);
    flushSync();
};

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
    localStorage.clear();
});

function render(props: Record<string, unknown> = {}) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(
        mount(MarkdownEditor, {
            target,
            props: { render: (source: string) => `<p>${source.length}</p>`, ...props } as never
        })
    );
    flushSync();
    const area = () => target.querySelector('textarea')!;
    const type = async (text: string, caret = text.length) => {
        area().value = text;
        area().setSelectionRange(caret, caret);
        area().dispatchEvent(
            new InputEvent('input', { data: text.slice(caret - 1, caret), bubbles: true })
        );
        await settle();
    };
    const key = async (name: string, init: KeyboardEventInit = {}) => {
        const event = new KeyboardEvent('keydown', {
            key: name,
            bubbles: true,
            cancelable: true,
            ...init
        });
        area().dispatchEvent(event);
        await settle();
        return event;
    };
    const options = () => [...target.querySelectorAll<HTMLElement>('[role="option"]')];
    const state = {
        get value() {
            return area().value;
        }
    };
    return { target, state, area, type, key, options };
}

test('suggests directives and variables and inserts the chosen one', async () => {
    const ui = render();
    await ui.type('Intro\n\n:::no');
    expect(ui.options().length).toBe(0);
    await ui.type('Intro\n\n:');
    expect(ui.options().map(option => option.textContent)).toEqual([]);
    await ui.key(' ', { ctrlKey: true });
    await ui.type('Intro\n\n:::');
    expect(ui.options().length).toBeGreaterThan(3);
    expect(ui.area().getAttribute('aria-activedescendant')).toEndWith('-0');
    await ui.key('ArrowDown');
    await ui.key('ArrowUp');
    await ui.key('ArrowUp');
    expect(ui.options().at(-1)?.getAttribute('aria-selected')).toBe('true');
    await ui.key('ArrowDown');
    expect(ui.target.textContent).toContain('MDRS directive');
    await ui.key('Enter');
    expect(ui.options().length).toBe(0);
    expect(ui.state.value).toStartWith('Intro\n\n:::');
    expect(ui.state.value).toEndWith(':::');

    await ui.type(':::define\nname: "Ada"\n:::\n\nHi ${na');
    await ui.key(' ', { ctrlKey: true });
    expect(ui.options().some(option => option.textContent?.includes('name'))).toBe(true);
    await ui.key('Tab');
    expect(ui.state.value).toEndWith('${name');

    await ui.type('Intro\n\n:::');
    ui.options()[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await settle();
    expect(ui.options().length).toBe(0);

    await ui.type('Intro\n\n:::');
    await ui.key('x');
    expect(ui.options().length).toBeGreaterThan(0);
    await ui.key('Escape');
    expect(ui.options().length).toBe(0);
    await ui.key('x');
    ui.area().dispatchEvent(new FocusEvent('blur'));
    await settle();
});

test('explains the symbol under the cursor until escape', async () => {
    let blurred = 0;
    const ui = render({ onblur: () => blurred++ });
    const text = ':::define\nname: "Ada"\n:::\n\nHello ${name}';
    await ui.type(text, text.length - 3);
    await settle(350);
    const tip = () => ui.target.querySelector('.editor-info');
    expect(tip()?.textContent).toContain('Defined in :::define');
    await ui.key('Escape');
    expect(tip()).toBeNull();
    ui.area().scrollTop = 30;
    ui.area().dispatchEvent(new Event('scroll'));
    await ui.type(text, text.length - 3);
    ui.area().dispatchEvent(new FocusEvent('blur'));
    await settle(350);
    expect(blurred).toBe(1);
});

test('jumps to outline entries and problems', async () => {
    const ui = render();
    await ui.type('# Title\n\n## Part\n\n:::note\nunclosed');
    await settle(350);
    const open = async (label: string) => {
        ui.target.querySelector<HTMLElement>(`button[aria-label^="${label}"]`)!.click();
        await settle();
    };
    await open('Outline');
    const entries = [...document.querySelectorAll<HTMLElement>('[role="dialog"] li button')];
    expect(entries.map(entry => entry.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'Title 1',
        'Part 3',
        ':::note 5'
    ]);
    entries[1].click();
    await settle();
    expect(ui.area().selectionStart).toBe(9);
    await open('Problems');
    const problems = [...document.querySelectorAll<HTMLElement>('[role="dialog"] li button')];
    expect(problems[0].textContent).toContain('never closed');
    problems[0].click();
    await settle();

    await ui.type('plain');
    await settle(350);
    await open('Outline');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Headings and blocks');
});

test('renders the preview and shows render errors', async () => {
    let fail = false;
    const ui = render({
        value: '# Hi',
        render: async (source: string) => {
            if (fail) throw new Error('bad input');
            return `<h1>${source.slice(2)}</h1><pre><code class="language-js">let a = 1;</code></pre>`;
        }
    });
    const tab = (name: string) =>
        [...ui.target.querySelectorAll<HTMLElement>('[role="tab"]')].find(
            button => button.textContent?.trim().toLowerCase() === name
        )!;
    tab('preview').click();
    await settle(10);
    expect(ui.target.querySelector('h1')?.textContent).toBe('Hi');
    tab('edit').click();
    await settle();
    fail = true;
    tab('preview').click();
    await settle(10);
    expect(ui.target.textContent).toContain('bad input');
});

const fileInput = (root: ParentNode, accept: RegExp) =>
    [...root.querySelectorAll<HTMLInputElement>('input[type="file"]')].find(input =>
        accept.test(input.accept)
    )!;

function choose(input: HTMLInputElement, file: File | null) {
    Object.defineProperty(input, 'files', { configurable: true, value: file ? [file] : [] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

test('every toolbar button and block inserts its markup', async () => {
    const uploads: string[] = [];
    const imported: string[] = [];
    const ui = render({
        autosaveKey: 'draft',
        onImageUpload: async (file: File) => {
            uploads.push(file.name);
            return file.name === 'fail.png' ? null : `/a/${file.name}`;
        },
        onVideoUpload: async (file: File) => `/v/${file.name}`,
        onImport: (file: File) => imported.push(file.name)
    });
    await ui.type('word');
    ui.area().setSelectionRange(0, 4);
    const header = ui.target.querySelector('.editor-header')!;
    const plain = [...header.querySelectorAll<HTMLElement>('button[aria-label]')].filter(
        button =>
            !button.hasAttribute('aria-haspopup') &&
            !/^(Import|View options|Insert an MDRS block)/.test(button.getAttribute('aria-label')!)
    );
    expect(plain.length).toBeGreaterThan(15);
    for (const button of plain) {
        button.click();
        await settle();
    }
    expect(ui.state.value.length).toBeGreaterThan(40);

    const menus = [...header.querySelectorAll<HTMLElement>('button[aria-haspopup="menu"]')];
    expect(menus.length).toBe(2);
    for (const menu of menus) {
        const open = async () => {
            menu.click();
            await settle();
            return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
        };
        const count = (await open()).length;
        document.querySelector<HTMLElement>('[aria-label="Close menu"]')?.click();
        await settle();
        for (let index = 0; index < count; index++) {
            (await open())[index].click();
            await settle();
        }
    }
    const openBlocks = async () => {
        ui.target.querySelector<HTMLElement>('button[aria-label="Insert an MDRS block"]')!.click();
        await settle();
        return [...document.querySelectorAll<HTMLElement>('[role="dialog"] button')];
    };
    const count = (await openBlocks()).length;
    expect(count).toBeGreaterThan(10);
    document.querySelector<HTMLElement>('[aria-label="Close menu"]')!.click();
    await settle();
    for (let index = 0; index < count; index++) {
        (await openBlocks())[index].click();
        await settle();
    }
    expect(ui.state.value).toContain(':::define');
    expect(ui.state.value).toContain('verbatim');

    choose(fileInput(ui.target, /image/), new File(['x'], 'My Photo.png'));
    choose(fileInput(ui.target, /image/), new File(['x'], 'fail.png'));
    choose(fileInput(ui.target, /image/), null);
    choose(fileInput(ui.target, /video/), new File(['x'], 'clip.mp4'));
    ui.target
        .querySelector<HTMLElement>('button[aria-label="Import a Markdown or MDRS file"]')!
        .click();
    choose(fileInput(ui.target, /markdown|mdrs/), new File(['# x'], 'notes.mdrs'));
    choose(fileInput(ui.target, /markdown|mdrs/), null);
    await settle(10);
    expect(uploads).toEqual(['My Photo.png', 'fail.png']);
    expect(ui.state.value).toContain('![My photo](/a/My Photo.png');
    expect(ui.state.value).toContain('/v/clip.mp4');
    expect(imported).toEqual(['notes.mdrs']);

    await settle(550);
    expect(JSON.parse(localStorage.getItem('draft') ?? '{}').content).toBe(ui.state.value);
    const autosave = ui.target.querySelector<HTMLElement>('[aria-label^="Autosave"]')!;
    autosave.click();
    await settle();
    expect(autosave.getAttribute('aria-pressed')).toBe('false');
    ui.target.querySelector<HTMLElement>('button[aria-pressed]')!.click();
    await settle();
    for (const button of ui.target.querySelectorAll<HTMLElement>(
        '.editor-status-bar [role="presentation"]'
    )) {
        button.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    }
    await settle(200);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Autosave');
    [...ui.target.querySelectorAll<HTMLElement>('.editor-status-bar button')]
        .find(button => button.textContent?.includes('MDRS'))!
        .click();
    await settle();
    expect(document.activeElement).toBe(ui.area());
});

test('view options switch wrapping, line numbers and indentation, and keys edit lines', async () => {
    const ui = render();
    const options = async () => {
        ui.target.querySelector<HTMLElement>('[aria-label="View options"]')!.click();
        await settle();
        return document.querySelector<HTMLElement>('[role="dialog"]')!;
    };
    let panel = await options();
    const [wrap, numbers] = panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    for (const input of [numbers, wrap, numbers]) {
        input.click();
        await settle();
    }
    panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
    for (const button of panel.querySelectorAll<HTMLElement>('button')) {
        button.click();
        await settle();
    }
    expect(ui.target.querySelector('.editor-gutter-track')).not.toBeNull();

    await ui.type('- item');
    expect((await ui.key('Enter')).defaultPrevented).toBe(true);
    expect(ui.state.value).toBe('- item\n- ');
    await ui.key('Tab');
    expect(ui.state.value).toMatch(/\n- (\t| +)$/);
    await ui.type('plain');
    expect((await ui.key('Enter')).defaultPrevented).toBe(false);
    expect((await ui.key('Enter', { shiftKey: true })).defaultPrevented).toBe(false);
    document.querySelector<HTMLElement>('[aria-label="Close menu"]')?.click();
    await settle();
    ui.target.querySelector<HTMLElement>('[aria-label^="Problems"]')!.click();
    await settle();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('No problems');
    document.querySelector<HTMLElement>('[aria-label="Close menu"]')?.click();
    await ui.type(':::bogus\nx\n:::\n\n:::callout\nx\n:::');
    await settle(350);
    ui.target.querySelector<HTMLElement>('[aria-label^="Problems"]')!.click();
    await settle();
    expect(
        document.querySelector('[role="dialog"] .text-fg-warning, [role="dialog"] .text-fg-danger')
    ).not.toBeNull();
});
