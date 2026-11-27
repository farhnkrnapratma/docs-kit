// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import hljs from 'highlight.js';
import { mdrsLanguage } from '@mdrs/language-server/highlight';
import { mermaidLanguage } from '@mdrs/dom/mermaidHighlight.ts';

hljs.registerLanguage('mdrs', mdrsLanguage);
hljs.registerLanguage('mermaid', mermaidLanguage);

function escapeHtml(code: string): string {
    return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightCode(code: string, language: string): string {
    return hljs.getLanguage(language)
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : escapeHtml(code);
}

export function highlightMarkdown(code: string): string {
    return highlightCode(code, 'mdrs');
}
