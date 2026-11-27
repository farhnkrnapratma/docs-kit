<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import { cn } from '@farhnkrnapratma/docs-ui/utils/cn.ts';
    import { splitHighlightedHtmlLines } from '@mdrs/dom/codeBlocks.ts';
    import { tick } from 'svelte';
    import EditorGutter from './EditorGutter.svelte';
    import { highlightCode } from './highlight';
    import { insertIndent } from './textEdits';

    interface Props {
        value?: string;
        language: string;
        label: string;
        readonly?: boolean;
        wrap?: boolean;
        lineNumbers?: boolean;
        indent?: string;
        placeholder?: string;
        class?: string;
    }

    let {
        value = $bindable(''),
        language,
        label,
        readonly = false,
        wrap = false,
        lineNumbers = true,
        indent = '  ',
        placeholder = '',
        class: className = ''
    }: Props = $props();

    let textarea = $state<HTMLTextAreaElement | null>(null);
    let pre = $state<HTMLPreElement | null>(null);

    const lines = $derived(splitHighlightedHtmlLines(highlightCode(value, language)));
    const gutter = $derived(lineNumbers && !wrap);
    const flow = $derived(wrap ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre');

    function syncScroll() {
        if (!textarea || !pre) return;
        pre.scrollTop = textarea.scrollTop;
        pre.scrollLeft = textarea.scrollLeft;
    }

    function onKeydown(event: KeyboardEvent) {
        if (readonly || event.key !== 'Tab' || event.shiftKey) return;
        event.preventDefault();
        const target = event.currentTarget as HTMLTextAreaElement;
        const edit = insertIndent(value, target.selectionStart, target.selectionEnd, indent);
        value = edit.value;
        tick().then(() => target.setSelectionRange(edit.selectionStart, edit.selectionEnd));
    }
</script>

<div
    class={cn('code-editor relative flex min-h-0 flex-1 overflow-hidden font-mono text-code', className)}
    style:--editor-gutter-width="calc({Math.max(2, String(lines.length).length)}ch + 1.25rem)">
    {#if gutter}
        <EditorGutter
            lineCount={lines.length}
            lineNumberClass={() => 'editor-gutter-muted'} />
    {/if}
    <div class="relative grid min-h-0 min-w-0 flex-1 [grid-template-areas:'editor']">
        <pre
            bind:this={pre}
            aria-hidden="true"
            class={cn(
                'pointer-events-none m-0 overflow-hidden bg-transparent p-3 leading-6 [grid-area:editor]',
                flow
            )}><code class="hljs language-{language} block bg-transparent! p-0!"
                >{#each lines as line, index (index)}<div>{@html line || '&nbsp;'}</div>{/each}</code
            ></pre>
        <textarea
            bind:this={textarea}
            bind:value
            aria-label={label}
            {readonly}
            {placeholder}
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            onscroll={syncScroll}
            oninput={syncScroll}
            onkeydown={onKeydown}
            class={cn(
                'm-0 h-full min-h-0 w-full resize-none overflow-auto border-0 bg-transparent p-3 leading-6 text-transparent caret-fg outline-none [grid-area:editor] placeholder:text-fg-muted/60 focus-visible:ring-2 focus-visible:ring-focus-ring',
                flow
            )}></textarea>
    </div>
</div>
