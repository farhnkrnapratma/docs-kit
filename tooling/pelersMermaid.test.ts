// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { expect, test } from 'bun:test';

const { enhanceMermaidBlocks } = await import('../packages/dom/src/mermaid.ts');

test('draws a placeholder with the real pelers WebAssembly build', async () => {
    const block = document.createElement('div');
    block.className = 'mdrs-mermaid';
    block.innerHTML = `<div class="mdrs-mermaid-display"></div><div class="mdrs-mermaid-source" hidden data-mdrs-source="${encodeURIComponent('flowchart LR\n  A[Start] --> B[Done]')}"></div>`;
    document.body.appendChild(block);
    await enhanceMermaidBlocks(document.body, false);
    const svg = block.querySelector('.mdrs-mermaid-display svg');
    expect(svg?.getAttribute('class')).toContain('pelers-flowchart');
    expect(svg?.textContent).toContain('Start');
    expect(block.getAttribute('data-mdrs-renderer')).toBe('pelers');
});
