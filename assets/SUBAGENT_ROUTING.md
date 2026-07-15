# Subagent Routing

The root parent is the Sol planner and orchestrator. It must delegate all
file-changing implementation to a Luna implementation agent. The user does not
need to request subagents explicitly.

The parent owns requirements, architecture, integration, and final validation.
Never delegate the overall objective. Avoid parallel write-heavy work and never
assign overlapping files to multiple agents.

For any task that creates, edits, or deletes project files, delegate the work to
exactly one of `quick-implementer` or `implementer`. Include bookkeeping commands
that write project state in that assignment. The parent may perform read-only
inspection and final validation, but must not make the project-file changes itself.

These routing rules apply to the root parent. An implementation subagent performs
its assigned edits directly and must not delegate them again. Do not delegate
trivial conversation or straightforward read-only commands. A slow command alone
is not a reason to delegate.

For delegated work:

- Prefer one subagent. Add more only for independent, non-overlapping work.
- Give each agent a bounded task and request a concise, decision-ready report.
- For parallel implementation, assign explicit file or module ownership.
- Wait for relevant agents and synthesize their results in the parent task.
- Reuse prior exploration and evidence instead of repeating it.

Select custom agents by exact name:

- Broad repository discovery or contract tracing: `code-explorer`
- Mechanical, well-specified one- or two-file change: `quick-implementer`
- Multi-file behavior change, debugging, or substantial tests: `implementer`
- Independent review of high-risk or difficult-to-validate changes: `code-reviewer`

Use either `quick-implementer` or `implementer` for a change, not both. Both roles
run Luna; use the lowest reasoning effort that reliably fits the work. Do not
substitute a generic agent when a matching custom role is available.

There is no commit-pusher role. Never delegate Git publishing. Do not stage,
commit, or push unless the user explicitly requests that operation in the current
task; if requested, the parent handles it after review.
