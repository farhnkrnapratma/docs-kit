// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, describe, expect, test } from 'bun:test';
import { flushSync, mount, tick, unmount } from 'svelte';
import { highlightCode } from '../packages/editor/src/highlight.ts';

const CodeEditor = (
    (await import('../packages/editor/src/CodeEditor.svelte')) as { default: never }
).default;
const mounted: object[] = [];

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
});

describe('highlightCode', () => {
    test('highlights Mermaid diagrams, keywords, arrows, strings and comments', () => {
        const html = highlightCode(
            '%%{init: {"theme": "dark"}}%%\nsankey-beta\nflowchart LR\n  %% a note\n  box["Box"] -->|go| B\n  B -.-> C\n  subgraph S\n  end',
            'mermaid'
        );
        expect(html).toContain('<span class="hljs-meta">%%{init');
        expect(html).toContain('<span class="hljs-built_in">sankey-beta</span>');
        expect(html).toContain('<span class="hljs-built_in">flowchart</span>');
        expect(html).toContain('<span class="hljs-literal">LR</span>');
        expect(html).toContain('<span class="hljs-comment">%% a note</span>');
        expect(html).toContain('<span class="hljs-string">&quot;Box&quot;</span>');
        expect(html).toContain('<span class="hljs-operator">--&gt;|go|</span>');
        expect(html).toContain('<span class="hljs-operator">-.-&gt;</span>');
        expect(html).toContain('<span class="hljs-keyword">subgraph</span>');
        expect(html).not.toContain('b<span class="hljs-operator">');
    });

    test('escapes languages it does not know and highlights known ones', () => {
        expect(highlightCode('<a & b>', 'nope')).toBe('&lt;a &amp; b&gt;');
        expect(highlightCode('<p>x</p>', 'xml')).toContain('hljs-tag');
        expect(highlightCode(':::note\nx\n:::', 'mdrs')).toContain('<span');
    });
});

describe('CodeEditor', () => {
    function render(props: Record<string, unknown>) {
        const target = document.createElement('div');
        document.body.append(target);
        mounted.push(mount(CodeEditor, { target, props: props as never }));
        flushSync();
        return {
            target,
            area: target.querySelector('textarea')!,
            lines: () => target.querySelectorAll('pre code > div').length
        };
    }

    test('shows highlighted lines with line numbers and indents with Tab', async () => {
        const ui = render({
            value: 'flowchart LR\n  A --> B\n',
            language: 'mermaid',
            label: 'Mermaid'
        });
        expect(ui.area.getAttribute('aria-label')).toBe('Mermaid');
        expect(ui.lines()).toBe(3);
        expect(ui.target.querySelector('.editor-gutter-track')?.textContent).toContain('3');
        ui.area.setSelectionRange(0, 0);
        const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        ui.area.dispatchEvent(tab);
        flushSync();
        await tick();
        expect(tab.defaultPrevented).toBe(true);
        expect(ui.area.value.startsWith('  flowchart')).toBe(true);
        expect(ui.area.selectionStart).toBe(2);
        const shiftTab = new KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            bubbles: true,
            cancelable: true
        });
        ui.area.dispatchEvent(shiftTab);
        expect(shiftTab.defaultPrevented).toBe(false);
        ui.area.scrollTop = 40;
        ui.area.dispatchEvent(new Event('scroll'));
        expect(ui.target.querySelector('pre')!.scrollTop).toBe(40);
        ui.area.value = 'graph TD';
        ui.area.dispatchEvent(new Event('input', { bubbles: true }));
        flushSync();
        expect(ui.lines()).toBe(1);
    });

    test('read-only, wrapped editors keep their text and hide the gutter', () => {
        const ui = render({
            value: '<svg></svg>',
            language: 'xml',
            label: 'SVG',
            readonly: true,
            wrap: true,
            class: 'extra'
        });
        expect(ui.area.readOnly).toBe(true);
        expect(ui.target.querySelector('.editor-gutter-track')).toBeNull();
        expect(ui.area.className).toContain('whitespace-pre-wrap');
        const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        ui.area.dispatchEvent(tab);
        expect(tab.defaultPrevented).toBe(false);
        expect(render({ language: 'css', label: 'CSS', lineNumbers: false }).lines()).toBe(1);
    });
});
