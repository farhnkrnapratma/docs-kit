<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import { cn } from '@farhnkrnapratma/docs-ui/utils/cn.ts';
    import type { Suggestion } from './language';

    interface Props {
        id: string;
        suggestions: Suggestion[];
        selected: number;
        info: string;
        style: string;
        onaccept: (suggestion: Suggestion) => void;
    }

    let { id, suggestions, selected, info, style, onaccept }: Props = $props();
</script>
{#if suggestions.length}
    <div
        class="editor-assist absolute z-30 flex max-h-64 w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md popover-surface font-sans text-xs"
        {style}>
        <div
            id="{id}-list"
            role="listbox"
            aria-label="Suggestions"
            class="flex flex-col overflow-y-auto py-1">
            {#each suggestions as suggestion, index (index)}
                <div
                    id="{id}-{index}"
                    role="option"
                    tabindex="-1"
                    aria-selected={index === selected}
                    onmousedown={event => {
                        event.preventDefault();
                        onaccept(suggestion);
                    }}
                    class={cn(
                        'flex cursor-pointer items-baseline justify-between gap-3 px-3 py-1',
                        index === selected && 'bg-accent/10 text-fg-accent'
                    )}>
                    <span class="truncate font-mono">{suggestion.label}</span>
                    <span class="shrink-0 truncate text-fg-muted">{suggestion.detail}</span>
                </div>
            {/each}
        </div>
        {#if suggestions[selected]?.documentation}
            <p class="border-t border-line-subtle px-3 py-2 whitespace-pre-wrap text-fg-secondary">
                {suggestions[selected].documentation}
            </p>
        {/if}
    </div>
{:else if info}
    <div
        role="tooltip"
        class="editor-info absolute z-30 max-w-[calc(100%-1rem)] rounded-md popover-surface px-3 py-2 font-sans text-xs whitespace-pre-wrap text-fg-secondary"
        {style}>
        {info}
    </div>
{/if}
