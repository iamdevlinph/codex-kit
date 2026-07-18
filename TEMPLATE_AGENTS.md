# Shared Agent Defaults

Reusable defaults for coding agents. Adapt stack details, commands, paths,
product context, and local conventions in the project-specific section outside
the managed markers.

## Context And Instruction Scope

- Follow the repository's existing style, structure, architecture, and stronger
  local instructions. Keep product and business decisions aligned with
  `PLANS.md` when it exists.
- Use `PLANS.md` for durable product context, business rules, sequencing,
  priorities, deferred requirements, product or implementation decisions, and
  major completed milestones.

## Instructions And Skills

- Keep `AGENTS.md` focused on durable, always-applicable repository context:
  architecture, conventions, commands, safety and authorization boundaries,
  verification expectations, and concise pointers to specialized workflows.
- Use project skills under `.agents/skills/<skill-name>/SKILL.md` for repeatable,
  task-specific workflows or detailed guidance needed only for matching tasks.
- In existing projects, review large task-specific procedures in `AGENTS.md`.
  When a procedure is reusable and conditionally relevant, extract it into a
  project skill and leave a concise routing rule in `AGENTS.md`.
- Preserve critical safety, authorization, destructive-operation, database, and
  deployment restrictions in `AGENTS.md`, even when a skill contains the
  detailed workflow.
- In new projects, begin with a concise `AGENTS.md`. Add a skill only after a
  concrete repeatable workflow or specialized procedure is identified; do not
  create speculative skills.
- Avoid duplicating detailed instructions between `AGENTS.md` and `SKILL.md`.
  Keep the always-on rule in `AGENTS.md` and the conditional procedure in the
  skill.
- Each project skill must use valid YAML frontmatter with a clear `name` and a
  `description` that states when the skill should trigger.

## Template Maintenance

- Projects normally use `AGENTS.md` as the active instruction file. The source
  template is `assets/TEMPLATE_AGENTS.md` in the private `codex-kit` repository
  and public package.
- A project-local `TEMPLATE_AGENTS.md` is an optional temporary sync/reference
  copy, not an active file or automatic update path. Updating `AGENTS.md` does
  not update either template, and an updated `AGENTS.md` need not be copied back
  to its local reference.
- Keep project-specific context outside the managed `AGENTS.md` block; keep only
  reusable cross-project rules in the packaged template.
- When a request introduces a reusable workflow preference, convention, agent
  behavior, tooling default, or safety rule, tell the user it appears
  template-level and update the current project's active instructions when
  appropriate.
- After a likely template-level project change, remind the user to update the
  packaged template, publish a version, and sync affected projects. Specify:

  - the target section and whether to add a bullet, subsection, or section
  - whether it replaces an existing rule or adds one
  - exact reusable wording or a concise patch
  - for replacements, the old and new behavior
  - for additions, why the rule applies across projects

- Merge template updates into other projects without overwriting project-specific
  context.

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
change project behavior. Review existing project skills under .agents/skills and
move conditionally relevant, repeatable procedures out of AGENTS.md only when a
skill is warranted. Preserve critical safety and authorization rules in
AGENTS.md, preserve existing relevant skills, avoid speculative skills, and
validate any skill you create or modify. Afterward, summarize what was preserved,
what moved into a skill, and whether any local rules appear template-worthy.
```

## Core Behavior

- Match nearby code before introducing patterns, abstractions, dependencies, or
  file organization. Consistency outranks personal preference and generic
  best-practice refactors.
- Keep changes minimal, localized, and limited to the request. Do not reorganize
  major modules, refactor core systems, add frameworks, or change architecture
  or project paradigms without explicit approval.
- Work within imperfect architecture. If it prevents safe completion, stop,
  explain the limitation, propose the smallest viable design change, and wait
  for approval. Escalate blockers instead of bypassing them.
- Reuse existing constants, schemas, enums, shared types, and components before
  creating duplicates. Add reusable domain values at their existing source of
  truth instead of scattering magic strings.

## Project Discovery

- Before changing code, inspect manifests, configuration, scripts, and nearby
  files to identify the repository's actual stack, commands, and conventions.
  Do not assume tools from other projects.
- Keep discovered stack-specific guidance in the project's
  `# Project-Specific Instructions`, not in this shared template.

## Commands And Verification

- Avoid broad commands. After changes, run the smallest targeted verification
  that meaningfully validates them when practical, then report the command and
  result. Use the repository's documented package manager and scripts.
- Do not change dependencies, global tools, or the environment by default.
- Do not run local or remote database inspection, generation, migration, or SQL
  commands unless the task requires them.

## Structure

- Follow the repository's organization and naming. Prefer focused files and
  split mixed responsibilities when readability improves.
- Do not reorganize feature directories, shared modules, routes, server
  boundaries, schemas, or state patterns unless requested and approved.

## Data And Validation

- Update schemas first, then generate migrations or derived types. Never edit
  generated migration snapshots manually unless requested.
- Validate form and server inputs explicitly. After successful mutations,
  invalidate or refresh relevant cached data when applicable.

## Planning

- Read `PLANS.md` before product-facing work. Implement only the requested
  feature, not the whole plan.
- Record requirement, product, workflow, permission, priority, scope, deferral,
  and durable implementation decisions in the relevant feature chunk/checklist,
  not only narrative summaries.
- After product-facing work, update the relevant item's state: implemented,
  verified, deferred, or pending. Check items only after implementation and
  verification; manual testing may revert them.
- Record major completed, resume-worthy milestones in a concise `PLANS.md`
  milestone or accomplishment section. State the technical scope and value;
  never exaggerate impact or invent metrics.
- Keep `PLANS.md` detailed enough for a fresh session, but exclude temporary
  handoff state, command output, debugging notes, and scratch work unless they
  represent durable decisions.
- If `PLANS.md` conflicts with the current request, follow the request and update
  the plan.

## Repo Safety

- Preserve user changes and unrelated dirty state. Never revert them without an
  explicit request.
- Never run destructive Git commands such as `git reset --hard` or
  `git checkout --` without explicit approval.
- Use `apply_patch` for manual edits.
- Prefer `rg` and `rg --files` for approved searches.
- Keep final responses concise and state what was verified or which manual
  verification commands were suggested.

## Completion Report

After changes, summarize:

1. changed files and behavior
2. suggested verification, or commands run with explicit approval and results
3. relevant `PLANS.md` items deferred, updated, or marked complete
4. whether the change is template-level; if so, give the packaged template's
   target section and exact addition or replacement
