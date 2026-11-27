// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { afterEach, expect, test } from 'bun:test';
import { flushSync, mount, unmount } from 'svelte';

const load = async (path: string) => ((await import(path)) as { default: never }).default;
const Checkbox = await load('../packages/ui/src/components/Checkbox.svelte');
const FieldMessage = await load('../packages/ui/src/components/FieldMessage.svelte');
const mounted: object[] = [];

afterEach(() => {
    for (const instance of mounted.splice(0)) void unmount(instance);
    document.body.innerHTML = '';
});

function render(component: never, props: Record<string, unknown>) {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(component, { target, props: props as never }));
    flushSync();
    return target;
}

test('checkboxes show a description under the label', () => {
    const host = render(Checkbox, { label: 'Wrap', description: 'Soft-wrap long lines' });
    expect(host.textContent).toContain('Soft-wrap long lines');
});

test('field messages pick an icon for each tone', () => {
    const icons = new Set<string>();
    for (const variant of ['error', 'success', 'warning', 'info']) {
        const host = render(FieldMessage, { message: `${variant} text`, variant });
        expect(host.textContent).toContain(`${variant} text`);
        icons.add(host.querySelector('svg')?.getAttribute('class') ?? '');
    }
    expect(icons.size).toBe(4);
});
