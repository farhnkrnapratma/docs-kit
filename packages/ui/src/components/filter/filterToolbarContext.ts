// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

export type FilterToolbarControlSize = 'sm' | 'md';

export type FilterToolbarContext = {
    get controlSize(): FilterToolbarControlSize;
    get stackOnMobile(): boolean;
};

export const FILTER_TOOLBAR_CONTROL_SIZE = Symbol('filterToolbarControlSize');
