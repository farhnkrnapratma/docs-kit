# Contributing

## Setup

```sh
bun install          # also installs the git hooks
git flow config sync # activate the git-flow config in .gitflow
```

The repository uses [git-flow](https://git-flow.sh/): `feature/*` and `bugfix/*` branch from `develop`, releases merge into `main` and are tagged `v<version>`, which publishes the packages to npm.

## Checks

| Command | Runs |
| --- | --- |
| `bun run check` | Biome, then `svelte-check` |
| `bun run test` | The test suite, with the files in `tooling/` each in its own process because they mock modules |
| `bun run coverage` | The same, with coverage; it fails below `coverage.json` (99.999% of lines and functions) |
| `bun run format` | Biome's formatter |

CI also runs `reuse lint`, a TruffleHog secret scan and commitlint.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) and are checked by commitlint in the `commit-msg` hook. Sign off every commit (`git commit -s`).
