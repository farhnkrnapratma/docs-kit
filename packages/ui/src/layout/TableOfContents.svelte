<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import { cn } from '../utils/cn';

    interface Heading {
        id: string;
        text: string;
        level: number;
    }

    interface Props {
        headings: Heading[];
        title?: string;
        offset?: number;
        class?: string;
    }

    let { headings, title = 'On this page', offset = 96, class: className = '' }: Props = $props();

    let active = $state('');
    const minLevel = $derived(Math.min(...headings.map(heading => heading.level)));

    function track() {
        let current = '';
        for (const heading of headings) {
            const top = document.getElementById(heading.id)?.getBoundingClientRect().top;
            if (top !== undefined && top <= offset) current = heading.id;
        }
        active = current;
    }

    $effect(() => {
        track();
        window.addEventListener('scroll', track, { passive: true });
        return () => window.removeEventListener('scroll', track);
    });
</script>

{#if headings.length}
    <nav
        aria-label={title}
        class={cn('toc text-sm', className)}>
        <p class="mb-2 font-medium text-fg">{title}</p>
        <ul class="flex flex-col border-l border-line-subtle">
            {#each headings as heading (heading.id)}
                <li>
                    <a
                        href="#{heading.id}"
                        aria-current={heading.id === active ? 'location' : undefined}
                        style:padding-left="{0.75 + (heading.level - minLevel) * 0.75}rem"
                        class={cn(
                            '-ml-px block border-l py-1 pr-2 text-fg-secondary transition-colors hover:text-fg-accent',
                            heading.id === active ? 'border-accent text-fg-accent' : 'border-transparent'
                        )}>
                        {heading.text}
                    </a>
                </li>
            {/each}
        </ul>
    </nav>
{/if}
