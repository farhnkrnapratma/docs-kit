<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import type { Snippet } from 'svelte';
    import ThemeSelect from '../components/filter/ThemeSelect.svelte';
    import { cn } from '../utils/cn';
    import { isCurrentPath, type NavLink } from './navigation';

    interface Props {
        brand: Snippet;
        homeLabel?: string;
        links?: NavLink[];
        current?: string;
        actions?: Snippet;
        class?: string;
    }

    let {
        brand,
        homeLabel = 'Home',
        links = [],
        current = '',
        actions,
        class: className = ''
    }: Props = $props();
</script>

<header
    class={cn(
        'site-header sticky top-0 z-40 border-b border-line-subtle bg-canvas/85 backdrop-blur',
        className
    )}>
    <div class="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
        <a
            href="/"
            aria-label={homeLabel}
            class="flex h-full shrink-0 items-center font-semibold text-fg">
            {@render brand()}
        </a>
        <nav
            aria-label="Main"
            class="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto">
            {#each links as link (link.href)}
                {@const active = isCurrentPath(link.href, current)}
                <a
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    class={cn(
                        'shrink-0 rounded-md px-2.5 py-1.5 text-sm text-fg-secondary transition-colors hover:text-fg-accent',
                        active && 'font-medium text-fg-accent'
                    )}>
                    {link.label}
                </a>
            {/each}
        </nav>
        {@render actions?.()}
        <ThemeSelect variant="ghost" />
    </div>
</header>
