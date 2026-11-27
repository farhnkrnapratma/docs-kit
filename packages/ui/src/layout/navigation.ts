// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

export interface NavLink {
    href: string;
    label: string;
    section?: string;
}

export function isCurrentPath(href: string, current: string): boolean {
    if (href === '/') return current === '/';
    return current === href || current.startsWith(`${href}/`);
}

export function groupBySection(links: readonly NavLink[]): [string, NavLink[]][] {
    const groups = new Map<string, NavLink[]>();
    for (const link of links) {
        const section = link.section ?? '';
        groups.set(section, [...(groups.get(section) ?? []), link]);
    }
    return [...groups];
}

export function clampSplit(value: number, min = 0.2, max = 0.8): number {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0.5;
}
