// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

let active = $state(false);

export const readingModeStore = {
    get active() {
        return active;
    },
    toggle() {
        active = !active;
    },
    enable() {
        active = true;
    },
    disable() {
        active = false;
    }
};
