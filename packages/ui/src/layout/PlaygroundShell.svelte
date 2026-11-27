<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import type { Snippet } from 'svelte';
    import { cn } from '../utils/cn';
    import { clampSplit } from './navigation';

    interface Props {
        header: Snippet;
        source: Snippet;
        output: Snippet;
        status?: Snippet;
        sourceLabel?: string;
        outputLabel?: string;
        storageKey?: string;
        class?: string;
    }

    let {
        header,
        source,
        output,
        status,
        sourceLabel = 'Source',
        outputLabel = 'Output',
        storageKey = 'playground:split',
        class: className = ''
    }: Props = $props();

    const STEP = 0.05;
    const id = $props.id();
    let split = $state(read());
    let view = $state<'source' | 'output'>('source');
    let columns = $state<HTMLElement | null>(null);
    let drag: { pointer: number; x: number; split: number; width: number } | undefined;

    function read() {
        try {
            return clampSplit(Number(localStorage.getItem(storageKey) ?? 0.5));
        } catch {
            return 0.5;
        }
    }

    function set(next: number) {
        split = clampSplit(next);
        try {
            localStorage.setItem(storageKey, String(split));
        } catch {
            return;
        }
    }

    function onKeydown(event: KeyboardEvent) {
        const moves: Record<string, number> = {
            ArrowLeft: split - STEP,
            ArrowRight: split + STEP,
            Home: 0,
            End: 1
        };
        if (!(event.key in moves)) return;
        event.preventDefault();
        set(moves[event.key]);
    }

    function onPointerDown(event: PointerEvent) {
        if (event.button !== 0 || !columns) return;
        event.preventDefault();
        const handle = event.currentTarget as HTMLElement;
        handle.setPointerCapture?.(event.pointerId);
        drag = {
            pointer: event.pointerId,
            x: event.clientX,
            split,
            width: columns.getBoundingClientRect().width
        };
    }

    function onPointerMove(event: PointerEvent) {
        if (!drag || event.pointerId !== drag.pointer || !drag.width) return;
        set(drag.split + (event.clientX - drag.x) / drag.width);
    }

    function onPointerEnd() {
        drag = undefined;
    }

    function onTabKeydown(event: KeyboardEvent) {
        const next: Record<string, 'source' | 'output'> = {
            ArrowLeft: view === 'source' ? 'output' : 'source',
            ArrowRight: view === 'source' ? 'output' : 'source',
            Home: 'source',
            End: 'output'
        };
        if (!(event.key in next)) return;
        event.preventDefault();
        view = next[event.key];
        document.getElementById(`${id}-${view}-tab`)?.focus();
    }

    const tab = (name: 'source' | 'output') =>
        cn(
            'flex-1 rounded-sm px-3 py-1 text-xs font-medium',
            view === name ? 'bg-accent-strong text-on-accent' : 'text-fg-secondary'
        );
</script>

<div class={cn('playground-shell flex h-dvh flex-col bg-canvas text-fg', className)}>
    <div class="flex min-h-12 shrink-0 items-center gap-3 border-b border-line-subtle px-3">
        {@render header()}
    </div>
    <div
        role="tablist"
        aria-label="Playground views"
        tabindex="-1"
        onkeydown={onTabKeydown}
        class="m-2 flex shrink-0 rounded-md border border-line-subtle p-0.5 md:hidden">
        <button
            type="button"
            role="tab"
            id="{id}-source-tab"
            aria-controls="{id}-source"
            aria-selected={view === 'source'}
            tabindex={view === 'source' ? 0 : -1}
            class={tab('source')}
            onclick={() => (view = 'source')}>{sourceLabel}</button>
        <button
            type="button"
            role="tab"
            id="{id}-output-tab"
            aria-controls="{id}-output"
            aria-selected={view === 'output'}
            tabindex={view === 'output' ? 0 : -1}
            class={tab('output')}
            onclick={() => (view = 'output')}>{outputLabel}</button>
    </div>
    <div
        bind:this={columns}
        class="playground-columns flex min-h-0 flex-1 md:grid"
        style:grid-template-columns="minmax(180px, {split}fr) 6px minmax(180px, {1 - split}fr)">
        <div
            id="{id}-source"
            role="tabpanel"
            aria-labelledby="{id}-source-tab"
            class={cn('min-h-0 min-w-0 flex-1 flex-col overflow-auto md:flex', view === 'source' ? 'flex' : 'hidden')}>
            {@render source()}
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
        <div
            role="separator"
            tabindex="0"
            aria-orientation="vertical"
            aria-label="Resize {sourceLabel} and {outputLabel}"
            aria-valuemin={20}
            aria-valuemax={80}
            aria-valuenow={Math.round(split * 100)}
            aria-valuetext="{Math.round(split * 100)}% {sourceLabel}, {100 - Math.round(split * 100)}% {outputLabel}"
            class="hidden cursor-col-resize bg-line-subtle transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none md:block"
            onkeydown={onKeydown}
            ondblclick={() => set(0.5)}
            onpointerdown={onPointerDown}
            onpointermove={onPointerMove}
            onpointerup={onPointerEnd}
            onpointercancel={onPointerEnd}>
        </div>
        <div
            id="{id}-output"
            role="tabpanel"
            aria-labelledby="{id}-output-tab"
            class={cn('min-h-0 min-w-0 flex-1 flex-col overflow-auto md:flex', view === 'output' ? 'flex' : 'hidden')}>
            {@render output()}
        </div>
    </div>
    {#if status}
        <div
            role="status"
            class="flex min-h-7 shrink-0 items-center gap-3 border-t border-line-subtle px-3 font-mono text-xxs text-fg-muted">
            {@render status()}
        </div>
    {/if}
</div>
