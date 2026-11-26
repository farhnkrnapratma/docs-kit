// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { describe, expect, test } from 'bun:test';
import { isSafeSvg } from '../packages/dom/src/svgSafety.ts';

describe('isSafeSvg', () => {
    test('accepts pelers output and text that only looks like script', () => {
        expect(
            isSafeSvg(
                '<svg class="pelers"><g><text>&lt;script&gt; onclick=x javascript:</text></g><a href="https://x"><title>t</title></a></svg>'
            )
        ).toBe(true);
        expect(isSafeSvg('<svg><g data-x="&#;&#xZZ;&#x110000;" font="one onward"></g></svg>')).toBe(
            true
        );
    });

    test.each([
        '<svg><script>alert(1)</script></svg>',
        '<svg><foreignObject></foreignObject></svg>',
        '<svg><g onclick="x"></g></svg>',
        "<svg><g\tONLOAD = 'x'></g></svg>",
        '<svg><g x="1"/onload=x></g></svg>',
        '<svg><a href="&#106;ava&#x73;cript&colon;x">y</a></svg>',
        '<svg><a href=" java\tscript:x">y</a></svg>',
        '<svg><image href="data:image/svg+xml;base64,x"/></svg>',
        '<svg><g'
    ])('rejects %s from pelers', svg => {
        expect(isSafeSvg(svg)).toBe(false);
    });

    test('allows the extra markup mermaid uses, with the same rules', () => {
        const label =
            '<foreignObject><div><span class="nodeLabel"><p>Hi</p></span></div></foreignObject>';
        expect(isSafeSvg(`<svg><style>.a{fill:red}</style>${label}</svg>`, 'mermaid')).toBe(true);
        expect(isSafeSvg(`<svg>${label}</svg>`, 'pelers')).toBe(false);
        for (const svg of [
            '<svg><style>@import url(x)</style></svg>',
            '<svg><style>.a{background:url(java\nscript:x)}</style></svg>',
            '<svg><style>.a{}</style><script>x</script></svg>',
            '<svg><style>.a{}</svg>',
            '<svg><div onmouseover="x"></div></svg>',
            '<svg><iframe></iframe></svg>'
        ]) {
            expect(isSafeSvg(svg, 'mermaid')).toBe(false);
        }
    });
});
