// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { analyze, complete, documentSymbols, hover } from '@mdrs/language-server';
import { offsetAt, type CursorPosition } from './textEdits';

type TextEdit = Extract<
    NonNullable<ReturnType<typeof complete>[number]['textEdit']>,
    { range: unknown }
>;

export interface Suggestion {
    label: string;
    detail: string;
    documentation: string;
    from: number;
    to: number;
    text: string;
    cursor: number;
}

export interface OutlineEntry {
    name: string;
    depth: number;
    line: number;
    column: number;
}

function markupText(markup: unknown): string {
    if (typeof markup === 'string') return markup;
    return (markup as { value?: string } | undefined)?.value ?? '';
}

function lspPosition(position: CursorPosition) {
    return { line: position.line - 1, character: position.column - 1 };
}

export function expandSnippet(snippet: string): { text: string; cursor: number } {
    let text = '';
    let last = 0;
    let first: number | undefined;
    let final: number | undefined;
    for (const match of snippet.matchAll(/\$\{(\d+):([^}]*)\}|\$(\d+)/g)) {
        text += snippet.slice(last, match.index);
        if ((match[1] ?? match[3]) === '0') final ??= text.length;
        else first ??= text.length;
        text += match[2] ?? '';
        last = match.index + match[0].length;
    }
    text += snippet.slice(last);
    return { text, cursor: first ?? final ?? text.length };
}

export function suggestionsAt(value: string, position: CursorPosition): Suggestion[] {
    const offset = offsetAt(value, position);
    return complete(analyze(value), lspPosition(position)).map(item => {
        const edit = item.textEdit as TextEdit;
        const from = offsetAt(value, {
            line: edit.range.start.line + 1,
            column: edit.range.start.character + 1
        });
        const { text, cursor } =
            item.insertTextFormat === 2
                ? expandSnippet(edit.newText)
                : { text: edit.newText, cursor: edit.newText.length };
        return {
            label: item.label,
            detail: item.detail ?? '',
            documentation: markupText(item.documentation),
            from,
            to: offset,
            text,
            cursor: from + cursor
        };
    });
}

export function hoverAt(value: string, position: CursorPosition): string {
    const result = hover(analyze(value), lspPosition(position));
    return result ? markupText(result.contents) : '';
}

export function outline(value: string): OutlineEntry[] {
    const entries: OutlineEntry[] = [];
    const walk = (symbols: ReturnType<typeof documentSymbols>, depth: number) => {
        for (const symbol of symbols) {
            entries.push({
                name: symbol.name,
                depth,
                line: symbol.selectionRange.start.line + 1,
                column: symbol.selectionRange.start.character + 1
            });
            walk(symbol.children ?? [], depth + 1);
        }
    };
    walk(documentSymbols(analyze(value)), 0);
    return entries;
}
