# Subagent Routing

The root parent is the planner and orchestrator. Before acting on a substantive
task, classify the work using this file. Route by role and task shape, never by a
model name; each agent definition owns its model and reasoning effort.

The parent owns requirements, architecture, sequencing, integration, and final
validation. It may handle planning, conversation, status reporting, and small
read-only checks directly. When a route below matches, spawn that exact role
before performing the role's work. The user does not need to request delegation.

Select custom agents by exact name:

- Broad repository discovery, contract tracing, or search across many files:
  `code-explorer`
- Mechanical, well-specified implementation localized to one or two files:
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
