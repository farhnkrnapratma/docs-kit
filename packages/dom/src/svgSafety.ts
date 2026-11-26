// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

const PELERS_TAGS = [
    'svg',
    'g',
    'text',
    'tspan',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'title',
    'desc',
    'a',
    'image',
    'defs',
    'marker',
    'lineargradient',
    'stop',
    'clippath'
];

const MERMAID_TAGS = [
    ...PELERS_TAGS,
    'style',
    'foreignobject',
    'div',
    'span',
    'p',
    'br',
    'b',
    'i',
    'em',
    'strong',
    'use',
    'pattern',
    'symbol',
    'filter',
    'fegaussianblur',
    'feoffset',
    'feflood',
    'fecomposite',
    'femerge',
    'femergenode',
    'radialgradient',
    'mask'
];

const UNSAFE_SCHEMES = ['javascript:', 'vbscript:', 'data:text', 'data:image/svg'];
const UNSAFE_CSS = ['javascript:', 'expression(', '@import', 'behavior:', '-moz-binding'];

export type SvgSource = 'pelers' | 'mermaid';

function decodeEntities(text: string) {
    return text
        .replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, code: string) => {
            const value =
                code[0].toLowerCase() === 'x' ? Number.parseInt(code.slice(1), 16) : Number(code);
            return Number.isFinite(value) && value <= 0x10ffff ? String.fromCodePoint(value) : '';
        })
        .replace(/&colon;/gi, ':')
        .toLowerCase();
}

function hasEventHandler(tag: string) {
    return /(?:^|[\s"'/])on[a-z]+\s*=/.test(tag);
}

function hasUnsafeScheme(tag: string) {
    const compact = tag.replace(/[\s\p{Cc}]/gu, '');
    return UNSAFE_SCHEMES.some(scheme => compact.includes(scheme));
}

function hasUnsafeCss(css: string) {
    const compact = decodeEntities(css).replace(/[\s\p{Cc}]/gu, '');
    return compact.includes('</') || UNSAFE_CSS.some(bad => compact.includes(bad));
}

export function isSafeSvg(svg: string, source: SvgSource = 'pelers') {
    const allowed = source === 'pelers' ? PELERS_TAGS : MERMAID_TAGS;
    let rest = svg;
    for (let open = rest.indexOf('<'); open !== -1; open = rest.indexOf('<')) {
        const close = rest.indexOf('>', open);
        if (close === -1) return false;
        const tag = decodeEntities(rest.slice(open + 1, close));
        const name = tag.replace(/^\//, '').split(/[\s/]/, 1)[0];
        if (!allowed.includes(name) || hasEventHandler(tag) || hasUnsafeScheme(tag)) return false;
        rest = rest.slice(close + 1);
        if (name === 'style' && !tag.startsWith('/')) {
            const end = rest.toLowerCase().indexOf('</style');
            if (end === -1 || hasUnsafeCss(rest.slice(0, end))) return false;
            rest = rest.slice(end);
        }
    }
    return true;
}
