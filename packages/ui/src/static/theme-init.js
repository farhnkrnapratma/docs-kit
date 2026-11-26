// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

(() => {
    let theme = 'auto';
    try {
        theme = localStorage.getItem('theme') || 'auto';
    } catch {}
    const dark =
        theme === 'dark' ||
        (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
})();
