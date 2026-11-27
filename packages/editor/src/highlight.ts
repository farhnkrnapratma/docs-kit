// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import hljs from 'highlight.js';
import { mdrsLanguage } from '@mdrs/language-server/highlight';

hljs.registerLanguage('mdrs', mdrsLanguage);

export function highlightMarkdown(code: string): string {
    return hljs.highlight(code, { language: 'mdrs' }).value;
}
