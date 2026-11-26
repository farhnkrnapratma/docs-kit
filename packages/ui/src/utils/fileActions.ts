// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { toastStore } from '../stores/toastStore.svelte';

export function downloadUrl(url: string) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}

export async function copyText(text: string, label: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        toastStore.success(`${label} copied.`);
        return true;
    } catch {
        toastStore.error(`Could not copy the ${label.toLowerCase()}.`);
        return false;
    }
}
