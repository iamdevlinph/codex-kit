# Shared Agent Defaults

Guidelines for coding agents working in this repository.

This managed section comes from the private `@iamdevlinph/codex-kit` package.
Adapt stack details, commands, directory names, product context, and local
conventions in the project-specific section outside the managed markers.

## Project Context

- Treat this file as a reusable default template for new projects.
- Adapt stack-specific commands and directory names to the actual repo before
  relying on them.
- Keep product decisions, business rules, and naming aligned with `PLANS.md`
  when that file exists.
- Use `PLANS.md` for durable product context: planned features, business rules,
  feature sequencing, deferred requirements, prior product decisions, and
  durable implementation decisions.
- Use `AGENT_HANDOFF.md` only for optional, temporary continuation context when
  work is interrupted or unfinished.
- Use `RESUME.md` for completed, resume-worthy project accomplishments that may
  be useful for future CV/resume writing.
- Do not mix the purposes of `PLANS.md`, `AGENT_HANDOFF.md`, and `RESUME.md`.

## Template Maintenance

- Project repositories should normally use `AGENTS.md` as the active
  project-specific agent instruction file.
- The source-of-truth template is `assets/TEMPLATE_AGENTS.md` in the private
  `codex-kit` repository and published package.
- A project-local `TEMPLATE_AGENTS.md` is optional and should be treated only as
  a temporary sync/reference copy unless the user says otherwise.
- Do not assume changes to a project's `AGENTS.md` automatically update the
  packaged source template.
- Do not require updating a project-local `TEMPLATE_AGENTS.md` after `AGENTS.md`
  has already been updated.
- Keep project-specific context outside the managed block in project
  `AGENTS.md`; keep reusable cross-project instructions in the packaged
  `TEMPLATE_AGENTS.md`.
- If a user request appears to introduce a general workflow preference,
  cross-project convention, agent behavior rule, tooling default, safety rule, or
  instruction that would apply to future projects, tell the user it looks like a
  template-level change.
- When appropriate, update the current project's `AGENTS.md` or local active
  agent instruction file to reflect the requested behavior.
- After making a template-level or likely-template-level change in a project,
  remind the user to update `assets/TEMPLATE_AGENTS.md` in the private
  `codex-kit` repository, publish a new version, and sync affected projects.
- When reminding the user to update the packaged `TEMPLATE_AGENTS.md`, be specific
  about where and how the change should be applied:

  - say whether it should be added as a new bullet, new subsection, or new
    section
  - name the most likely section where it belongs
  - mention whether it updates an existing rule or introduces a new rule
  - include the exact wording or a concise patch-style snippet the user can copy
    into the global template

- If the change updates an existing template rule, describe the old behavior and
  the new behavior clearly.
- If the change introduces a new template rule, explain why it is reusable across
  projects.
- When bringing global template changes into another project, merge the new
  reusable instructions into that project's `AGENTS.md` while preserving
  project-specific context. Do not blindly overwrite `AGENTS.md`.

## Template Sync Prompt

When `codex-kit project sync` stages `TEMPLATE_AGENTS.md` beside an existing
unmanaged `AGENTS.md`, use this prompt:

```txt
Convert this repository to the codex-kit managed AGENTS.md layout. Put the exact
contents of TEMPLATE_AGENTS.md between
<!-- BEGIN codex-kit:shared-template --> and
<!-- END codex-kit:shared-template -->. Preserve every repository-specific
instruction from the current AGENTS.md after the managed block under
# Project-Specific Instructions, remove only duplicate shared rules, and do not
change project behavior. Afterward, summarize what was preserved and whether any
local rules appear template-worthy.
```

## Core Operating Principles

- Follow the existing project code style, naming conventions, file structure,
  and implementation patterns.
- Match nearby code before introducing a new pattern, abstraction, dependency,
  or file organization.
- Consistency with the current codebase takes priority over personal preference
  or generic best-practice refactors.
- Keep changes minimal, localized, and scoped to the requested task.
- Do not make sweeping architectural changes unless explicitly requested.
- Do not refactor core systems, reorganize major modules, introduce new
  frameworks, or change project paradigms as part of a feature request unless
  the user explicitly approves that scope.
- Work within the existing architecture, even when it is imperfect.
- If the current design or architecture prevents the requested task from being
  completed safely:

  - stop before introducing an architectural workaround
  - clearly explain the limitation
  - propose the smallest viable design change as a suggestion
  - wait for explicit approval before proceeding with that larger change

- When in doubt, prioritize consistency over improvement, avoid assumptions about
  intended architecture changes, and escalate blockers instead of bypassing them.

## Commands And Verification

- Do not run broad or unnecessary terminal commands by default.
- Coding agents may run targeted verification commands after making changes when
  needed to confirm the code is valid and working.
- Prefer the smallest verification command that meaningfully validates the
  change before escalating to broader checks.
- Do not run package-management commands that change dependencies by default,
  including `pnpm install`, `pnpm add`, `pnpm remove`, `npm install`, or global
  tool installs.
- Do not run dependency-changing or environment-changing commands by default.
- Do not run local or remote database commands by default, including Wrangler D1
  commands, migration generation, migration application, or SQL inspection,
  unless the task explicitly requires them.
- When a change normally requires verification, run the appropriate targeted
  verification command when practical, and still report what was run and what
  it verified.
- If commands are needed, prefer `pnpm` scripts and `pnpm exec ...` over direct
  `npm`, `npx`, or global tool usage.
- Use `pnpm exec tsgo --noEmit` for targeted TypeScript verification.
- Use `pnpm exec biome check <paths>` for targeted lint, format, and import-sort
  checks when relevant.
- Use `pnpm exec biome format --write <paths>` only for intentional
  formatting-only passes.
- Use `pnpm run build` for broader app-integrity verification after larger
  changes or changes involving server functions, routes, schemas, or shared
  state.

## Structure

- Prefer a feature-based codebase structure over type-based or layer-only
  grouping.
- Keep each feature self-contained as much as practical, including its
  components, hooks, schemas, state, and utilities.
- Put utilities that are tightly coupled to a single feature in that feature's
  own `utils` folder.
- If a utility is reused a lot or is not tightly coupled to one feature, move it
  to a global `src/utils` folder.
- Prefer one file per method or primary export when practical.
- Keep file names aligned with the main export, using kebab-case unless the repo
  already follows another consistent convention.
- Split large files aggressively when a file becomes hard to scan, navigate, or
  reason about.
- Keep route/page components thin when they become complex. Move React Query
  reads into colocated `useXQuery` hooks, related mutations into
  `useXMutations` hooks, and loading/error/empty/list branching into small
  content components.
- Centralize query keys and cache invalidation inside feature-level query and
  mutation hooks instead of duplicating them inside route/page components.
- Leave simple pages unchanged; only extract when readability or reuse
  improves.
- Keep edits scoped to the requested feature and avoid unrelated refactors.
- Do not reorganize feature directories, shared modules, route structure, server
  function boundaries, schema layout, or state-management patterns unless the
  requested change specifically requires it and the user approves that broader
  scope.

## Coding Style

- Prefer `export const ComponentName = (...) => {}` for new React components.
- Avoid `export function` for new components unless matching nearby existing code
  is more important.
- Prefer small focused files over mixed-responsibility files.
- Break down large page, modal, workflow, schema, and server-logic files into
  smaller units when readability improves.
- Prefer shared components before creating new primitives.
- Match nearby implementation patterns even when a different abstraction might
  seem cleaner, unless the user explicitly asks for a refactor.
- Use TypeScript deliberately. Avoid loosely shaped objects when a named type,
  union, or schema would make behavior clearer.
- Prefer existing exported constants, enum-style objects, literal unions, schema
  enum values, and generated enums over hardcoded string literals when the repo
  already defines them.
- Before adding a new string literal for a status, type, variant, category,
  action, route key, permission, feature flag, lifecycle state, filter, event
  name, or similar domain value, search nearby constants, schemas, enums, and
  shared types for an existing source of truth.
- Use the existing source of truth where practical, for example `STATUS.ACTIVE`
  instead of `"active"` or `USER_ROLE.ADMIN` instead of `"admin"`.
- When adding a new domain value, update the shared source of truth first, then
  reference that value from UI, validation, server logic, tests, and seed data.
- Only introduce a new hardcoded literal when it is truly one-off display text,
  test fixture text, or there is no existing reusable constant/type/schema value.

## Styling And UI

- In web projects that use Tailwind CSS, prefer Tailwind utility classes for
  styling unless the repo already has a different established styling system.
- In React projects that use Tailwind CSS, use a shared `cn(...)` utility for
  conditional, dynamic, or merged `className` values.
- Do not use template literals, inline conditional string assembly, array
  `.filter(Boolean).join(" ")`, or ad hoc class merging when `cn(...)` would be
  clearer.
- Keep base UI components flexible by accepting `className` and merging it with
  default classes through `cn(...)`.
- In projects that use `shadcn`, prefer existing `shadcn` components and
  project-local shared components before building custom UI primitives.
- If a requested UI feature is supported by an official `shadcn` component that
  is not installed yet, install that component instead of re-implementing it
  from scratch unless the repo already has a stronger local pattern.
- Do not edit generated or shared `shadcn` UI primitives unless the requested
  change specifically requires it or the repo has established that local
  customization is acceptable.
- Keep styling consistent with the existing design system, spacing scale,
  radius, variants, and component patterns.

## Data And Validation

- Update schema definitions first, then generate any required migrations or
  derived types.
- Do not manually edit generated migration snapshots unless explicitly
  requested.
- Use explicit validation for form and server inputs.
- Invalidate or refresh relevant cached data after successful mutations when the
  stack uses client-side caching.

## Forms

- In React projects, all forms must use `react-hook-form` for form state and
  submission handling unless the user explicitly requests a different form stack.
- In React projects, form validation must use Zod unless the repo already has a
  stronger established validation pattern.
- Every input, select, textarea, checkbox, radio group, switch, date picker,
  custom field, and reusable form field inside a `react-hook-form` form must be
  wired through `<Controller />`.
- Do not use `register(...)` directly for form inputs unless the user explicitly
  requests an exception.
- Prefer reusable form wrapper components for project forms, such as
  `FormInput`, `FormSelect`, `FormTextarea`, `FormCheckbox`, `FormRadioGroup`,
  `FormSwitch`, and similar project-local abstractions.
- Form wrapper components should own the repeated `Controller` wiring, label,
  description, validation message, invalid state, and accessibility behavior
  where practical.
- Keep shared/base UI inputs form-agnostic. Bind them to `react-hook-form`
  through form wrapper components instead of coupling base UI primitives directly
  to form state.
- Prefer deriving form value types from Zod schemas when practical.
- Keep validation messages, invalid states, labels, descriptions, and
  accessibility attributes consistent across reusable form wrappers.

## Project Planning

- Always read `PLANS.md` before implementing product-facing features when it
  exists.
- After implementing a product-facing feature, always revisit the relevant
  `PLANS.md` chunk or checklist item and update its status or note whether it
  is implemented in code, verified, deferred, or still pending.
- Use `PLANS.md` as the main durable project context across coding-agent
  sessions.
- Use `PLANS.md` for product context, feature sequencing, business rules,
  deferred requirements, prior decisions, current priorities, feature scope, and
  durable product or implementation decisions.
- Any requirement addition, requirement change, product decision, or deferred
  scope decision raised during implementation must also be recorded in
  `PLANS.md`.
- If a new feature, functionality, workflow, permission rule, or backlog item
  is added to `PLANS.md`, record it under the most relevant feature
  chunk/checklist section, not only in the narrative summary sections.
- If a `PLANS.md` feature chunk or checklist item has been implemented and
  verified to be working, update that item to checked in `PLANS.md`.
- If later manual testing shows the feature is not actually working as expected,
  the user may revert the `PLANS.md` check back to unchecked.
- Keep `PLANS.md` detailed enough that a fresh coding-agent session can
  understand the product direction without relying on prior terminal context.
- Do not use `PLANS.md` for temporary handoff notes, command results,
  half-finished implementation state, debugging scratch notes, or local
  work-in-progress details unless the information represents a durable project
  decision.
- Do not implement all of `PLANS.md` unless explicitly asked. Implement only the
  requested feature.
- If `PLANS.md` and the current user request conflict, follow the current user
  request and update `PLANS.md` to reflect the new decision.

## Session Continuity

- Use `PLANS.md` as the normal continuity source for product-facing work.
- `AGENT_HANDOFF.md` is optional and should only be created when useful for
  unfinished or interrupted work.
- Do not create `AGENT_HANDOFF.md` for every task by default.
- Create or update `AGENT_HANDOFF.md` when:

  - work is stopped before the requested change is complete
  - there are partially edited files that need explanation
  - verification has not been completed
  - the next agent session needs a specific continuation note that does not
    belong in `PLANS.md`
  - there is a pending template sync reminder the user might otherwise forget

- At the start of a session, read `AGENT_HANDOFF.md` if it exists.
- If `AGENT_HANDOFF.md` exists, treat it as temporary continuation context, not a
  permanent history log.
- Keep `AGENT_HANDOFF.md` focused on the current or most recent unfinished work
  state.
- Prefer rewriting, pruning, clearing, or deleting `AGENT_HANDOFF.md` after the
  interrupted work is completed and durable decisions have been moved into
  `PLANS.md`, `RESUME.md`, or the codebase.
- Preserve only information that helps the next session continue:

  - the latest user request
  - the current implementation goal
  - current status
  - next step
  - files recently changed or inspected
  - important implementation decisions
  - commands suggested for manual verification, plus any commands run with
    explicit approval and their results
  - known remaining work
  - blockers, assumptions, or follow-up questions

- Remove stale notes once they are no longer useful for continuation.
- Do not use `AGENT_HANDOFF.md` as a verbose transcript, changelog, resume log,
  or long-term project plan.
- If `AGENT_HANDOFF.md` and the current code disagree, inspect the code and
  update `AGENT_HANDOFF.md` rather than assuming the summary is correct.

## Resume Notes

- Maintain `RESUME.md` for CV/resume-worthy project accomplishments only.
- Create `RESUME.md` if it does not exist.
- `RESUME.md` exists to help the project owner remember what they built,
  improved, automated, designed, debugged, shipped, or meaningfully changed in
  this project for future resume/CV, portfolio, case-study, or interview use.
- Append new completed work to `RESUME.md`; do not replace prior entries.
- Keep `RESUME.md` entries accomplishment-oriented, not task-log-oriented.
- Prefer entries that capture:

  - shipped features
  - meaningful technical decisions
  - architecture or data-model changes
  - performance, reliability, security, or UX improvements
  - developer tooling or workflow improvements
  - integrations, automation, migrations, or refactors with clear value
  - measurable outcomes when available

- Do not put transient implementation state, debugging scratch notes, unfinished
  tasks, or session handoff details in `RESUME.md`.
- When a completed change would be useful for future resume/CV writing, add a
  concise accomplishment-oriented entry to `RESUME.md`.
- Write `RESUME.md` entries in a way that can later be converted into resume
  bullets, but do not exaggerate impact or invent metrics.

## Repo Safety

- Do not revert user changes unless explicitly requested.
- Work with dirty git state and ignore unrelated changes.
- Do not run destructive git commands such as `git reset --hard` or
  `git checkout --` unless explicitly requested.
- Use `apply_patch` for manual edits.
- Prefer `rg` and `rg --files` for searching only when the user has approved
  command use for the task; otherwise inspect files through available editor or
  file-reading context.
- Keep final responses concise and include what was verified, or what manual
  verification commands were suggested when commands were not run.

## After Changes

After making changes, summarize:

1. files changed
2. behavior added
3. verification commands suggested for the user to run manually, or commands run
   only with explicit approval and their results
4. any related `PLANS.md` items considered but deferred
5. whether `PLANS.md` was updated with durable product or implementation context
6. whether any implemented-and-verified `PLANS.md` checklist items were marked
   complete
7. whether `AGENT_HANDOFF.md` was created, updated, cleared, or left unnecessary
8. whether `RESUME.md` was updated with any resume-worthy completed work
9. whether the change appears template-level and should also be applied to
   `assets/TEMPLATE_AGENTS.md` in the private `codex-kit` repository
10. if template-level, exactly where in the packaged template it should be added
    or updated

## Suggested `AGENT_HANDOFF.md` Format

Only create this file when there is unfinished or interrupted work that needs
temporary continuation context.

Use this structure unless the repo already has a clear existing format:

```md
# AGENT_HANDOFF.md

Temporary continuation notes for unfinished coding-agent work in this repository.

## Current Task

- Request:
- Goal:
- Status:
- Next step:

## Current State

- Files changed:
- Files inspected:
- Commands suggested for manual verification:
- Commands run with explicit approval:
- Decisions:
- Blockers:
- Deferred:

## Pending Template Sync

-
```

## Suggested `RESUME.md` Format

Use this structure unless the repo already has a clear existing format:

```md
# RESUME.md

Project accomplishments for future resume/CV, portfolio, case-study, and
interview use.

## Accomplishments

### YYYY-MM-DD

- Built/changed:
- Technical scope:
- Impact:
- Tools/stack:
- Resume bullet draft:
```
