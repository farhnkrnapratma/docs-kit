<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    import type { HTMLAttributes } from 'svelte/elements';

    interface Props extends HTMLAttributes<HTMLElement> {
        html: string;
        as?: 'div' | 'span';
    }

    let { html, as = 'div', ...rest }: Props = $props();
</script>

<svelte:element
    this={as}
    {...rest}>
    {@html html}
</svelte:element>
