// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, mock, test } from 'bun:test';
import { flushSync, mount, tick, unmount } from 'svelte';
import { toastStore } from '../packages/ui/src/stores/toastStore.svelte.ts';

const row = { day: 'Mon', views: 12, helpful: 3, label: 'Mon', value: 12, color: 'red' };
const args = () => ({
    data: row,
    gradient: 'url(#g)',
    arcs: [{ startAngle: 0, endAngle: 1, padAngle: 0, data: row }]
});
type Props = Record<string, unknown> & { children?: (anchor: Node, read: () => unknown) => void };
const pass = (anchor: Node, props: Props) => {
    for (const key in props) {
        const value = props[key];
        if (key !== 'children' && typeof value === 'function') value(row, 0);
    }
    props.children?.(anchor, args);
};

mock.module('layerchart', () => ({
    Chart: pass,
    Svg: pass,
    Axis: pass,
    Spline: pass,
    Area: pass,
    Bars: pass,
    Pie: pass,
    Arc: pass,
    Highlight: pass,
    LinearGradient: pass,
    Tooltip: { Root: pass }
}));

const { default: MarkdownChart } = (await import('../packages/dom/src/MarkdownChart.svelte')) as {
    default: never;
};

const mounted: object[] = [];

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
});

const settle = async () => {
    for (let round = 0; round < 3; round++) {
        await tick();
        await new Promise(resolve => setTimeout(resolve, 0));
        flushSync();
    }
};

const rows = [
    { day: 'Mon', views: 12, helpful: 3 },
    { day: 'Tue', views: -4, helpful: 0 }
];

test('every chart type renders its tooltip and legend', async () => {
    const specs = [
        { type: 'bar', x: 'day', y: 'views', data: rows },
        { type: 'area', x: 'day', y: 'views', data: rows },
        { type: 'line', x: 'day', y: ['views', 'helpful'], data: rows },
        { type: 'line', data: [{ day: 'Mon', views: 0 }] },
        { type: 'pie', x: 'day', y: 'views', data: rows },
        { type: 'donut', data: [{ day: 'Mon' }, {}] },
        {
            type: 'line',
            title: 'Views',
            subtitle: 'This week',
            x: 'day',
            series: [{ key: 'views', label: 'Views', color: '#123456' }, { key: 'helpful' }],
            data: rows
        },
        { title: 'Empty', data: [] }
    ];
    for (const spec of specs) {
        mounted.push(mount(MarkdownChart, { target: document.body, props: { spec } as never }));
        await settle();
    }
    const tooltips = document.querySelectorAll('.mdrs-chart-tooltip');
    expect(tooltips.length).toBeGreaterThanOrEqual(specs.filter(spec => spec.data.length).length);
    expect(document.body.textContent).toContain('helpful:');
    expect(document.body.textContent).toContain('This week');
    expect(document.body.textContent).toContain('No chart data provided');
});

test('copies the chart spec and reports a failed copy', async () => {
    let copied = '';
    let fail = false;
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
            writeText: async (text: string) => {
                if (fail) throw new Error('denied');
                copied = text;
            }
        }
    });
    const spec = { type: 'bar', x: 'day', y: 'views', data: rows };
    mounted.push(mount(MarkdownChart, { target: document.body, props: { spec } as never }));
    await settle();
    const copy = async () => {
        document.querySelector<HTMLElement>('button[aria-label="Chart options"]')!.click();
        await settle();
        document.querySelector<HTMLElement>('[role="menuitem"]')!.click();
        await settle();
    };
    await copy();
    expect(JSON.parse(copied)).toEqual(spec);
    expect(toastStore.message).toBe('Chart spec copied');
    fail = true;
    await copy();
    expect(toastStore.message).toBe('Failed to copy chart spec');
});
