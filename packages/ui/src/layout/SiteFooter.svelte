<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import type { Snippet } from 'svelte';
    import { cn } from '../utils/cn';
    import type { NavLink } from './navigation';

    interface Props {
        links?: NavLink[];
        children?: Snippet;
        class?: string;
    }

    let { links = [], children, class: className = '' }: Props = $props();
</script>

<footer class={cn('site-footer border-t border-line-subtle text-sm text-fg-muted', className)}>
    <div
        class="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>{@render children?.()}</div>
        {#if links.length}
            <nav
                aria-label="Footer"
                class="flex flex-wrap gap-x-4 gap-y-1">
                {#each links as link (link.href)}
                    <a
                        href={link.href}
                        class="hover:text-fg-accent">{link.label}</a>
                {/each}
            </nav>
        {/if}
    </div>
</footer>
