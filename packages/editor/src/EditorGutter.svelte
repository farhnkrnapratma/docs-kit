<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import { cn } from '@farhnkrnapratma/docs-ui/utils/cn.ts';

    interface Props {
        lineCount: number;
        lineNumberClass: (line: number) => string;
    }

    let { lineCount, lineNumberClass }: Props = $props();
</script>

<div
    class="editor-gutter-track pointer-events-none sticky left-0 z-10 box-border flex shrink-0 flex-col border-r border-line-subtle bg-canvas font-mono text-xs select-none"
    style:width="var(--editor-gutter-width)"
    style:min-width="var(--editor-gutter-width)"
    style:max-width="var(--editor-gutter-width)"
    aria-hidden="true">
    {#each { length: lineCount } as _, i (i)}
        <div
            class={cn(
                'editor-gutter-num box-border flex items-start justify-center px-1 text-center font-mono leading-6 tabular-nums select-none',
                lineNumberClass(i + 1)
            )}>
            {i + 1}
        </div>
    {/each}
</div>
