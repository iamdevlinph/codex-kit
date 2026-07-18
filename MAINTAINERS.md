# Codex-Kit Maintainer Guide

Private repository instructions for developing and publishing the public
`@iamdevlinph/codex-kit` npm package. User-facing commands belong in
`README.md`; do not put repository administration, publishing credentials, or
private operational details there.

## Visibility boundary

The GitHub repository is private, while the npm package is public. Everything
listed by `pnpm run pack:check` is publicly downloadable.

npm always includes the root `README.md`, `package.json`, and executable named by
`bin`, regardless of the `files` allowlist. `MAINTAINERS.md`, source, tests, and
repository instructions must remain outside that allowlist.

The repository URL is visible in npm metadata because Trusted Publishing
requires `package.json#repository.url` to match the GitHub repository exactly.
npm does not generate provenance attestations for packages published from a
private repository.

## Development setup

The repository pins pnpm `11.5.2`, TypeScript `7.0.1-rc`, and Node.js type
definitions for Node 20. `bin/` is generated and untracked.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec tsc --version
pnpm run typecheck
```

The compiler must report `7.0.1-rc`. Open the repository root in the editor so
it discovers `tsconfig.json`.

## Repository setup

Create a private GitHub repository named `iamdevlinph/codex-kit`. Keep the npm
package name and GitHub namespace lowercase.

The package remains `UNLICENSED`; choose a license separately before granting
others permission to reuse or redistribute its contents.

## Initial npm publication

The package must exist before npm can attach a Trusted Publisher. For a new
package, publish the initial version once from an authenticated device:

```sh
npm login --auth-type=web
pnpm run typecheck
pnpm test
pnpm run pack:check
pnpm publish --access public --no-git-checks
```

The initial publication of this package is already complete. Do not repeat this
step for normal releases.

## Configure Trusted Publishing

Open the package on npmjs.com and configure **Settings → Trusted Publisher**:

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `iamdevlinph` |
| Repository | `codex-kit` |
| Workflow filename | `publish.yml` |
| Environment | Leave blank |
| Allowed action | `npm publish` |

Enter only `publish.yml`, not `.github/workflows/publish.yml`.

No publishing token or repository secret is required. Trusted Publishing uses
short-lived OIDC credentials. Do not add `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or a
package PAT.

The workflow requires a GitHub-hosted runner, `id-token: write`, Node 22.14 or
newer, and npm 11.5.1 or newer. The current workflow uses Node 24 and npm 11.5.1.

## Publish a release

Before versioning:

```sh
pnpm run typecheck
pnpm test
pnpm run pack:check
```

Inspect the dry-run contents. They should contain only:

- `assets/agents/*.toml`
- `assets/SUBAGENT_ROUTING.md`
- `assets/TEMPLATE_AGENTS.md`
- `bin/codex-kit.js`
- `bin/routing-hook.js`
- `package.json`
- `README.md`

`MAINTAINERS.md`, `AGENTS.md`, `src/`, tests, lockfiles, generated test output,
credentials, and local backups must not appear.

Create and push the version commit and tag:

```sh
pnpm version patch # use minor or major when appropriate
git push origin main --follow-tags
```

The tag must match `package.json` as `v<version>`. The workflow checks this
before publishing.

If a workflow fails because of external configuration and no source change is
needed, rerun the failed job. A rerun uses the original tag and commit. If code
or workflow changes are required, publish a new version unless the failed tag
was never released and is intentionally deleted and recreated.

## Promote a reusable guideline

Choose the narrowest scope:

| Change | Source of truth | Propagation |
| --- | --- | --- |
| Personal behavior for every repository | Global routing or agent assets | Run `global install` on each device |
| Reusable project convention | `assets/TEMPLATE_AGENTS.md` | Publish a version, then sync and reconcile projects |
| Project-specific command, integration, or exception | Project `AGENTS.md` | Keep it only in that project |

Do not put the complete project template in global `~/.codex/AGENTS.md`. Keep
the global file as a small personal baseline.

When a project reveals a reusable guideline:

1. Add any immediately needed project-specific wording to that project's
   `AGENTS.md`.
2. Generalize the rule in the project's `TEMPLATE_AGENTS.md`, removing local
   paths, commands, integrations, and exceptions.
3. Merge only that generalized change into `assets/TEMPLATE_AGENTS.md` here.
4. Run the full verification commands and publish a new package version.
5. Run `project sync` in downstream projects.
6. Ask Codex to reconcile each `AGENTS.md` and applicable project skills under
   `.agents/skills`, review the result, then run `project mark-applied`.

A guideline is template-worthy only when it applies across future projects
regardless of their exact stack or file layout.

## Update devices and downstream projects

`global configure` manages only the top-level `model`,
`model_reasoning_effort`, and `plan_mode_reasoning_effort` keys. It backs up
`config.toml` and stores the original managed values in installer state so
`global uninstall` can restore them without rolling back unrelated later edits.

Global routing keeps the Sol root as planner/orchestrator. The routing file maps
task shapes to exact agent roles; each role's TOML independently selects its
model and reasoning effort. A `UserPromptSubmit` hook injects the current policy
on each turn, and `SubagentStart` briefs delegated workers. Balanced routing
allows the root to perform clear changes spanning roughly three files directly.
Automatic delegation is reserved for broad discovery, large implementation or
debugging work, and high-risk review. `quick-implementer` remains available for
manual use. Implementation children edit directly without recursively
delegating, and the root reuses their test evidence instead of repeating full
validation by default.

The default root uses Sol-low outside Plan Mode and Sol-high in Plan Mode.
Automatic roles use Terra-medium for exploration, Luna-high for implementation,
and Sol-high for review. Delegation permits one 60-second wait followed by one
status request; role deadlines are three minutes for exploration, review, and
manual quick work, and five minutes for implementation. Stop validation after
two minutes without output unless project guidance documents a longer runtime.
Never run matching parent and worker validation concurrently.

`global install` merges only codex-kit's handlers into `~/.codex/hooks.json` and
preserves unrelated handlers. `global uninstall` removes those handlers and the
managed hook script. Keep routing generic and role-based rather than referring
to a model in the policy.
New or changed command hooks require Codex's normal one-time trust review and a
new task or client restart before testing them.

Refresh global assets once per device when agent or routing files change:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest global install
```

Refresh each project's template reference:

```sh
pnpm dlx @iamdevlinph/codex-kit@latest project sync --cwd /path/to/project
```

`project sync` updates only `TEMPLATE_AGENTS.md` and project state. It never
edits `AGENTS.md` or `.agents/skills`; its printed reconciliation prompt asks
Codex to make and validate any applicable instruction or skill changes.

## Verification

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run pack:check
```

## References

- [Publishing scoped public npm packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm package file inclusion](https://docs.npmjs.com/files/package.json/)
