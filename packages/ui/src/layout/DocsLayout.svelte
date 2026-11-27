<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import type { Snippet } from 'svelte';
    import { cn } from '../utils/cn';
    import { groupBySection, isCurrentPath, type NavLink } from './navigation';
    import TableOfContents from './TableOfContents.svelte';

    interface Props {
        nav: NavLink[];
        current: string;
        headings?: { id: string; text: string; level: number }[];
        children: Snippet;
        class?: string;
    }

    let { nav, current, headings = [], children, class: className = '' }: Props = $props();

    const sections = $derived(groupBySection(nav));
</script>

<div
    class={cn(
        'docs-layout mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_13rem]',
        className
    )}>
    <nav
        aria-label="Documentation"
        class="text-sm lg:sticky lg:top-20 lg:self-start">
        {#each sections as [section, links] (section)}
            {#if section}
                <p class="mt-4 mb-1 text-xs font-semibold tracking-wide text-fg-muted uppercase first:mt-0">
                    {section}
                </p>
            {/if}
            <ul class="flex flex-col">
                {#each links as link (link.href)}
                    {@const active = isCurrentPath(link.href, current)}
                    <li>
                        <a
                            href={link.href}
                            aria-current={active ? 'page' : undefined}
                            class={cn(
                                'block rounded-md px-2 py-1 text-fg-secondary hover:text-fg-accent',
                                active && 'bg-accent/10 font-medium text-fg-accent'
                            )}>
                            {link.label}
                        </a>
                    </li>
                {/each}
            </ul>
        {/each}
    </nav>
    <main
        id="main"
        class="min-w-0">
        {@render children()}
    </main>
    <TableOfContents
        {headings}
        class="hidden xl:sticky xl:top-20 xl:block xl:self-start" />
</div>
