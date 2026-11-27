// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

function words(original: string) {
    const name = original.split(/[\\/]/).pop() ?? '';
    const dot = name.lastIndexOf('.');
    return (dot > 0 ? name.slice(0, dot) : name)
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
}

export function assetAltText(original: string, fallback = 'Image') {
    const parts = words(original).map(word =>
        word.length > 1 && word === word.toUpperCase() && /\p{L}/u.test(word)
            ? word
            : word.toLowerCase()
    );
    if (!parts.length) return fallback;
    const [first, ...rest] = parts;
    return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}
