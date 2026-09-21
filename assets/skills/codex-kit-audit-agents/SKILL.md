---
name: codex-kit-audit-agents
description: Audit a project's instruction architecture when explicitly requested, preserving local safeguards and decisions while applying only unambiguous cleanup.
---

# Audit project agent guidance

Inspect the current `AGENTS.md`, any `PLANS.md`, project skills and their
referenced guidance, relevant tests, package scripts, and workflow definitions,
plus enough repository evidence to verify that instructions and validation
match the actual project. Missing guidance files are findings, not permission to
invent rules.

Apply only unambiguous cleanup: remove duplication, repair stale commands or
paths from repository evidence, narrow overly broad skill triggers, and keep
task-specific detail selectively loaded. Preserve safety and authorization
safeguards, local adaptations, and durable decisions. Report ambiguous,
conflicting, or preference-based changes instead of guessing.

Require the smallest existing check that proves changed observable behavior; a
check being available, fast, or documented is not enough. Remove only
demonstrably duplicate, obsolete, or speculative tests, preserving coverage
required by an explicit requirement, past defect, or plausible security,
trust-boundary, or data-loss failure. Report ambiguous reductions instead of
applying them, and never turn ordinary feature work into unrelated test cleanup.

Review the final diff, validate every created or modified skill with an available
skill validator, and run only checks required by the changed files and behavior.
Summarize changes, preserved guidance, reported ambiguities, and validation.

This audit is independent of template synchronization. Never run `project sync`,
register the project, modify `.codex-kit-state.json`, or run `mark-applied`.
