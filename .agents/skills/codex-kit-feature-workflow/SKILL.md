---
name: codex-kit-feature-workflow
description: Implement and structurally review new or materially changed codex-kit features; do not use for small fixes, test-only work, documentation, or unrelated tooling.
---

# Codex-kit feature workflow

Read this skill before implementing a new or materially changed feature and
again before its structural validation. Also read only the affected entries in
`PLANS.md`, when it exists, plus dependencies they identify. Release preparation
is separate; also read `.agents/skills/codex-kit-release/SKILL.md` only when the
work changes the package, template, build, or release workflow.

1. Inspect the manifest, configuration, scripts, nearby code, and closest
   same-purpose shipped feature. Reuse its architecture, naming, shared values,
   UI primitives, tokens, spacing, responsive behavior, states, interactions,
   and accessibility conventions. If no trustworthy analogue exists or the
   change would deliberately diverge from established guidance, ask before
   proceeding.
2. Implement and stabilize the smallest requested behavior. Keep one source of
   truth at the narrowest shared scope and reuse existing constants, schemas,
   types, and components. Do not broaden an unrelated small fix.
3. Map each responsibility to its final file, then extract every independently
   understandable concern. Pages, routes, controllers, commands, and entrypoints
   contain only composition and orchestration. Web pages may retain framework
   exports, metadata, loading, guards, page-level state, minimal layout wrappers,
   and imported-child composition, but not substantial UI sections, child
   components, or domain logic.
4. Put independently changeable tables, filters, forms, dialogs, and sections in
   descriptive feature-local files. Move hooks, schemas, data access,
   transformations, and domain logic out of presentation when independently
   testable or when they obscure its primary responsibility. Avoid generic
   `utils`, `helpers`, and `components` dumping grounds; filenames identify the
   owned behavior. Promote feature-local code only when it is reused or is an
   explicitly global primitive. Tiny private helpers or markup may remain inline
   only when inseparable from the file's single responsibility.
5. Use intent-revealing domain names. Keep naming consistent within each owned
   object, schema, type, and module; preserve external names at the boundary and
   map them once. Comments explain purpose, constraints, invariants, tradeoffs,
   or workarounds rather than narrating statements.
6. Validate the decomposed implementation with the smallest meaningful checks.
   For user-facing work, compare the rendered result with its analogue when
   browser or screenshot tooling exists; otherwise report that rendered
   comparison was unavailable.
7. Hand every completed feature to `code-reviewer` for structural review. A
   concrete framework or tooling constraint is the only exception and must be
   named in the handoff.
