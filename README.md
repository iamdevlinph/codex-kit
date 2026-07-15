# `@iamdevlinph/codex-kit`

Private, portable Codex setup for new devices and multiple projects. It packages:

- four custom subagents: explorer, quick implementer, implementer, and reviewer
- global subagent-routing guidance with no `commit-pusher`
- the reusable `AGENTS.md` template previously kept in the secret Gist
- a safe CLI for global installation, template synchronization, and reconciliation tracking

The package does not contain credentials. `global install` does not edit
`config.toml`; the separate `global configure` command changes only the model
settings when explicitly requested.
Current Codex releases enable subagents by default.

The CLI and tests are written in strict TypeScript. The repository pins pnpm
`11.5.2`, TypeScript `7.0.1-rc`, and Node.js type definitions for Node 20. Source
lives in `src/`; `pnpm run typecheck` invokes the pinned compiler through
`pnpm exec tsc`, and `pnpm run build` generates the untracked executable in
`bin/`. The `prepack` lifecycle rebuilds it before every package publication.

## Development setup

After cloning or extracting the repository, install the pinned development
dependencies before opening individual TypeScript files:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec tsc --version
pnpm run typecheck
```

The compiler version must report `7.0.1-rc`. Open the repository root in the
editor so it discovers `tsconfig.json`; if the editor was already open before
installation, restart its TypeScript server.

## Core workflow

| Action | Command | Result |
| --- | --- | --- |
| Install globally | `codex-kit global install` | Installs reusable agents and routing under `~/.codex` |
| Configure orchestrator | `codex-kit global configure` | Sets `gpt-5.6-sol` with high reasoning in `config.toml` |
| Inspect global setup | `codex-kit global list` | Shows model, reasoning, routing, agents, and kit ownership |
| Apply to a project | `codex-kit project init` | Creates a local `TEMPLATE_AGENTS.md` reference and project `AGENTS.md` |
| Get template updates | `codex-kit project sync` | Refreshes the local template reference without editing `AGENTS.md` |
| Check reconciliation | `codex-kit project status` | Reports whether the latest template still needs review |
| Record reconciliation | `codex-kit project mark-applied` | Records the template hash after Codex merges applicable rules |
| Check for a release | `codex-kit version check` | Compares the installed CLI with the private package registry |

## Why two installation scopes

`global install` copies reusable agent definitions to `${CODEX_HOME:-~/.codex}`
and maintains a marked routing section in the global `AGENTS.md`.

`global configure` is explicit and opt-in because it edits `config.toml`. With
no options it sets the orchestrator to `gpt-5.6-sol` and
`model_reasoning_effort = "high"`, preserving unrelated settings. It creates a
backup and records the previous model settings so `global uninstall` can restore
them if they were not changed afterward.

`project init` creates a project-specific `AGENTS.md` and a local
`TEMPLATE_AGENTS.md` reference. The reference is not automatically active
Codex instruction; Codex reviews it and selectively merges applicable rules
into `AGENTS.md`.

`project sync` refreshes the reference and records the available template hash.
It never edits or replaces `AGENTS.md`. If the local template was independently
modified, it preserves that change and asks you to review it before syncing.

## Create the private repository

Create a private GitHub repository named `iamdevlinph/codex-kit`, copy this
directory into it, then commit and push it. Keep the package name and GitHub
namespace lowercase.

GitHub Packages publishes the first version privately and links it to the
repository through `package.json`.

## Publish

The workflow publishes whenever a version tag matching `package.json` is pushed:

```sh
pnpm version patch
git push origin main --follow-tags
```

The workflow installs the pinned pnpm version, uses the frozen lockfile, runs
strict type checking and tests, builds the CLI, and publishes with its
repository-scoped `GITHUB_TOKEN`. No publishing token is stored in the
repository.

## Authenticate a device

GitHub Packages currently requires a classic personal access token for local
package clients. Give it `read:packages`, then authenticate without committing
the token:

```sh
pnpm login --scope=@iamdevlinph --auth-type=legacy --registry=https://npm.pkg.github.com
```

## Configure the orchestrator

After installing the kit on a device, run:

```sh
codex-kit global configure
```

This applies the defaults:

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "high"
```

Override them explicitly when needed:

```sh
codex-kit global configure \
  --orchestrator gpt-5.6-luna \
  --reasoning-effort medium
```

The command edits only top-level `model` and `model_reasoning_effort` entries in
`${CODEX_HOME:-~/.codex}/config.toml`; it leaves project trust, plugins, MCP
servers, and other settings untouched.

Inspect the active global setup:

```sh
codex-kit global list
```

The summary shows the Codex home, config path, orchestrator, reasoning effort,
global routing status, and every installed custom agent with its model and
whether codex-kit manages it. It does not dump unrelated configuration values or
potential secrets.

## Check for a new version

```sh
codex-kit version check
```

The command uses the authenticated GitHub Packages registry and reports the
installed and latest versions. When an update exists, it prints:

```sh
pnpm add --global @iamdevlinph/codex-kit@latest
codex-kit global install
```

The check is explicit rather than automatic, so normal project commands do not
add network latency or fail when the registry is temporarily unavailable.

## Install on a new device

```sh
pnpm dlx @iamdevlinph/codex-kit global install
pnpm dlx @iamdevlinph/codex-kit global configure
```

Use a different Codex home when needed:

```sh
pnpm dlx @iamdevlinph/codex-kit global install --codex-home /path/to/.codex
pnpm dlx @iamdevlinph/codex-kit global configure --codex-home /path/to/.codex
```

The installer backs up replaced files, preserves modified managed files unless
`--force` is supplied, records ownership in `.codex-kit-state.json`, and can be
reversed:

```sh
pnpm dlx @iamdevlinph/codex-kit global uninstall
```

An existing unmanaged `~/.codex/agents/commit-pusher.toml` is never deleted
silently. The installer warns if it finds one; remove it manually after checking
that no other setup owns it.

## Apply to a project

For a new project without `AGENTS.md`:

```sh
cd /path/to/project
pnpm dlx @iamdevlinph/codex-kit project init
```

Add repository-specific rules only below `# Project-Specific Instructions`.
The generated `TEMPLATE_AGENTS.md` is a reference file; it is not automatically
merged into `AGENTS.md`.

After publishing template changes:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest project sync
codex-kit project status
```

Then ask Codex to compare `TEMPLATE_AGENTS.md` with `AGENTS.md` and merge only
the reusable rules that apply to the repository. After reviewing the result,
run:

```sh
codex-kit project mark-applied
```

The prompt printed by `project sync` is:

```text
The project's TEMPLATE_AGENTS.md was refreshed from codex-kit. Compare it with
AGENTS.md and merge only new or changed reusable guidelines that apply to this
repository. Preserve project-specific instructions and existing adaptations.
Do not replace AGENTS.md wholesale. If a template rule conflicts with a local
rule, keep the local rule and report the conflict. Summarize what was added,
updated, skipped, or adapted, and why. When finished, run codex-kit project
mark-applied.
```

For frequent multi-project updates, install the CLI once and reuse it:

```sh
pnpm add --global @iamdevlinph/codex-kit
codex-kit global install
codex-kit project sync --cwd /path/to/project-a
codex-kit project sync --cwd /path/to/project-b
```

## Propagate shared changes downstream

Choose the narrowest scope that fits the rule:

| Change | Source of truth | Propagation |
| --- | --- | --- |
| Personal behavior for every repository | Global routing or agent assets | Run `global install` on each device |
| Reusable project convention | `assets/TEMPLATE_AGENTS.md` | Publish a new kit version, then run `project sync` and reconcile each project |
| Project-specific command, path, integration, or exception | Project `AGENTS.md` | Keep only in that project |

Do not place the complete template in global `~/.codex/AGENTS.md`. It contains
project and stack conventions that may be wrong for unrelated repositories. The
global file should remain a small personal baseline. The packaged template is
versioned and copied into each project's local reference file.

### When a project reveals a template-worthy guideline

Yes: add the generalized rule to `assets/TEMPLATE_AGENTS.md` in the private
`codex-kit` repository. Do not copy a whole project-specific `AGENTS.md` into
the central template.

Use this workflow:

1. Add any immediately needed project-specific wording to the current
   project's `AGENTS.md`.
2. Ask Codex to add a generalized, project-agnostic version to that project's
   `TEMPLATE_AGENTS.md`. Review the diff and remove local paths, commands,
   integrations, and exceptions.
3. Copy or merge only that template change into `assets/TEMPLATE_AGENTS.md` in
   the private `codex-kit` repository.
4. Test, version, and publish the package.
5. Run `project sync` in each downstream project.
6. Ask Codex to reconcile each project's `AGENTS.md`, then run
   `project mark-applied`.

A guideline is template-worthy when it describes behavior you want in future
projects regardless of their exact file layout. Details that mention one
project's functions, paths, vendors, or architecture remain project-specific.

### Publish an update

From the private `codex-kit` repository:

```sh
# Edit assets/TEMPLATE_AGENTS.md, assets/SUBAGENT_ROUTING.md, or assets/agents/*
pnpm run typecheck
pnpm test
pnpm version patch # use minor or major when appropriate
git push origin main --follow-tags
```

The tag publishes the new package version through GitHub Actions.

### Update devices and projects

Update global agents and routing once per device when those assets changed:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest global install
```

Refresh the template reference in each downstream project:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest project sync --cwd /path/to/project
```

For many projects, install the CLI once and keep a local path list:

```sh
pnpm add --global @iamdevlinph/codex-kit

while IFS= read -r repo; do
  [ -n "$repo" ] && codex-kit project sync --cwd "$repo"
done < ~/.config/codex-kit/projects.txt
```

`project sync` updates only `TEMPLATE_AGENTS.md` and the project state file. It
never edits `AGENTS.md`. If the local template was independently modified, it
preserves the change and asks you to review it before using `--force`.

`project status` compares the installed template, the local reference, and the
last applied hash. `project mark-applied` records the local template hash after
Codex has completed the semantic merge; it does not modify `AGENTS.md` or push
anything to the central repository.

## Local verification

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run pack:check
```

The published package has no runtime dependencies, uses only Node.js
standard-library modules, and supports Node 20+.

## References

- [Codex custom subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex `AGENTS.md` discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [GitHub Packages npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [Publishing packages with GitHub Actions](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)
