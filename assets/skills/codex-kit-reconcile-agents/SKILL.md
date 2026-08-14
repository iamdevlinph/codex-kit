---
name: codex-kit-reconcile-agents
description: Reconcile a refreshed TEMPLATE_AGENTS.md with a project's AGENTS.md and applicable skills while preserving local adaptations. Use when project status requires reconciliation, the template was refreshed, or the user requests an agent-template sync or mark-applied.
---

# Reconcile codex-kit agent guidance

## Procedure

1. Inspect `AGENTS.md`, `TEMPLATE_AGENTS.md`, `.codex-kit-state.json`, the
   project's existing `.agents/skills`, and `codex-kit project status`. Record
   the initial status before making changes.
2. Preserve the existing `AGENTS.md` organization and all project-specific
   adaptations. Merge only reusable template guidance that applies to this
   repository; report conflicts between local and template rules, and do not
   replace `AGENTS.md` wholesale or copy the complete template into it.
3. Keep critical always-on safety, authorization, secrets, database,
   deployment, and destructive-operation rules in `AGENTS.md`.
4. Extract only concrete, conditional, repeatable project procedures into a
   focused skill under `.agents/skills/<skill-name>/SKILL.md`. Preserve relevant
   existing skills, use valid YAML frontmatter, and do not create speculative
   skills or duplicate detailed instructions.
5. Review the final instruction diff for preserved local rules, duplicates, and
   unintended template edits. Validate every created or modified project skill
   with an available skill validator and run the repository's documented checks.
   Do not mark the template applied until reconciliation and validation succeed.
6. Never run `codex-kit project sync` on the user's behalf or recommend it for
   an unreleased local template edit. The user should run `project sync` only
   after updating codex-kit to a released version containing the template
   change. Run `codex-kit project mark-applied` only when the task follows a
   user-run `project init` or eligible `project sync`, the initial status
   recorded in step 1 was `reconciliation required`, and reconciliation and
   validation succeeded. Otherwise leave project state unchanged and report the
   remaining release, codex-kit update, user-run sync, and reconciliation steps.
7. Summarize added, updated, skipped, adapted, and skill-moved guidance, with
   reasons. Identify genuinely reusable, generalized changes that should be
   promoted to codex-kit's canonical template and report the target section and
   wording.

If legacy `codex-kit:shared-template` markers are present, preserve local
content and reconcile their meaning semantically. Do not add, recreate, or
depend on managed markers, and do not discard local adaptations.
