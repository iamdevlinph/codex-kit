# Codex-Kit Repository Instructions

## Purpose and sources of truth

- This public repository maintains the `@iamdevlinph/codex-kit` package.
- `AGENTS.md` contains instructions for maintaining this repository.
- The root `TEMPLATE_AGENTS.md` is the canonical reusable template source.
  Every build copies it to `assets/TEMPLATE_AGENTS.md` for distribution to
  downstream projects; neither template is this repository's active
  instructions.
- Keep reusable template rules project-agnostic. Project names, local paths,
  integrations, and exceptions belong only in the affected project's `AGENTS.md`.

## Working conventions

- Follow the repository's existing style, structure, architecture, and stronger
  local instructions. Match nearby code before introducing new patterns,
  abstractions, dependencies, or file organization.
- Use intent-revealing domain names. A reader should understand what a variable
  contains or what a helper guarantees at the call site without opening its
  implementation. Avoid vague transformation names such as `normalized`,
  `processed`, `result`, or `data` when a value- or behavior-specific name is
  available. Prefer clear structure, and simplify or extract complex logic before
  relying on comments. Use comments to explain non-obvious purpose, constraints,
  invariants, tradeoffs, or workarounds, not to narrate statements.
- Keep changes minimal, localized, and limited to the request. Do not reorganize
  major modules, change architecture, or introduce a new project paradigm without
  explicit approval.
- Complete every new or materially changed feature through this semantic pass:
  implement and stabilize it, map each responsibility to its final file, extract
  independently understandable concerns, validate the decomposed implementation,
  then hand it off to `code-reviewer`. Pages, routes, controllers, commands, and
  entrypoints contain composition and orchestration only. Web page files may keep
  framework exports, metadata, loading, guards, page-level state, minimal layout
  wrappers, and imported child composition, but not child components, substantial
  UI sections, or domain logic. Independently changeable UI concerns (tables,
  filters, forms, dialogs, and sections) belong in descriptive feature-local
  component files. Hooks, schemas, data access, transformations, and domain logic
  move out of presentation files when independently testable or when they obscure
  the component's primary responsibility. Avoid generic `utils`, `helpers`, or
  `components` dumping grounds; filenames must identify owned behavior. Keep
  components feature-local by default; promote them to shared/design-system
  locations only when reused across features or explicitly global primitives.
  Tiny private helpers or markup may remain inline only when inseparable from the
  file's single responsibility. Do not broaden an unrelated small fix, but leave
  any new or materially changed feature decomposed. Every completed feature gets
  an automatic `code-reviewer` structure review; exceptions require a concrete
  framework or tooling constraint identified in the handoff.
- Before changing code, inspect the manifest, configuration, scripts, and nearby
  files to identify the actual stack, commands, and conventions.
- Keep identical configuration and behavior in one source of truth at the
  narrowest shared scope. Reuse that owner across callers or features; create a
  separate implementation or instance only when scope, lifecycle, or behavior
  genuinely differs. Reuse existing constants, schemas, enums, shared types,
  and components before creating duplicates. Add reusable domain values at
  their existing source of truth rather than scattering magic strings.
- Replace numeric literals that encode domain rules, limits, durations, units,
  or protocol values with descriptively named constants. Universally obvious
  structural values, such as basic indexes or empty-state values, may remain
  inline.
- Promote repeated closed-set domain values used in production control flow to
  feature-owned immutable runtime constants. Derive static types from that
  runtime source; keep incidental presentation, protocol, route, environment,
  and test-contract strings inline.
- Keep naming conventions consistent within each code-owned object, schema,
  type, and module. Preserve externally defined names at the boundary, then map
  them once to the repository's internal convention.
- Preserve user changes and unrelated dirty state. Never revert them without an
  explicit request, and never run destructive Git commands such as
  `git reset --hard` or `git checkout --` without explicit approval.
- Use `apply_patch` for manual edits and prefer `rg` or `rg --files` for searches.

## Implementation constraints

- Keep the published CLI compatible with Node.js 20 or newer and prefer Node
  standard-library APIs. Maintainer tooling and tests run on Node.js 24.
- Use the pnpm version pinned in `packageManager`; do not create an npm lockfile.
- When adding or updating dependencies, pin exact versions rather than ranges.
  With pnpm, use `pnpm add -E` (`--save-exact`).
- Keep the CLI source in `src/` under strict TypeScript. `bin/` is generated by
  `pnpm run build`; it must not be edited or tracked.
- Keep the exact TypeScript RC version pinned in `devDependencies` until an
  explicit upgrade is requested. Invoke it through `pnpm exec tsc`, never a
  globally installed compiler.
- Do not add a dependency unless the requested behavior cannot reasonably be
  implemented with the standard library.
- Preserve user-owned files and unrelated configuration. Back up files before a
  managed replacement and never silently overwrite locally modified content.
- `global install` configures the default root model and reasoning settings;
  `global configure` remains available for explicit overrides.
- `project sync` may refresh `TEMPLATE_AGENTS.md` and project state, but must not
  merge into or replace a project's `AGENTS.md`.
- `project mark-applied` is bookkeeping only; it must not claim to validate the
  semantic merge or modify project instructions.
- Do not add a `commit-pusher` role or automate Git publishing.

## Change requirements

- Keep public CLI usage in `README.md` and development, publishing, and
  template-promotion instructions in `MAINTAINERS.md`. Keep both synchronized
  with behavior changes.
- `MAINTAINERS.md`, repository instructions, source, and tests must remain
  outside the public npm package. Verify the tarball contents before release.
- Select tests for regression value rather than exhaustive coverage. Cover
  changed observable contracts, reported regressions, meaningful boundaries,
  and plausible costly failures, especially security, trust-boundary, or
  data-loss risks.
- Use one representative case per equivalent behavior class. Skip redundant
  permutations, implementation-detail assertions, and contrived or unreachable
  states unless a requirement or past defect justifies them. Do not introduce a
  test framework solely to satisfy this rule; if automated coverage is
  impractical, explain why and perform the strongest targeted verification.
- Treat existing tests as regression contracts. Preserve their assertions unless
  the requested behavior intentionally changes. When behavior changes, update
  only the affected tests and add coverage for the new contract; never weaken or
  delete tests merely to make the suite pass.
- Run the smallest targeted verification that meaningfully validates a change
  before the full required checks. Avoid broad commands and use the repository's
  documented package manager and scripts.
- Do not change dependencies, global tools, or the environment by default.
- Run `pnpm run typecheck`, `pnpm test`, and `pnpm run pack:check` before
  declaring a change complete.

## Template and release workflow

- When the staged template is refreshed or `codex-kit project status` requires
  reconciliation, use the global `$codex-kit-reconcile-agents` skill. Preserve
  this file's organization and local rules, merge only applicable guidance, do
  not copy the full template or add managed markers, keep critical always-on
  rules here, and mark applied only after reconciliation and validation succeed.
- When promoting a project-discovered guideline, generalize and review the rule
  before merging it into the root `TEMPLATE_AGENTS.md`; the next build copies
  the updated source into `assets/TEMPLATE_AGENTS.md`.
- A template update requires a new package release before downstream
  `project sync` commands can receive it.
- The release tag must match `package.json` as `v<version>`.
- Never commit, tag, push, publish, or create a release unless the user explicitly
  requests that operation in the current task.
- Never store credentials, npm tokens, or personal access tokens in this
  repository.
