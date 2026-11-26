// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

export type Theme = 'auto' | 'dark' | 'light';

export interface FormFieldContext {
    id?: string;
    label?: string;
    required?: boolean;
    hideAsterisk?: boolean;
    variant?: 'standard' | 'floating';
    error?: string;
    valid?: boolean;
    counter?: string;
}

export interface ImageSource {
    srcset: string;
    type: string;
}
