# Subagent Routing

The root parent is the planner and orchestrator. Before acting on a substantive
task, classify the work using this file. Route by role and task shape, never by a
model name; each agent definition owns its model and reasoning effort.

The parent owns requirements, architecture, sequencing, integration, and final
validation. It may directly handle planning, conversation, status, read-only
checks, documentation and instruction updates, configuration bookkeeping,
template reconciliation, and clear low-to-medium-risk changes spanning up to
roughly three files when no broad discovery or architectural decision is needed.
When a substantive route below matches, spawn that exact role before performing
the role's work. The user does not need to request delegation.

Every new or materially changed feature follows this mandatory workflow:
implement and stabilize; map each responsibility to its final file; extract
independently understandable concerns; validate the decomposed implementation;
then hand off to `code-reviewer`. Pages, routes, controllers, commands, and
entrypoints contain composition and orchestration only. Web page files may keep
framework exports, metadata, loading, guards, page-level state, minimal layout
wrappers, and imported child composition, but not child components, substantial
UI sections, or domain logic. Independently changeable UI concerns (tables,
filters, forms, dialogs, and sections) receive descriptive feature-local files.
Hooks, schemas, data access, transformations, and domain logic move out of
presentation files when independently testable or when they obscure the primary
responsibility. Avoid generic `utils`, `helpers`, or `components` dumping grounds;
filenames identify owned behavior. Keep components feature-local by default;
promote them only when reused across features or explicitly global primitives.
Tiny private helpers or markup may remain inline only when inseparable from the
file's single responsibility. Do not broaden unrelated small fixes. Every
completed feature receives automatic structural review; a framework or tooling
constraint is the only exception and must be named in the handoff.

Select custom agents by exact name:

- Broad repository discovery, contract tracing, or search across many files:
  `code-explorer`
- Large multi-file behavior changes, non-obvious debugging, migrations, or
  substantial tests:
  `implementer`
- Independent review of security-sensitive, architectural, public-API,
  concurrency, migration, or otherwise difficult-to-validate changes:
  `code-reviewer`
- Every completed feature, including small features, receives structural review:
  `code-reviewer`

For tasks with multiple phases, sequence only the roles that add value. For
example, use `code-explorer` before implementation only when broad discovery is
actually needed. Use `code-reviewer` after every completed feature and for any
other change meeting its risk threshold. Avoid parallel write-heavy work by
default and never assign overlapping files to multiple agents.

Multiple `implementer` instances may run concurrently only when a substantial
task divides into genuinely independent slices. Give each instance exclusive
ownership of named files or modules and a separate validation scope. Do not
parallelize slices that share schemas, types, configuration, lockfiles, generated
artifacts, migrations, or dependency ordering. If ownership overlaps or one
slice depends on another, use one implementation agent or sequence the agents.
The parent performs final integration validation after all slices return. Do not
spawn duplicate agents merely because multiple files are involved.

Prefer the parent fast path when delegation would cost more than the work. Do not
spawn a subagent solely because a tool will write a file. Delegate based on task
complexity, context isolation, testing needs, and review risk.

`quick-implementer` remains installed for explicit manual delegation, but the
default automatic routing policy does not select it.

An assigned implementation agent performs its edits directly and must not
delegate them again. Use one implementation agent per slice. Read-only agents
never modify files.

For every delegation:

- Give the agent a bounded task and the relevant requirements.
- Include the role deadline: three minutes for `code-explorer`,
  `code-reviewer`, or a manually requested `quick-implementer`; five minutes
  for `implementer`.
- Request a concise, decision-ready result.
- Wait once for at most 60 seconds. If the agent is still running, request one
  concise progress update. Never issue consecutive wait cycles without new
  progress, steering, or independent useful work.
- If the role deadline expires, tell the agent to stop commands and return its
  stable partial result. Interrupt it if it does not respond, preserve its
  edits, and finish locally.
- Do not run the same validation concurrently in the parent and worker. A
  validation command that produces no result within two minutes is hung unless
  repository guidance documents a longer normal runtime; stop it and report the
  evidence instead of retrying it repeatedly.
- Reuse returned exploration and test evidence. The parent should run only
  lightweight integration checks unless the work is high-risk or the evidence
  is incomplete.

There is no commit-pusher role. Never delegate Git publishing. Do not stage,
commit, tag, or push unless the user explicitly requests that operation in the
current task; if requested, the parent handles it after review.
