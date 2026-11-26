<!--
SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama

SPDX-License-Identifier: MIT OR Apache-2.0
-->

<script
    lang="ts"
    module>
    import type { Component } from 'svelte';
    import type { ShortcutParams } from '../utils/shortcut.svelte';

    export type DropdownValue = string | number | boolean | null;

    export interface DropdownOption {
        value: DropdownValue;
        label: string;
        shortLabel?: string;
    }

    export interface DropdownAction {
        label: string;
        icon?: Component<{ class?: string }>;
        onSelect: () => void;
        danger?: boolean;
        disabled?: boolean;
        shortcut?: ShortcutParams;
    }
</script>

<script lang="ts">
    import { tick, type Snippet } from 'svelte';
    import { fromAction } from 'svelte/attachments';
    import { Check, ChevronDown, Square, SquareCheck } from '@lucide/svelte';
    import { cn } from '../utils/cn';
    import { MENU_ITEM_TONE_CLASSES } from '../utils/menuItemStyles';
    import { portal } from '../utils/actions';
    import { focusScope } from '../utils/focusScope';
    import { popoverPosition } from '../utils/popoverPosition';
    import { shortcut } from '../utils/shortcut.svelte';

    interface Props {
        id?: string;
        label?: string;
        placeholder?: string;
        ariaLabel?: string;
        options?: DropdownOption[];
        value?: any;
        multiple?: boolean;
        actions?: DropdownAction[];
        trigger?: Snippet<[{ isOpen: boolean; toggle: () => void }]>;
        children?: Snippet<[{ close: () => void }]>;
        size?: 'sm' | 'md';
        fullWidth?: boolean;
        placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
        shortcutScope?: string;
        disabled?: boolean;
        onChange?: (value: any) => void;
        onOpenChange?: (open: boolean) => void;
        class?: string;
    }

    let {
        id,
        label = '',
        placeholder = 'All',
        ariaLabel,
        options = [],
        value = $bindable(null),
        multiple = false,
        actions,
        trigger,
        children,
        size,
        fullWidth = false,
        placement = 'bottom-start',
        shortcutScope,
        disabled = false,
        onChange = () => {},
        onOpenChange = () => {},
        class: className = ''
    }: Props = $props();

    const resolvedSize = $derived(size ?? 'md');

    let isOpen = $state(false);
    let anchor = $state<HTMLElement | null>(null);

    const selectedValues = $derived<DropdownValue[]>(multiple && Array.isArray(value) ? value : []);
    const hasValue = $derived(
        multiple ? selectedValues.length > 0 : value !== null && value !== undefined && value !== ''
    );

    function sameValue(a: unknown, b: unknown) {
        if (a === b) return true;
        if (a === null || a === undefined || b === null || b === undefined) return false;
        return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
    }

    function isSelected(optionValue: DropdownValue) {
        return multiple ?
                selectedValues.some(v => sameValue(v, optionValue))
            :   sameValue(optionValue, value);
    }

    const selectedOption = $derived(multiple ? undefined : options.find(o => isSelected(o.value)));

    const displayLabel = $derived(
        multiple ?
            hasValue ? `${selectedValues.length} selected`
            :   'All'
        : hasValue ? (selectedOption?.label ?? String(value))
        : placeholder
    );

    const menuRole = $derived(
        actions ? 'menu'
        : children ? 'dialog'
        : 'listbox'
    );
    const triggerLabel = $derived(
        ariaLabel
            ?? ([label, displayLabel].filter(Boolean).join(': ') || placeholder)
    );

    const rowPadding = $derived(resolvedSize === 'sm' ? 'px-2 py-1.5' : 'px-3 py-2');
    const slotSize = $derived(resolvedSize === 'sm' ? 'size-3.5' : 'size-4');

    function setOpen(next: boolean) {
        if (next === isOpen) return;
        isOpen = next;
        onOpenChange(next);
    }

    function toggle() {
        if (!disabled) setOpen(!isOpen);
    }

    function close() {
        setOpen(false);
        anchor
            ?.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"])')
            ?.focus({ preventScroll: true });
    }

    function select(optionValue: DropdownValue) {
        if (multiple) {
            const next =
                isSelected(optionValue) ?
                    selectedValues.filter(v => !sameValue(v, optionValue))
                :   [...selectedValues, optionValue];
            value = next;
            onChange(optionValue);
            return;
        }
        value = optionValue;
        onChange(optionValue);
        close();
    }

    function runAction(action: DropdownAction) {
        close();
        action.onSelect();
    }

    function items(surface: HTMLElement) {
        return [
            ...surface.querySelectorAll<HTMLElement>(
                '[role="option"], [role="menuitem"], [role="menuitemcheckbox"], button:not(:disabled), a[href]'
            )
        ];
    }

    function focusInitial(surface: HTMLElement) {
        tick().then(() => {
            const target =
                surface.querySelector<HTMLElement>('[aria-selected="true"]')
                ?? items(surface)[0]
                ?? surface;
            target.focus({ preventScroll: true });
        });
    }

    function handleMenuKeydown(event: KeyboardEvent) {
        const surface = event.currentTarget as HTMLElement;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
            return;
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            close();
            return;
        }
        const list = items(surface);
        if (!list.length) return;
        const index = list.indexOf(document.activeElement as HTMLElement);
        let next = -1;
        if (event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % list.length;
        else if (event.key === 'ArrowUp') next = index <= 0 ? list.length - 1 : index - 1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = list.length - 1;
        if (next < 0) return;
        event.preventDefault();
        list[next].focus({ preventScroll: true });
    }
</script>

{#snippet sizer(text: string)}
    <span
        class="pointer-events-none invisible col-start-1 row-start-1 whitespace-nowrap"
        aria-hidden="true">
        <span class="font-semibold">{text}</span>
    </span>
{/snippet}

<div
    bind:this={anchor}
    class={cn(
        'relative min-w-0 text-left select-none',
        trigger ? 'inline-flex'
        : fullWidth ? 'flex w-full'
        : 'inline-flex w-max max-w-full',
        className
    )}>
    {#if trigger}
        {@render trigger({ isOpen, toggle })}
    {:else}
        <button
            type="button"
            {id}
            {disabled}
            onclick={toggle}
            aria-label={triggerLabel}
            aria-expanded={isOpen}
            aria-haspopup={menuRole}
            class={cn(
                'inline-flex max-w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md glass-button text-xs font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                resolvedSize === 'sm' ? 'box-border h-8 px-2' : 'box-border h-9 px-3',
                fullWidth && 'w-full',
                !disabled && 'hover:text-fg-accent',
                isOpen && 'border-accent/30 bg-surface text-fg-accent'
            )}>
            <span class="grid min-w-0 grid-cols-1 grid-rows-1 items-center leading-none">
                {#each options as option (option.value)}
                    {@render sizer(option.label)}
                {/each}
                <span
                    class="col-start-1 row-start-1 inline-flex min-w-0 items-center gap-1 whitespace-nowrap">
                    {#if label}
                        <span class="truncate font-normal text-fg-muted">{label}:</span>
                    {/if}
                    {#if selectedOption?.shortLabel}
                        <span class="truncate sm:hidden">{selectedOption.shortLabel}</span>
                        <span class="hidden truncate sm:inline">{selectedOption.label}</span>
                    {:else}
                        <span class="truncate">{displayLabel}</span>
                    {/if}
                </span>
            </span>
            <span
                class={cn(
                    'inline-flex shrink-0 items-center justify-center transition-transform duration-200 ease-out',
                    slotSize,
                    isOpen ? 'rotate-180 text-fg-accent' : 'text-fg-muted'
                )}>
                <ChevronDown class="size-3" />
            </span>
        </button>

    {/if}
</div>

{#if isOpen && anchor}
    <button
        use:portal
        type="button"
        tabindex="-1"
        class="fixed inset-0 z-105 cursor-default"
        onclick={() => setOpen(false)}
        aria-label="Close menu"></button>

    <div
        use:portal
        use:popoverPosition={{
            placement,
            offset: 8,
            padding: 8,
            strategy: 'fixed',
            anchor,
            matchWidth: !trigger
        }}
        {@attach focusInitial}
        {@attach shortcutScope ? fromAction(focusScope, () => shortcutScope as string) : undefined}
        role={menuRole}
        tabindex="-1"
        aria-label={ariaLabel ?? (label || placeholder)}
        aria-multiselectable={menuRole === 'listbox' && multiple ? true : undefined}
        onkeydown={handleMenuKeydown}
        class={cn(
            'fixed z-110 flex flex-col overflow-hidden popover-surface p-0 font-sans outline-none',
            !trigger && 'min-w-0'
        )}>
        {#if children}
            {@render children({ close })}
        {:else if actions}
            <div class="flex flex-col overflow-y-auto">
                {#each actions as action (action.label)}
                    <button
                        type="button"
                        role="menuitem"
                        disabled={action.disabled}
                        use:shortcut={action.shortcut ?? { disabled: true }}
                        onclick={() => runAction(action)}
                        class={cn(
                            'relative flex w-full cursor-pointer items-center gap-2 text-left text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                            rowPadding,
                            MENU_ITEM_TONE_CLASSES[action.danger ? 'danger' : 'default']
                        )}>
                        {#if action.icon}
                            <action.icon class="size-3.5 shrink-0" />
                        {/if}
                        <span>{action.label}</span>
                    </button>
                {/each}
            </div>
        {:else}
            <div class="flex max-h-64 flex-col overflow-y-auto">
                {#each options as option (option.value)}
                    {@const selected = isSelected(option.value)}
                    <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onclick={() => select(option.value)}
                        class={cn(
                            'flex w-full cursor-pointer items-center justify-between gap-2 text-left text-xs font-medium transition-colors focus-visible:outline-none',
                            rowPadding,
                            selected ?
                                'bg-accent/10 font-semibold text-fg-accent'
                            :   'text-fg hover:bg-surface-hover hover:text-fg-accent focus-visible:bg-surface-hover focus-visible:text-fg-accent'
                        )}>
                        <span class="min-w-0 truncate">{option.label}</span>
                        <span
                            class={cn(
                                'inline-flex shrink-0 items-center justify-center',
                                slotSize
                            )}>
                            {#if multiple}
                                {#if selected}
                                    <SquareCheck class="size-3.5 text-fg-accent" />
                                {:else}
                                    <Square class="size-3.5 text-fg-muted" />
                                {/if}
                            {:else if selected}
                                <Check class="size-3.5 text-fg-accent" />
                            {/if}
                        </span>
                    </button>
                {:else}
                    <p class="px-2 py-3 text-center text-2xs text-fg-muted">No matches found</p>
                {/each}
            </div>
        {/if}
    </div>
{/if}
