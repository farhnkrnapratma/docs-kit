// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

export const INDENT_SIZES = [2, 4, 8] as const;
export type IndentSize = (typeof INDENT_SIZES)[number];
type IndentMode = 'spaces' | 'tabs';
type LineWrapMode = 'soft' | 'none';

const STORAGE_KEY = 'markdown_editor_preferences';

const VALID: Record<string, (value: unknown) => boolean> = {
    indentMode: value => value === 'spaces' || value === 'tabs',
    indentSize: value => INDENT_SIZES.includes(value as IndentSize),
    lineWrapMode: value => value === 'soft' || value === 'none',
    showLineNumbers: value => typeof value === 'boolean',
    autosaveEnabled: value => typeof value === 'boolean'
};

export class EditorPreferences {
    indentMode = $state<IndentMode>('spaces');
    indentSize = $state<IndentSize>(4);
    lineWrapMode = $state<LineWrapMode>('soft');
    showLineNumbers = $state(true);
    autosaveEnabled = $state(true);
    ready = $state(false);

    get indent(): string {
        return this.indentMode === 'spaces' ? ' '.repeat(this.indentSize) : '\t';
    }

    load() {
        try {
            const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
            if (saved && typeof saved === 'object') {
                for (const [key, valid] of Object.entries(VALID)) {
                    const value = (saved as Record<string, unknown>)[key];
                    if (valid(value)) Object.assign(this, { [key]: value });
                }
            }
        } catch {}
        this.ready = true;
    }

    private persist() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    indentMode: this.indentMode,
                    indentSize: this.indentSize,
                    lineWrapMode: this.lineWrapMode,
                    showLineNumbers: this.showLineNumbers,
                    autosaveEnabled: this.autosaveEnabled
                })
            );
        } catch {}
    }

    toggleIndentMode() {
        this.indentMode = this.indentMode === 'spaces' ? 'tabs' : 'spaces';
        this.persist();
    }

    setIndentSize(size: IndentSize) {
        this.indentSize = size;
        this.persist();
    }

    toggleLineWrap() {
        this.lineWrapMode = this.lineWrapMode === 'soft' ? 'none' : 'soft';
        this.persist();
    }

    toggleLineNumbers() {
        this.showLineNumbers = !this.showLineNumbers;
        this.persist();
    }

    toggleAutosave() {
        this.autosaveEnabled = !this.autosaveEnabled;
        this.persist();
    }
}
