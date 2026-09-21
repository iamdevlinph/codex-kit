---
name: codex-kit-reconcile-agents
description: Reconcile a refreshed TEMPLATE_AGENTS.md with a project's AGENTS.md and applicable skills while preserving local adaptations. Use when project status requires reconciliation, the template was refreshed, or the user requests an agent-template sync or mark-applied.
---

# Reconcile codex-kit agent guidance

## Procedure

1. Inspect `AGENTS.md`, any existing `PLANS.md`, `TEMPLATE_AGENTS.md`,
   `.codex-kit-state.json`, the project's existing `.agents/skills`, and
   `codex-kit project status`. Record the initial status before making changes.
   Before loading detailed guides, classify the requested work and its required
   validation, then read only the applicable project skills and the references
   those skills explicitly require for that branch.
2. Preserve the existing `AGENTS.md` and `PLANS.md` organization and all
   project-specific adaptations. Merge only reusable template guidance that
   applies to this repository; report conflicts between local and template
   rules, and do not replace `AGENTS.md` wholesale or copy the complete
   template into it.
3. Keep critical always-on safety, authorization, secrets, database,
   deployment, and destructive-operation rules in `AGENTS.md`.
4. Preserve an existing `PLANS.md` and semantically merge durable product
   context, decisions, roadmap/status, and resume-worthy milestones. Create it
   only when repository evidence contains real durable content; never invent or
   backfill speculative history. Move durable roadmap or history misplaced in
   `AGENTS.md` into `PLANS.md`, keeping it concise rather than turning it into a
   per-change changelog. Report whether `PLANS.md` was preserved, created, or
   updated and why.
5. Audit both existing project guidance and incoming template guidance by task
   relevance. Keep universal rules and critical safeguards in `AGENTS.md`;
   extract concrete, conditional, repeatable procedures into narrowly triggered
   project skills under `.agents/skills/<skill-name>/SKILL.md`. Prefer an
   applicable existing skill and create one only when repository evidence shows
   a real repeatable workflow. Review broad skills for mixed responsibilities;
   split independently triggered workflows or route substantial conditional
   branches to separate skill-owned Markdown references. Each `SKILL.md` must
   state exactly when to read each reference. Never substitute a bare link for
   the actionable routing or safety rule or duplicate detailed instructions, and
   do not create speculative skills, including generic testing or styling skills.
6. Check representative, non-exhaustive routing scenarios before finalizing:
   test-only work loads testing guidance but not styling guidance; styling-only
   work does the inverse; adding data, content, or events without changing UI
   appearance or interaction does not trigger styling guidance; visual-regression
   work may load both; unrelated tooling loads neither; and
   release or deployment guidance loads only when requested or required. Mixed
   requests may select multiple skills. Information already read in the current
   conversation need not be removed from its history.
7. Inspect relevant tests, package scripts, workflow definitions, skill triggers,
   and referenced validation commands. Require the smallest existing check that
   proves the changed observable behavior; a check being available, fast, or
   documented is not enough. Remove only demonstrably duplicate, obsolete, or
   speculative tests, preserving coverage required by an explicit requirement,
   past defect, or plausible security, trust-boundary, or data-loss failure.
   Report ambiguous reductions instead of applying them, and do not expand
   ordinary feature work into unrelated test cleanup.
8. Review the final instruction diff for preserved local rules, duplicates,
   broad triggers, missing reference-read conditions, and unintended template
   edits. Validate every created or modified project skill with an available
   skill validator, then run only checks required by the changed files and
   behavior. Do not mark the template applied until reconciliation and that
   validation succeed.
9. Never run `codex-kit project sync` on the user's behalf or recommend it for
   an unreleased local template edit. The user should run `project sync` only
   after updating codex-kit to a released version containing the template
   change. Run `codex-kit project mark-applied` only when the task follows a
   user-run `project init` or eligible `project sync`, the initial status
   recorded in step 1 was `reconciliation required`, and reconciliation and
   validation succeeded. Otherwise leave project state unchanged and report the
   remaining release, codex-kit update, user-run sync, and reconciliation steps.
10. Summarize added, updated, skipped, adapted, and skill-moved guidance, with
   reasons. Identify genuinely reusable, generalized changes that should be
   promoted to codex-kit's canonical template and report the target section and
   wording.

If legacy `codex-kit:shared-template` markers are present, preserve local
content and reconcile their meaning semantically. Do not add, recreate, or
depend on managed markers, and do not discard local adaptations.
