## Git workflow

git-flow-next (`.gitflow`): `feature/*` and `bugfix/*` from `develop`; `release/*` merges into `main` and is tagged `v<version>`, which publishes both packages. Sign off every commit and follow Conventional Commits (commitlint runs in the `commit-msg` hook and CI).

## Code

- `packages/ui` is `@farhnkrnapratma/docs-ui` and must not import MDRS or SvelteKit modules. `packages/dom` is `@mdrs/dom` and may use docs-ui, `@mdrs/language-server/highlight` and pelers. The GritQL rules in `tooling/biome` enforce this.
- Both packages ship source; SvelteKit and Vite compile them.
- Coverage target is 99.999% of lines and functions (`coverage.json`, `bun run coverage`). Tests that mock modules live in `tooling/` and run in their own process.
- Write no comments in code.
