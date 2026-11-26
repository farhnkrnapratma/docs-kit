// SPDX-FileCopyrightText: 2026 Farhan Kurnia Pratama
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface FileCoverage {
    lines: Map<number, number>;
    functions: number;
    functionsHit: number;
}

const root = new URL('../', import.meta.url).pathname;
const thresholds = (await Bun.file(join(root, 'coverage.json')).json()) as {
    lines: number;
    functions: number;
};

function parse(lcov: string, into: Map<string, FileCoverage>) {
    let file: FileCoverage | undefined;
    for (const row of lcov.split('\n')) {
        if (row.startsWith('SF:')) {
            const path = row.slice(3);
            if (!path.startsWith('packages/')) {
                file = undefined;
                continue;
            }
            file = into.get(path) ?? { lines: new Map(), functions: 0, functionsHit: 0 };
            into.set(path, file);
        } else if (file && row.startsWith('DA:')) {
            const [line, hits] = row.slice(3).split(',').map(Number);
            file.lines.set(line, (file.lines.get(line) ?? 0) + hits);
        } else if (file && row.startsWith('FNF:')) {
            file.functions = Math.max(file.functions, Number(row.slice(4)));
        } else if (file && row.startsWith('FNH:')) {
            file.functionsHit = Math.max(file.functionsHit, Number(row.slice(4)));
        }
    }
}

const plain = process.argv.includes('--plain');
const work = mkdtempSync(join(tmpdir(), 'docs-kit-coverage-'));
const merged = new Map<string, FileCoverage>();
let failed = false;

const isolated = [...new Bun.Glob('tooling/*.test.ts').scanSync({ cwd: root })].sort();
for (const target of ['tests', ...isolated]) {
    const dir = join(work, target.replaceAll('/', '_'));
    mkdirSync(dir);
    const coverage = plain
        ? []
        : ['--coverage', '--coverage-reporter=lcov', `--coverage-dir=${dir}`];
    const run = Bun.spawnSync(['bun', 'test', target, ...coverage], {
        cwd: root,
        stdout: 'inherit',
        stderr: 'inherit'
    });
    if (run.exitCode !== 0) {
        console.error(`test run failed: ${target}`);
        failed = true;
    }
    if (!plain) parse(await Bun.file(join(dir, 'lcov.info')).text(), merged);
}
if (plain) {
    rmSync(work, { recursive: true, force: true });
    process.exit(failed ? 1 : 0);
}

let lines = 0;
let linesHit = 0;
let functions = 0;
let functionsHit = 0;
const out: string[] = [];
for (const [path, file] of [...merged].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`SF:${path}`);
    for (const [line, hits] of file.lines) out.push(`DA:${line},${hits}`);
    out.push('end_of_record');
    lines += file.lines.size;
    linesHit += [...file.lines.values()].filter(hits => hits > 0).length;
    functions += file.functions;
    functionsHit += file.functionsHit;
}
mkdirSync(join(root, 'coverage'), { recursive: true });
writeFileSync(join(root, 'coverage/lcov.info'), out.join('\n') + '\n');
rmSync(work, { recursive: true, force: true });

const linePct = (100 * linesHit) / lines;
const functionPct = (100 * functionsHit) / functions;
console.log(
    `\n${merged.size} files, lines ${linesHit}/${lines} (${linePct.toFixed(3)}%), functions ${functionsHit}/${functions} (${functionPct.toFixed(3)}%)`
);
if (linePct < thresholds.lines || functionPct < thresholds.functions) {
    console.error(`below the gate: lines ${thresholds.lines}%, functions ${thresholds.functions}%`);
    failed = true;
}
process.exit(failed ? 1 : 0);
