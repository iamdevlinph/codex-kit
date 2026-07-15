# Subagent Routing

Keep focused, tightly coupled work in the parent task. Delegate only bounded,
independent work when it materially reduces parent-context growth, latency, or
cost. The user does not need to request subagents explicitly.

The parent owns requirements, architecture, integration, and final validation.
Never delegate the overall objective. Avoid parallel write-heavy work and never
assign overlapping files to multiple agents.

Do not delegate trivial conversation, known-target edits limited to one or two
files, or straightforward commands. A slow command alone is not a reason to
delegate.

When delegation is worthwhile:

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

Use either `quick-implementer` or `implementer` for a change, not both. Use the
lowest reasoning effort that reliably fits the work. Do not substitute a generic
agent when a matching custom role is available.

There is no commit-pusher role. Never delegate Git publishing. Do not stage,
commit, or push unless the user explicitly requests that operation in the current
task; if requested, the parent handles it after review.
