// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { beforeEach, describe, expect, mock, test } from 'bun:test';

const renders: { id: string; code: string }[] = [];
const initializations: Record<string, any>[] = [];
let renderFails = false;
let initializeFails = false;
let pelersMode: 'ok' | 'unsupported' | 'syntax' | 'unsafe' = 'ok';
let mermaidSvg: string | null = null;
const pelersRenders: { code: string; idPrefix?: string }[] = [];

mock.module('@farhnkrnapratma/pelers/lazy', () => ({
    renderAsync: async (code: string, options: { idPrefix?: string }) => {
        pelersRenders.push({ code, idPrefix: options.idPrefix });
        if (pelersMode === 'unsupported') {
            throw Object.assign(new Error('Diagram type "zenuml" is not supported yet.'), {
                code: 'unsupported-diagram'
            });
        }
        if (pelersMode === 'syntax') {
            throw Object.assign(new Error('Parse error on line 2'), { code: 'syntax' });
        }
        if (pelersMode === 'unsafe') return { svg: '<svg><g onload="alert(1)"></g></svg>' };
        return { svg: `<svg class="pelers" data-prefix="${options.idPrefix}"><g/></svg>` };
    }
}));

mock.module('mermaid', () => ({
    default: {
        initialize: (config: Record<string, any>) => {
            if (initializeFails) throw new Error('init failed');
            initializations.push(config);
        },
        render: async (id: string, code: string) => {
            renders.push({ id, code });
            if (renderFails) throw new Error('bad diagram');
            return { svg: mermaidSvg ?? `<svg data-id="${id}"><g/></svg>` };
        }
    }
}));

const { enhanceMermaidBlocks, getMermaid, initMermaidThemeObserver, loadPelers } = await import(
    '../packages/dom/src/mermaid.ts'
);

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const fire = (node: Element | Window, type: string) =>
    node.dispatchEvent(new window.Event(type, { bubbles: true }));
let written: string[] = [];
let clipboardFails = false;

function block(source: string | null, parts: { source?: boolean; display?: boolean } = {}) {
    const root = document.createElement('div');
    root.className = 'mdrs-mermaid';
    if (parts.source !== false) {
        const code = document.createElement('div');
        code.className = 'mdrs-mermaid-source';
        if (source !== null) code.setAttribute('data-mdrs-source', encodeURIComponent(source));
        root.appendChild(code);
    }
    if (parts.display !== false) {
        const display = document.createElement('div');
        display.className = 'mdrs-mermaid-display';
        root.appendChild(display);
    }
    document.body.appendChild(root);
    return root;
}

beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
    renders.length = 0;
    initializations.length = 0;
    renderFails = false;
    initializeFails = false;
    pelersMode = 'unsupported';
    mermaidSvg = null;
    pelersRenders.length = 0;
    clipboardFails = false;
    written = [];
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
            writeText: async (text: string) => {
                if (clipboardFails) throw new Error('denied');
                written.push(text);
            }
        }
    });
});

describe('getMermaid', () => {
    test('initializes the shared instance with a theme per call', async () => {
        const dark = await getMermaid();
        await getMermaid(false);
        expect(typeof dark.render).toBe('function');
        expect(initializations.map(config => config.themeVariables.darkMode)).toEqual([
            true,
            false
        ]);
        expect(initializations[0].securityLevel).toBe('strict');
        expect(initializations[0].themeVariables.git0).toBe(
            initializations[0].themeVariables.primaryColor
        );
    });
});

describe('enhanceMermaidBlocks with pelers', () => {
    test('draws diagrams with pelers once, whatever the theme', async () => {
        pelersMode = 'ok';
        const target = block('flowchart LR\n A-->B');
        await enhanceMermaidBlocks();
        expect(pelersRenders.length).toBe(1);
        expect(pelersRenders[0].code).toBe('flowchart LR\n A-->B');
        expect(pelersRenders[0].idPrefix).toStartWith('mdrs-mermaid-svg-');
        expect(renders).toEqual([]);
        expect(target.getAttribute('data-mdrs-renderer')).toBe('pelers');
        expect(target.getAttribute('data-mdrs-enhanced')).toBe('true');
        expect(target.querySelector('svg')?.classList.contains('mdrs-mermaid-svg')).toBe(true);
        expect(target.querySelectorAll('.mdrs-mermaid-toolbar').length).toBe(1);
        await enhanceMermaidBlocks(document.body, true);
        expect(pelersRenders.length).toBe(1);
        expect(await loadPelers()).toBe(await loadPelers());
    });

    test('blocks unsafe svg from either renderer instead of inserting it', async () => {
        pelersMode = 'unsafe';
        const fromPelers = block('flowchart LR\n A-->B');
        await enhanceMermaidBlocks();
        expect(renders).toEqual([]);
        expect(fromPelers.querySelector('svg')).toBeNull();
        expect(fromPelers.querySelector('.mdrs-mermaid-error')?.textContent).toBe(
            'Failed to render Mermaid diagram: the diagram was blocked because its SVG could run script.'
        );
        fromPelers.remove();
        pelersMode = 'unsupported';
        mermaidSvg = '<svg><a href="javascript:alert(1)">x</a></svg>';
        const fromMermaid = block('zenuml\n A->B: hi');
        await enhanceMermaidBlocks();
        expect(renders.length).toBe(1);
        expect(fromMermaid.querySelector('a')).toBeNull();
        expect(fromMermaid.querySelector('.mdrs-mermaid-error')?.textContent).toContain('blocked');
    });

    test('shows pelers syntax errors without trying mermaid', async () => {
        pelersMode = 'syntax';
        const target = block('flowchart LR\n A-->');
        await enhanceMermaidBlocks();
        expect(renders).toEqual([]);
        expect(target.querySelector('.mdrs-mermaid-error')?.textContent).toBe(
            'Failed to render Mermaid diagram: Parse error on line 2'
        );
    });

    test('keeps diagrams the server already drew and adds the toolbar', async () => {
        const drawn = block('flowchart LR\n A-->B');
        drawn.classList.add('mdrs-mermaid--static');
        drawn.querySelector('.mdrs-mermaid-display')!.innerHTML = '<svg class="pelers"><g/></svg>';
        const empty = block('flowchart LR\n A-->B');
        empty.classList.add('mdrs-mermaid--static');
        await enhanceMermaidBlocks();
        await enhanceMermaidBlocks();
        expect(pelersRenders).toEqual([]);
        expect(renders).toEqual([]);
        expect(drawn.getAttribute('data-mdrs-renderer')).toBe('pelers');
        expect(drawn.querySelector('svg')?.classList.contains('mdrs-mermaid-svg')).toBe(true);
        expect(drawn.querySelectorAll('.mdrs-mermaid-toolbar').length).toBe(1);
        expect(empty.querySelector('.mdrs-mermaid-toolbar')).toBeNull();
        fire(drawn.querySelectorAll('.mdrs-menu-item')[0], 'click');
        await flush();
        expect(written[0]).toStartWith('<svg class="pelers mdrs-mermaid-svg">');
    });
});

describe('enhanceMermaidBlocks with the mermaid fallback', () => {
    test('renders diagrams, skips fresh ones and re-renders on theme change', async () => {
        const first = block('graph TD\n A-->B');
        await enhanceMermaidBlocks();
        expect(renders.length).toBe(1);
        expect(first.getAttribute('data-mdrs-theme')).toBe('light');
        expect(first.querySelector('svg')?.classList.contains('mdrs-mermaid-svg')).toBe(true);
        expect(first.querySelectorAll('.mdrs-mermaid-toolbar').length).toBe(1);

        await enhanceMermaidBlocks(document.body, false);
        expect(renders.length).toBe(1);

        await enhanceMermaidBlocks(document.body, true);
        expect(renders.length).toBe(2);
        expect(first.getAttribute('data-mdrs-theme')).toBe('dark');
        expect(first.querySelectorAll('.mdrs-mermaid-toolbar').length).toBe(1);

        await enhanceMermaidBlocks(document.body, 'light');
        expect(first.getAttribute('data-mdrs-theme')).toBe('light');
        await enhanceMermaidBlocks(document.body, 'dark');
        expect(first.getAttribute('data-mdrs-theme')).toBe('dark');
        document.documentElement.classList.add('dark');
        first.removeAttribute('data-mdrs-theme');
        await enhanceMermaidBlocks();
        expect(first.getAttribute('data-mdrs-theme')).toBe('dark');
    });

    test('ignores incomplete blocks and empty sources', async () => {
        block('graph TD\n A-->B', { display: false });
        block('graph TD\n A-->B', { source: false });
        block('   ');
        block(null);
        await enhanceMermaidBlocks();
        expect(renders).toEqual([]);
        await enhanceMermaidBlocks(document.createElement('div'));
        expect(renders).toEqual([]);
    });

    test('shows a failed mermaid start inline', async () => {
        const failing = block('zenuml\n A->B: hi');
        initializeFails = true;
        await enhanceMermaidBlocks();
        expect(failing.querySelector('.mdrs-mermaid-error')?.textContent).toBe(
            'Failed to render Mermaid diagram: init failed'
        );
    });

    test('shows render failures inline', async () => {
        const failing = block('not a diagram');
        renderFails = true;
        await enhanceMermaidBlocks();
        expect(failing.querySelector('.mdrs-mermaid-error')?.textContent).toBe(
            'Failed to render Mermaid diagram: bad diagram'
        );
    });

    test('re-renders when the site theme changes', async () => {
        const watched = block('graph TD\n A-->B');
        initMermaidThemeObserver();
        initMermaidThemeObserver();
        await enhanceMermaidBlocks();
        const before = renders.length;
        document.documentElement.classList.add('dark');
        await flush();
        await flush();
        expect(renders.length).toBeGreaterThan(before);
        expect(watched.getAttribute('data-mdrs-theme')).toBe('dark');
    });

    test('reports failures while re-rendering after a theme change', async () => {
        block('graph TD\n A-->B');
        await enhanceMermaidBlocks();
        const original = console.error;
        const errors: unknown[] = [];
        console.error = (...args: unknown[]) => void errors.push(args);
        const query = document.body.querySelectorAll;
        document.body.querySelectorAll = () => {
            throw new Error('boom');
        };
        document.documentElement.classList.toggle('dark');
        await flush();
        await flush();
        document.body.querySelectorAll = query;
        console.error = original;
        expect(errors.length).toBe(1);
    });

    test('defaults to the dark theme without a document', async () => {
        const detached = document.createElement('div');
        const saved = globalThis.document;
        (globalThis as any).document = undefined;
        try {
            await enhanceMermaidBlocks(detached);
        } finally {
            (globalThis as any).document = saved;
        }
        expect(renders).toEqual([]);
    });

    test('copies the svg and the source from the toolbar', async () => {
        const target = block('graph TD\n A-->B');
        await enhanceMermaidBlocks();
        const toolbar = target.querySelector('.mdrs-mermaid-toolbar')!;
        const menu = toolbar.querySelector('.mdrs-menu')!;
        const [menuButton] = toolbar.querySelectorAll('button');
        const [copySvg, copyCode] = toolbar.querySelectorAll('.mdrs-menu-item');

        fire(menuButton, 'click');
        expect(menu.classList.contains('mdrs-is-open')).toBe(true);
        fire(toolbar, 'click');
        expect(menu.classList.contains('mdrs-is-open')).toBe(true);
        fire(document.body, 'click');
        expect(menu.classList.contains('mdrs-is-open')).toBe(false);

        fire(menuButton, 'click');
        fire(copySvg, 'click');
        fire(copyCode, 'click');
        await flush();
        expect(written[0]).toContain('<svg');
        expect(written[1]).toBe('graph TD\n A-->B');
        expect(copySvg.textContent).toBe('Copied SVG!');
        expect(copyCode.textContent).toBe('Copied Code!');
        await new Promise(resolve => setTimeout(resolve, 1250));
        expect(copySvg.textContent).toBe('Copy SVG');
        expect(copyCode.textContent).toBe('Copy code');
        expect(menu.classList.contains('mdrs-is-open')).toBe(false);

        clipboardFails = true;
        fire(copySvg, 'click');
        fire(copyCode, 'click');
        await flush();
        expect(copySvg.textContent).toBe('Copy SVG');

        target.remove();
        fire(window, 'click');
    });
});
