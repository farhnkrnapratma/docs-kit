// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import type { HLJSApi, Language } from 'highlight.js';

const DIAGRAMS = [
    'flowchart',
    'graph',
    'sequenceDiagram',
    'classDiagram',
    'classDiagram-v2',
    'stateDiagram',
    'stateDiagram-v2',
    'erDiagram',
    'gantt',
    'pie',
    'journey',
    'gitGraph',
    'mindmap',
    'timeline',
    'quadrantChart',
    'requirementDiagram',
    'C4Context',
    'C4Container',
    'C4Component',
    'C4Dynamic',
    'C4Deployment',
    'sankey-beta',
    'xychart-beta',
    'block-beta',
    'packet-beta',
    'kanban',
    'architecture-beta',
    'radar-beta',
    'treemap-beta',
    'info'
];

const KEYWORDS = [
    'subgraph',
    'end',
    'direction',
    'participant',
    'actor',
    'note',
    'loop',
    'alt',
    'else',
    'opt',
    'par',
    'and',
    'critical',
    'break',
    'rect',
    'activate',
    'deactivate',
    'autonumber',
    'class',
    'state',
    'section',
    'title',
    'accTitle',
    'accDescr',
    'click',
    'href',
    'call',
    'style',
    'classDef',
    'linkStyle',
    'dateFormat',
    'axisFormat',
    'excludes',
    'commit',
    'branch',
    'checkout',
    'merge',
    'over',
    'left',
    'right',
    'of'
];

export function mermaidLanguage(hljs: HLJSApi): Language {
    return {
        name: 'Mermaid',
        aliases: ['mmd'],
        case_insensitive: false,
        keywords: {
            $pattern: /[\w-]+/,
            built_in: DIAGRAMS,
            keyword: KEYWORDS,
            literal: ['TB', 'TD', 'BT', 'RL', 'LR']
        },
        contains: [
            { className: 'meta', begin: /%%\{/, end: /\}%%/ },
            hljs.COMMENT(/%%/, /$/),
            { className: 'string', begin: /"/, end: /"/ },
            { className: 'operator', begin: /<?[-=.~]{2,}[>ox)]?(?:\|[^|\n]*\|)?/ },
            hljs.NUMBER_MODE
        ]
    };
}
