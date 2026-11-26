<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script lang="ts">
    interface Props {
        text: string;
        required: boolean;
    }

    let { text, required }: Props = $props();
</script>

{text}
{#if required}
    <span
        class="text-danger"
        aria-hidden="true">
        *
    </span>
{/if}
