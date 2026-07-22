# `@iamdevlinph/codex-kit`

Portable Codex setup for new devices and multiple projects. It provides:

- three automatically routed roles plus a manual quick implementer
- automatic global role routing
- a reusable, stack-neutral `AGENTS.md` template
- a package-owned `codex-kit-reconcile-agents` skill for semantic reconciliation
- safe commands for global setup, project synchronization, and reconciliation

The package contains no credentials. Global installation does not modify the
Codex model configuration; configuration is a separate, explicit command.

## Install on a device

No npm or GitHub login is required. For regular use, install the CLI globally:

```sh
pnpm add --global @iamdevlinph/codex-kit@latest
codex-kit global install
codex-kit global configure
```

Start a new Codex task or restart the client after installation. Codex may ask
you to review and trust the new command hooks once; approve them after confirming
that they run the installed `${CODEX_HOME:-~/.codex}/codex-kit/routing-hook.js`.

`npm install --global @iamdevlinph/codex-kit@latest` works as an alternative.
For one-off use without a global installation, prefix a command with
`pnpm dlx @iamdevlinph/codex-kit@latest`.

`global install` copies reusable agents and the
`skills/codex-kit-reconcile-agents` skill to `${CODEX_HOME:-~/.codex}`, maintains
the package routing section in global `AGENTS.md`, and adds package-owned
handlers to `hooks.json` without replacing existing hooks. `global list` shows
the reconciliation skill's ownership status. Install and uninstall preserve
modified or user-owned skill files using the same backup/restore semantics as
other package files.

The Sol root plans, routes, coordinates, and validates. On every prompt, the
routing hook supplies the current `SUBAGENT_ROUTING.md`; the root classifies the
task and delegates substantive work to the exact matching role. The role's agent
TOML—not the routing policy—selects its model and reasoning effort. To avoid
subagent startup overhead, the root may directly handle planning, conversation,
read-only checks, documentation, bookkeeping, and clear changes spanning up to
roughly three files. Automatic delegation is reserved for broad discovery,
large multi-file implementation or debugging, and high-risk review.

## Available subagents

| Subagent | Routing | Model and effort | Used for |
| --- | --- | --- | --- |
| `code-explorer` | Automatic | `gpt-5.6-terra`, medium | Read-only broad repository discovery, contract tracing, and multi-file searches |
| `implementer` | Automatic | `gpt-5.6-luna`, high | Large behavior changes, non-obvious debugging, migrations, and substantial tests |
| `code-reviewer` | Automatic | `gpt-5.6-sol`, high | Read-only review of security-sensitive, architectural, public-API, concurrency, migration, or difficult-to-validate changes |
| `quick-implementer` | Manual only | `gpt-5.6-luna`, medium | Small, mechanical, well-specified changes limited to one or two files |

The root orchestrator is not a subagent. It owns planning, routing, integration,
and final validation.

For a substantial task that splits into genuinely independent slices, the root
may run multiple `implementer` instances concurrently. Each receives exclusive
file or module ownership and separate validation scope. Work that shares types,
schemas, configuration, generated artifacts, migrations, lockfiles, or dependency
ordering stays with one implementer or runs sequentially; multiple files alone
do not justify duplicate agents.

`quick-implementer` remains installed for explicit manual delegation but is not
selected by the default automatic route. The root reuses delegated test evidence
and normally performs only lightweight integration checks.

`global configure` sets these defaults while preserving unrelated settings:

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "low"
plan_mode_reasoning_effort = "high"
```

This keeps ordinary root work light while retaining high reasoning in Plan
Mode. Override either effort independently when needed:

```sh
codex-kit global configure \
  --reasoning-effort low \
  --plan-reasoning-effort high
```

Delegation is time-bounded. The root waits once for up to 60 seconds, requests
one progress update, and then enforces a three-minute read/review/manual-quick
deadline or five-minute implementation deadline. Validation commands that make
no progress for two minutes are stopped unless the repository documents a
longer normal runtime. Root and worker never run the same validation
concurrently.

Before changing these keys, codex-kit creates a timestamped `config.toml`
backup and records their previous values. `global uninstall` restores those
values without replacing unrelated configuration changed afterward.

Use a different Codex home when needed:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest global install \
  --codex-home /path/to/.codex
pnpm dlx @iamdevlinph/codex-kit@latest global configure \
  --codex-home /path/to/.codex
```

Inspect the installed setup:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest global list
```

The summary shows the Codex home, orchestrator, normal and Plan-mode reasoning
effort, routing-file and routing-hook status, reconciliation-skill status, and
installed custom agents without dumping unrelated configuration.

Uninstall package-managed global files:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest global uninstall
```

Uninstall removes only codex-kit's handlers from `hooks.json` and preserves other
hooks. Modified managed files are preserved unless `--force` is supplied.

## Commands

| Action | Command |
| --- | --- |
| Show command help | `codex-kit --help` |
| Print the installed version | `codex-kit --version` |
| Install global agents and routing | `codex-kit global install` |
| Configure the orchestrator | `codex-kit global configure` |
| Inspect global configuration | `codex-kit global list` |
| Remove package-managed global files | `codex-kit global uninstall` |
| Initialize project guidance | `codex-kit project init` |
| Refresh the project template reference | `codex-kit project sync` |
| Check template reconciliation | `codex-kit project status` |
| Record completed reconciliation | `codex-kit project mark-applied` |
| Check for a package update | `codex-kit version check` |

## Apply to a project

### First-time setup

For a new blank project, scaffold its initial stack first. Then initialize
codex-kit once from the project root:

```sh
cd /path/to/project
pnpm dlx @iamdevlinph/codex-kit@latest project init
```

`project init` performs the initial template sync, so do not run `project sync`
immediately afterward. It creates or updates:

- `AGENTS.md`, only when missing; an existing file is preserved
- `TEMPLATE_AGENTS.md`, a local reference copy used for future comparisons
- `.codex-kit-state.json`, reconciliation bookkeeping

If `AGENTS.md` is missing or still contains only the untouched codex-kit
scaffold, the CLI prints a clearly marked initialization prompt. Copy everything
between `BEGIN CODEX INITIALIZATION PROMPT` and
`END CODEX INITIALIZATION PROMPT` into a Codex task opened at the project root.
The prompt asks Codex to verify that the project has enough substantive code,
dependencies, configuration, and scripts to derive reliable guidance. If not,
Codex stops without inventing rules or marking the template applied. Finish
scaffolding the project, rerun `project init`, and send the new CLI prompt.

When `AGENTS.md` already contains guidance, `project init` preserves it and
prints the reconciliation prompt described below instead.

## Synchronize template updates

After a newer codex-kit template is released, refresh an initialized project:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest project sync
```

`project sync` never edits `AGENTS.md` or project skills. It routes Codex to the
global `codex-kit-reconcile-agents` skill, which inspects project state and
existing skills, merges only applicable reusable changes, preserves local
adaptations and organization, and may create or update a concrete conditional
workflow under `.agents/skills`. Critical safety, authorization, secrets,
database, deployment, and destructive-operation rules remain in `AGENTS.md`;
do not copy the complete template or introduce managed markers. After semantic
reconciliation and validation, record the applied template hash:

The CLI prints a clearly marked reconciliation prompt. Copy everything between
`BEGIN CODEX RECONCILIATION PROMPT` and `END CODEX RECONCILIATION PROMPT` into a
Codex task opened at the project root. That prompt tells Codex to validate and
then run:

```sh
codex-kit project mark-applied
```

You normally do not run that command manually.

`mark-applied` updates only `.codex-kit-state.json`; it does not validate or
modify `AGENTS.md`.

If `TEMPLATE_AGENTS.md` was modified locally, synchronization preserves it and
asks for review instead of overwriting it. Use `--force` only after intentionally
discarding the local candidate changes.

### Synchronize multiple projects

Install the CLI once and keep a local path list:

```sh
pnpm add --global @iamdevlinph/codex-kit

while IFS= read -r repo; do
  [ -n "$repo" ] && codex-kit project sync --cwd "$repo"
done < ~/.config/codex-kit/projects.txt
```

Update global agents and routing separately when those assets change:

```sh
pnpm add --global @iamdevlinph/codex-kit@latest
codex-kit global install
```

## Check for a new version

```sh
codex-kit version check
```

The command queries the public npm registry only when requested. Normal project
commands do not add network latency or depend on registry availability.

## Requirements

- Node.js 20 or newer
- Codex with custom subagent and lifecycle-hook support

The published package has no runtime dependencies and uses only Node.js
standard-library modules.

## License

Files included in the published `@iamdevlinph/codex-kit` npm package are
licensed under the [ISC License](LICENSE). Repository-only files remain
proprietary and are not covered by that license.

## References

- [Codex custom subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex `AGENTS.md` discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex hooks](https://learn.chatgpt.com/docs/hooks)
