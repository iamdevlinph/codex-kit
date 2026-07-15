# `@iamdevlinph/codex-kit`

Portable Codex setup for new devices and multiple projects. It provides:

- four custom subagents: explorer, quick implementer, implementer, and reviewer
- global subagent-routing guidance without a `commit-pusher`
- a reusable, stack-neutral `AGENTS.md` template
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

`npm install --global @iamdevlinph/codex-kit@latest` works as an alternative.
For one-off use without a global installation, prefix a command with
`pnpm dlx @iamdevlinph/codex-kit@latest`.

`global install` copies reusable agents to `${CODEX_HOME:-~/.codex}` and
maintains a marked routing section in the global `AGENTS.md`.

`global configure` sets these defaults while preserving unrelated settings:

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "high"
```

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

The summary shows the Codex home, orchestrator, reasoning effort, routing
status, and installed custom agents without dumping unrelated configuration.

Uninstall package-managed global files:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest global uninstall
```

Modified managed files are preserved unless `--force` is supplied. An existing
unmanaged `commit-pusher.toml` is reported but never silently deleted.

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

For a project without `AGENTS.md`:

```sh
cd /path/to/project
pnpm dlx @iamdevlinph/codex-kit@latest project init
```

This creates:

- `AGENTS.md`, containing the reusable defaults and a project-specific section
- `TEMPLATE_AGENTS.md`, a local reference copy used for future comparisons
- `.codex-kit-state.json`, reconciliation bookkeeping

The template reference is not an active Codex instruction file. Add repository
commands, paths, architecture, integrations, and exceptions to the
project-specific section of `AGENTS.md`.

### Generate project-specific guidance

For an existing project, use this prompt after initialization. For a new
project, scaffold the initial stack first.

```txt
Explore this repository before changing code. Identify its languages,
frameworks, package manager, scripts, directory structure, styling and component
systems, form and validation libraries, data-access patterns, testing tools, and
generated files.

Update only the project-specific section of AGENTS.md with concise guidelines
derived from the repository's actual dependencies, configuration, scripts, and
established code patterns. Include exact verification commands. Preserve the
managed shared-template block, avoid speculative preferences, and do not add
rules for tools the repository does not use.
```

## Synchronize template updates

Refresh a project's local template reference:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest project sync
codex-kit project status
```

`project sync` never edits `AGENTS.md`. It prints a prompt asking Codex to merge
only applicable reusable changes while preserving local adaptations. After
reviewing the semantic merge, record the applied template hash:

```sh
codex-kit project mark-applied
```

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
- Codex with custom subagent support

The published package has no runtime dependencies and uses only Node.js
standard-library modules.

## License

`UNLICENSED`. Public availability on npm does not grant permission to reuse or
redistribute the package beyond applicable law and npm's service terms.

## References

- [Codex custom subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex `AGENTS.md` discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
