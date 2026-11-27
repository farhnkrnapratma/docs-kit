// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { describe, expect, test } from 'bun:test';
import { expandSnippet, hoverAt, outline, suggestionsAt } from '../packages/editor/src/language.ts';

const doc = ':::define\nname: "Ada"\n:::\n\n# Title\n\nHello ${na';

describe('expandSnippet', () => {
    test('drops tab stops, keeps placeholders and puts the cursor at the first stop', () => {
        expect(expandSnippet('if $1')).toEqual({ text: 'if ', cursor: 3 });
        expect(expandSnippet('a ${1:Title} $0 b')).toEqual({ text: 'a Title  b', cursor: 2 });
        expect(expandSnippet('note\n$0\n:::')).toEqual({ text: 'note\n\n:::', cursor: 5 });
        expect(expandSnippet('plain')).toEqual({ text: 'plain', cursor: 5 });
    });
});

describe('suggestionsAt', () => {
    test('replaces the typed word with a variable and expands snippets', () => {
        const items = suggestionsAt(doc, { line: 7, column: 11 });
        const name = items.find(item => item.label === 'name');
        expect(name).toMatchObject({ text: 'name', detail: '"Ada"' });
        expect(doc.slice(name!.from, name!.to)).toBe('na');
        const keyword = items.find(item => item.label === 'if');
        expect(keyword?.text).toBe('if ');
        expect(keyword?.documentation).toContain('inline conditional');
        expect(keyword?.cursor).toBe(keyword!.from + 3);
    });

    test('offers nothing where the language server has nothing to add', () => {
        expect(suggestionsAt('plain text', { line: 1, column: 6 })).toEqual([]);
    });
});

describe('hoverAt and outline', () => {
    test('explains the symbol under the cursor', () => {
        const text = ':::define\nname: "Ada"\n:::\n\nHello ${name}';
        expect(hoverAt(text, { line: 5, column: 10 })).toContain('Defined in :::define');
        expect(hoverAt(text, { line: 5, column: 2 })).toBe('');
    });

    test('lists headings and directives with their depth', () => {
        expect(outline('# A\n\n## B\n\n:::note\nx\n:::\n')).toEqual([
            { name: 'A', depth: 0, line: 1, column: 1 },
            { name: 'B', depth: 1, line: 3, column: 1 },
            { name: ':::note', depth: 2, line: 5, column: 1 }
        ]);
    });
});

describe('asset alt text', async () => {
    const { assetAltText, pluralize } = await import('../packages/editor/src/text.ts');
    test('keeps acronyms, lowers other words and falls back when empty', () => {
        expect(assetAltText('photos/NASA moon_shot.PNG')).toBe('NASA moon shot');
        expect(assetAltText('---.mp4', 'Video')).toBe('Video');
        expect(assetAltText('Café-Ünïcode.jpg')).toBe('Cafe unicode');
        expect(pluralize(1, 'error')).toBe('1 error');
        expect(pluralize(2, 'entry', 'entries')).toBe('2 entries');
    });
});
