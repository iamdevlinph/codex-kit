# `@iamdevlinph/codex-kit`

Portable Codex subagents, automatic task routing, and reusable project guidance.

- Routes work automatically while keeping small tasks with the root agent.
- Includes four subagents for exploration, implementation, review, and quick edits.
- Provides a stack-neutral `AGENTS.md` starting point.
- Reconciles template updates semantically instead of replacing project guidance.
- Preserves user-owned configuration and modified managed files.
- Runs as a dependency-free Node.js CLI.

## Quick start

1. Install the CLI and global Codex assets:

   ```sh
   pnpm add --global @iamdevlinph/codex-kit@latest
   codex-kit global install
   ```

2. Initialize a project from its root:

   ```sh
   codex-kit project init
   ```

Restart Codex after global installation. Codex may ask you to trust the installed
hook at `${CODEX_HOME:-~/.codex}/codex-kit/routing-hook.js`.

`npm install --global @iamdevlinph/codex-kit@latest` is also supported. For
one-off use, prefix commands with `pnpm dlx @iamdevlinph/codex-kit@latest`.

## Included subagents

| Subagent | Routing | Model and effort | Purpose |
| --- | --- | --- | --- |
| `code-explorer` | Automatic | `gpt-5.6-terra`, medium | Broad read-only discovery and contract tracing |
| `implementer` | Automatic | `gpt-5.6-luna`, high | Large changes, debugging, migrations, and substantial tests |
| `code-reviewer` | Automatic | `gpt-5.6-sol`, high | Feature structure and high-risk review |
| `quick-implementer` | Manual | `gpt-5.6-luna`, medium | Small mechanical changes in one or two files |

The root orchestrator plans, routes, integrates, and validates. It handles clear
small changes directly and delegates broader discovery, implementation, or review
according to the installed `SUBAGENT_ROUTING.md` policy.

## Commands

| Action | Command |
| --- | --- |
| Show help | `codex-kit -h` or `codex-kit --help` |
| Print version | `codex-kit -v` or `codex-kit --version` |
| Install or update global assets | `codex-kit global install` |
| Configure model defaults | `codex-kit global configure` |
| Inspect global setup | `codex-kit global list` |
| Remove package-managed global files | `codex-kit global uninstall` |
| Initialize project guidance | `codex-kit project init` |
| Refresh the project template | `codex-kit project sync` |
| Check reconciliation status | `codex-kit project status` |
| Record completed reconciliation | `codex-kit project mark-applied` |
| Check for a package update | `codex-kit version check` |

Use `codex-kit --help` for exhaustive command details.

## Device setup

`global install` copies the agents, routing assets, hooks, and
`codex-kit-reconcile-agents` skill into `${CODEX_HOME:-~/.codex}`. It adds only
codex-kit's hook handlers and preserves unrelated settings and hooks.

The default root configuration is:

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "low"
plan_mode_reasoning_effort = "high"
```

Override it explicitly when needed:

```sh
codex-kit global configure \
  --orchestrator gpt-5.6-sol \
  --reasoning-effort low \
  --plan-reasoning-effort high
```

`--model` is an alias for `--orchestrator`. Before changing managed values,
codex-kit creates a timestamped `config.toml` backup and records the previous
values. `global uninstall` restores them without replacing unrelated later edits.
Modified managed files are preserved.

Use `codex-kit global list` to inspect model settings, routing and hook status,
the reconciliation skill, and installed agents. Use `codex-kit global uninstall`
to remove package-managed global files.

## Project workflow

Run `codex-kit project init` after the project has enough code, dependencies,
configuration, and scripts for Codex to derive reliable guidance. It creates:

- `AGENTS.md` only when missing; existing guidance is preserved;
- `TEMPLATE_AGENTS.md` as the local template reference;
- `.codex-kit-state.json` for reconciliation bookkeeping.

Initialization includes the first template sync. When the CLI prints an
initialization or reconciliation prompt, copy the complete marked block into a
Codex task opened at the project root.

After installing a newer package version, refresh the reference template:

```sh
codex-kit project sync
```

`project sync` never edits `AGENTS.md` or project skills. The reconciliation skill
compares the refreshed template with the project's guidance and merges only
applicable rules while preserving local organization and adaptations. If
`TEMPLATE_AGENTS.md` was modified locally, sync preserves it for review instead
of overwriting it.

After reconciliation and validation, Codex runs:

```sh
codex-kit project mark-applied
```

`mark-applied` only updates `.codex-kit-state.json`; it does not validate or
modify `AGENTS.md`. Use `codex-kit project status` to check whether the current
template still needs reconciliation.

## Options

- `--codex-home PATH` selects a Codex home for global commands instead of
  `CODEX_HOME` or `~/.codex`.
- `--cwd PATH` selects a project directory for project commands instead of the
  current directory.
- `--force` lets `global install`, `global configure`, `project init`, or
  `project sync` replace modified files they manage. Use it only when you intend
  to discard those local changes.

Examples:

```sh
codex-kit global install --codex-home /path/to/.codex
codex-kit project sync --cwd /path/to/project
```

## Requirements

- Node.js 20 or newer
- Codex with custom subagent and lifecycle-hook support

The published package contains no credentials or runtime dependencies. Version
checks contact the public npm registry only when `codex-kit version check` runs.

## Security and license

See [SECURITY.md](SECURITY.md) for supported versions and private vulnerability
reporting. This repository and package use the [ISC License](LICENSE).

## References

- [Codex custom subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex `AGENTS.md` discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex hooks](https://learn.chatgpt.com/docs/hooks)
