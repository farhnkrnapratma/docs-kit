<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import { cn } from '@farhnkrnapratma/docs-ui/utils/cn.ts';

    interface Props {
        pre?: HTMLPreElement | null;
        lines: string[];
        activeLine: number;
        wrap: boolean;
        showLineNumbers?: boolean;
        lineNumberClass: (line: number) => string;
        theme: 'light' | 'dark';
    }

    let {
        pre = $bindable(null),
        lines,
        activeLine,
        wrap,
        showLineNumbers = false,
        lineNumberClass,
        theme
    }: Props = $props();
</script>

{#if wrap}
<pre
    bind:this={pre}
    data-code-theme={theme}
    class="editor-pre pointer-events-none m-0! box-border! min-h-full! w-full! scrollbar-none overflow-hidden! border-0! bg-transparent pt-0! pr-0! pb-5! pl-0! break-normal! wrap-break-word! whitespace-pre-wrap! select-none [-ms-overflow-style:none] [grid-area:editor] [&::-webkit-scrollbar]:hidden"><code
        class="hljs language-mdrs m-0! block! w-full! min-w-full! overflow-x-visible! p-0! [overflow-wrap:inherit]! [word-break:inherit]! [white-space:inherit]!"
        data-code-theme={theme}
        >{#each lines as lineHtml, i (i)}<div
                class={cn(
                    'editor-code-line m-0! flex! w-full! flex-row! items-stretch! p-0! leading-6! [overflow-wrap:inherit]! [word-break:inherit]! [white-space:inherit]!',
                    activeLine === i + 1 && 'editor-code-line-active'
                )}>{#if showLineNumbers}<span
                        class={cn(
                            'editor-gutter-num sticky left-0 z-20 box-border! inline-flex! shrink-0! items-start! justify-center! self-stretch! border-r px-1 text-center font-mono tabular-nums select-none',
                            lineNumberClass(i + 1)
                        )}
                        style:width="var(--editor-gutter-width)"
                        style:min-width="var(--editor-gutter-width)"
                        style:max-width="var(--editor-gutter-width)">{i + 1}</span
                    >{/if}<span
                    class="editor-line-content m-0! block! min-w-0! flex-1! pt-0! pr-5! pb-0! pl-2! leading-6! [overflow-wrap:inherit]! [word-break:inherit]! [white-space:inherit]!"
                    >{@html lineHtml || '&nbsp;'}</span></div>{/each}</code></pre>
{:else}
<pre
    bind:this={pre}
    data-code-theme={theme}
    class="editor-pre pointer-events-none m-0! box-border! min-h-full! w-full! scrollbar-none overflow-x-auto! overflow-y-hidden! border-0! bg-transparent pt-0! pr-5! pb-5! pl-2! break-normal! wrap-normal! [word-break:normal]! whitespace-pre! select-none [-ms-overflow-style:none] [grid-area:editor] [&::-webkit-scrollbar]:hidden"><code
        class="hljs language-mdrs m-0! block! w-max! min-w-full! overflow-x-visible! p-0! wrap-normal! [word-break:normal]! whitespace-pre!"
        data-code-theme={theme}
        >{#each lines as lineHtml, i (i)}<div
                class={cn(
                    'editor-code-line m-0! block! w-max! min-w-full! leading-6! wrap-normal! [word-break:normal]! whitespace-pre!',
                    activeLine === i + 1 && 'editor-code-line-active'
                )}>{@html lineHtml || '&nbsp;'}</div>{/each}</code></pre>
{/if}
