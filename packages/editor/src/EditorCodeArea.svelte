<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import { tick } from 'svelte';
    import { cn } from '@farhnkrnapratma/docs-ui/utils/cn.ts';
    import { splitHighlightedHtmlLines } from '@mdrs/dom/codeBlocks.ts';
    import { highlightMarkdown } from './highlight';
    import { hoverAt, suggestionsAt, type Suggestion } from './language';
    import EditorAssist from './EditorAssist.svelte';
    import EditorGutter from './EditorGutter.svelte';
    import EditorLines from './EditorLines.svelte';
    import type { EditorPreferences } from './preferences.svelte';
    import type { ProblemSeverity } from './problems';
    import {
        continueBlock,
        cursorPosition,
        insertIndent,
        offsetAt,
        placeBlock,
        placeDefine,
        verbatimFence,
        toggleLinePrefix,
        wrapSelection,
        type CursorPosition,
        type TextEdit
    } from './textEdits';

    interface Props {
        value?: string;
        preferences: EditorPreferences;
        theme: 'light' | 'dark';
        placeholder: string;
        minHeight: string;
        cursor: CursorPosition;
        problemLines: Map<number, ProblemSeverity>;
        onblur?: () => void;
    }

    let {
        value = $bindable(''),
        preferences,
        theme,
        placeholder,
        minHeight,
        cursor = $bindable(),
        problemLines,
        onblur
    }: Props = $props();

    const PROBLEM_LINE_NUMBER = { error: 'text-fg-danger', warning: 'text-fg-warning' } as const;

    function lineNumberClass(line: number) {
        const problem = problemLines.get(line);
        if (problem) return cn('font-medium', PROBLEM_LINE_NUMBER[problem]);
        return cursor.line === line ?
                'editor-line-number-active font-medium'
            :   'editor-gutter-muted';
    }

    let textarea = $state<HTMLTextAreaElement | null>(null);
    let pre = $state<HTMLPreElement | null>(null);
    let suggestions = $state<Suggestion[]>([]);
    let selected = $state(0);
    let info = $state('');
    let scroll = $state({ top: 0, left: 0 });
    let infoTimer: ReturnType<typeof setTimeout> | undefined;

    const TRIGGERS = new Set([':', '$', '{', '.']);
    const assistId = $props.id();
    const caretStyle = $derived(
        `top: calc(${cursor.line} * 1.5rem - ${scroll.top}px); left: calc(${cursor.column - 1}ch + 0.5rem - ${scroll.left}px);`
    );

    function suggest() {
        if (!textarea) return;
        suggestions = suggestionsAt(value || '', cursorPosition(value || '', textarea.selectionStart));
        selected = 0;
        info = '';
    }

    function closeAssist() {
        suggestions = [];
        info = '';
        clearTimeout(infoTimer);
    }

    function accept(suggestion: Suggestion) {
        const text = value || '';
        closeAssist();
        applyEdit(
            {
                value: text.slice(0, suggestion.from) + suggestion.text + text.slice(suggestion.to),
                selectionStart: suggestion.cursor,
                selectionEnd: suggestion.cursor
            },
            true
        );
    }

    function explain() {
        clearTimeout(infoTimer);
        if (suggestions.length) return;
        const text = value || '';
        const position = cursor;
        infoTimer = setTimeout(() => {
            info = hoverAt(text, position);
        }, 300);
    }

    function handleAssistKey(event: KeyboardEvent) {
        if (event.key === ' ' && event.ctrlKey) {
            event.preventDefault();
            suggest();
            return true;
        }
        if (event.key === 'Escape' && (suggestions.length || info)) {
            event.preventDefault();
            closeAssist();
            return true;
        }
        if (!suggestions.length) return false;
        const moves: Record<string, number> = {
            ArrowDown: (selected + 1) % suggestions.length,
            ArrowUp: (selected - 1 + suggestions.length) % suggestions.length
        };
        if (event.key in moves) {
            event.preventDefault();
            selected = moves[event.key];
            return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            accept(suggestions[selected]);
            return true;
        }
        return false;
    }

    const lineCount = $derived(
        (value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length
    );
    const gutterWidth = $derived(
        preferences.showLineNumbers ?
            `calc(${Math.max(2, String(lineCount).length)}ch + 1.25rem)`
        :   '0px'
    );
    const highlightedLines = $derived(splitHighlightedHtmlLines(highlightMarkdown(value || '')));

    function syncScroll() {
        if (!textarea || !pre) return;
        pre.scrollTop = textarea.scrollTop;
        pre.scrollLeft = textarea.scrollLeft;
        scroll = { top: textarea.scrollTop, left: textarea.scrollLeft };
    }

    function updateCursor() {
        if (!textarea) return;
        cursor = cursorPosition(value || '', textarea.selectionStart);
        explain();
    }

    function applyEdit(edit: TextEdit, focus = false) {
        value = edit.value;
        tick().then(() => {
            if (!textarea) return;
            if (focus) textarea.focus();
            textarea.selectionStart = edit.selectionStart;
            textarea.selectionEnd = edit.selectionEnd;
            syncScroll();
            updateCursor();
        });
    }

    export function insert(prefix: string, suffix = '') {
        if (!textarea) return;
        applyEdit(
            wrapSelection(
                value || '',
                textarea.selectionStart,
                textarea.selectionEnd,
                prefix,
                suffix
            ),
            true
        );
    }

    export function insertBlock(opening: string, closing = '') {
        if (!textarea) return;
        applyEdit(
            placeBlock(value || '', textarea.selectionStart, textarea.selectionEnd, opening, closing),
            true
        );
    }

    export function insertVerbatim() {
        if (!textarea) return;
        const { selectionStart, selectionEnd } = textarea;
        const fence = verbatimFence((value || '').substring(selectionStart, selectionEnd));
        applyEdit(
            placeBlock(value || '', selectionStart, selectionEnd, `${fence}verbatim\n`, `\n${fence}`),
            true
        );
    }

    export function insertDefine() {
        if (!textarea) return;
        applyEdit(placeDefine(value || ''), true);
    }

    export function prefixLines(prefix: string) {
        if (!textarea) return;
        applyEdit(
            toggleLinePrefix(value || '', textarea.selectionStart, textarea.selectionEnd, prefix),
            true
        );
    }

    export function focus() {
        textarea?.focus();
    }

    export function goTo(position: CursorPosition) {
        if (!textarea) return;
        const offset = offsetAt(value || '', position);
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(offset, offset);
        updateCursor();
        pre?.querySelectorAll('.editor-code-line')[position.line - 1]?.scrollIntoView({
            block: 'center'
        });
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (handleAssistKey(event)) return;
        const target = event.currentTarget as HTMLTextAreaElement;
        if (event.key === 'Tab') {
            event.preventDefault();
            applyEdit(
                insertIndent(
                    value || '',
                    target.selectionStart,
                    target.selectionEnd,
                    preferences.indent
                )
            );
            return;
        }
        if (
            event.key === 'Enter'
            && !event.shiftKey
            && !event.altKey
            && !event.ctrlKey
            && !event.metaKey
        ) {
            const edit = continueBlock(value || '', target.selectionStart, target.selectionEnd);
            if (!edit) return;
            event.preventDefault();
            applyEdit(edit);
        }
    }

    function handleInput(event: Event) {
        syncScroll();
        updateCursor();
        const typed = (event as InputEvent).data ?? '';
        if (suggestions.length || TRIGGERS.has(typed.slice(-1))) suggest();
    }

    function handleBlur() {
        closeAssist();
        onblur?.();
    }
</script>

{#snippet input(className: string, paddingLeft?: string)}
    <textarea
        bind:this={textarea}
        id="markdown-content"
        name="markdownContent"
        aria-label="Markdown content"
        aria-autocomplete="list"
        aria-controls={suggestions.length ? `${assistId}-list` : undefined}
        aria-activedescendant={suggestions.length ? `${assistId}-${selected}` : undefined}
        {placeholder}
        bind:value
        onscroll={syncScroll}
        oninput={handleInput}
        onclick={updateCursor}
        onkeyup={updateCursor}
        onfocus={updateCursor}
        onblur={handleBlur}
        onkeydown={handleKeyDown}
        class={className}
        style:padding-left={paddingLeft}></textarea>
    <EditorAssist
        id={assistId}
        {suggestions}
        {selected}
        {info}
        style={caretStyle}
        onaccept={accept} />
{/snippet}


{#if preferences.lineWrapMode === 'none'}
    <div
        class="editor-lines relative flex min-h-full w-full flex-row font-mono"
        style:min-height={minHeight || undefined}
        style:--editor-tab-size={preferences.indentSize}
        style:--editor-gutter-width={gutterWidth}>
        {#if preferences.showLineNumbers}
            <EditorGutter
                {lineCount}
                {lineNumberClass} />
        {/if}
        <div
            class="relative grid min-h-full min-w-0 flex-1 overflow-hidden [grid-template-areas:'editor']">
            <EditorLines
                bind:pre
                lines={highlightedLines}
                activeLine={cursor.line}
                wrap={false}
                {lineNumberClass}
                {theme} />

            {@render input("editor-textarea m-0! box-border! h-full! min-h-full! w-full! resize-none! overflow-x-auto! overflow-y-hidden! border-0! bg-transparent! pt-0! pr-5! pb-5! pl-2! break-normal! wrap-normal! [word-break:normal]! whitespace-pre! text-transparent caret-fg outline-hidden! [grid-area:editor] placeholder:text-fg-muted/60 focus:border-transparent! focus:shadow-none! focus:ring-0 focus:outline-none focus-visible:border-transparent! focus-visible:shadow-none! focus-visible:ring-0! focus-visible:outline-hidden!")}
        </div>
    </div>
{:else}
    <div
        class="editor-lines relative flex min-h-full w-full flex-col font-mono"
        style:min-height={minHeight || undefined}
        style:--editor-tab-size={preferences.indentSize}
        style:--editor-gutter-width={gutterWidth}>
        {#if preferences.showLineNumbers}
            <div
                class="editor-gutter-track pointer-events-none absolute inset-y-0 left-0 z-10 box-border border-r font-mono text-xs"
                style:width="var(--editor-gutter-width)"
                style:min-width="var(--editor-gutter-width)"
                style:max-width="var(--editor-gutter-width)"
                aria-hidden="true">
            </div>
        {/if}
        <div class="relative grid min-h-full w-full flex-1 [grid-template-areas:'editor']">
            <EditorLines
                bind:pre
                lines={highlightedLines}
                activeLine={cursor.line}
                wrap
                showLineNumbers={preferences.showLineNumbers}
                {lineNumberClass}
                {theme} />

            {@render input(
                "editor-textarea m-0! box-border! h-full! min-h-full! w-full! resize-none! overflow-hidden! border-0! bg-transparent! pt-0! pr-5! pb-5! break-normal! wrap-break-word! whitespace-pre-wrap! text-transparent caret-fg outline-hidden! [grid-area:editor] placeholder:text-fg-muted/60 focus:border-transparent! focus:shadow-none! focus:ring-0 focus:outline-none focus-visible:border-transparent! focus-visible:shadow-none! focus-visible:ring-0! focus-visible:outline-hidden!",
                preferences.showLineNumbers ? 'calc(var(--editor-gutter-width) + 0.5rem)' : '0.5rem'
            )}
        </div>
    </div>
{/if}
