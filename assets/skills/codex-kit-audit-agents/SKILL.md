---
name: codex-kit-audit-agents
description: Audit a project's instruction architecture when explicitly requested, preserving local safeguards and decisions while applying only unambiguous cleanup.
---

# Audit project agent guidance

Inspect the current `AGENTS.md`, any `PLANS.md`, project skills and their
referenced guidance, and enough repository evidence to verify that instructions
match the actual project. Missing guidance files are findings, not permission to
invent rules.

Apply only unambiguous cleanup: remove duplication, repair stale commands or
paths from repository evidence, narrow overly broad skill triggers, and keep
task-specific detail selectively loaded. Preserve safety and authorization
safeguards, local adaptations, and durable decisions. Report ambiguous,
conflicting, or preference-based changes instead of guessing.

Review the final diff, validate every created or modified skill with an available
skill validator, and run the repository's documented checks appropriate to the
files changed. Summarize changes, preserved guidance, reported ambiguities, and
validation.

This audit is independent of template synchronization. Never run `project sync`,
register the project, modify `.codex-kit-state.json`, or run `mark-applied`.
