# Subagent Routing

The root parent is the planner and orchestrator. Before acting on a substantive
task, classify the work using this file. Route by role and task shape, never by a
model name; each agent definition owns its model and reasoning effort.

The parent owns requirements, architecture, sequencing, integration, and final
validation. It may directly handle planning, conversation, status, read-only
checks, documentation and instruction updates, configuration bookkeeping,
template reconciliation, and explicit low-risk edits isolated to one file.
When a substantive route below matches, spawn that exact role before performing
the role's work. The user does not need to request delegation.

Select custom agents by exact name:

- Broad repository discovery, contract tracing, or search across many files:
  `code-explorer`
- Well-specified implementation that benefits from isolated editing or focused
  tests, usually localized to a few files:
  `quick-implementer`
- Multi-file behavior changes, debugging, migrations, or substantial tests:
  `implementer`
- Independent review of security-sensitive, architectural, public-API,
  concurrency, migration, or otherwise difficult-to-validate changes:
  `code-reviewer`

For tasks with multiple phases, sequence only the roles that add value. For
example, use `code-explorer` before implementation only when broad discovery is
actually needed, and use `code-reviewer` after implementation only when the
change meets its risk threshold. Avoid parallel write-heavy work and never assign
overlapping files to multiple agents.

Prefer the parent fast path when delegation would cost more than the work. Do not
spawn a subagent solely because a tool will write a file. Delegate based on task
complexity, context isolation, testing needs, and review risk.

An assigned implementation agent performs its edits directly and must not
delegate them again. Use either `quick-implementer` or `implementer` for one
implementation slice, not both. Read-only agents never modify files.

For every delegation:

- Give the agent a bounded task and the relevant requirements.
- Request a concise, decision-ready result.
- Wait for the result before integrating or validating dependent work.
- Reuse returned evidence instead of repeating the same exploration.

There is no commit-pusher role. Never delegate Git publishing. Do not stage,
commit, tag, or push unless the user explicitly requests that operation in the
current task; if requested, the parent handles it after review.
