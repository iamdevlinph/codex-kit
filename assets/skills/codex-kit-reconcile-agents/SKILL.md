---
name: codex-kit-reconcile-agents
description: Reconcile a refreshed TEMPLATE_AGENTS.md with project guidance, optimize context routing, and preserve local adaptations and template state contracts.
---

# Reconcile and optimize codex-kit guidance

## Procedure

1. Inspect `AGENTS.md`, any existing `PLANS.md`, `TEMPLATE_AGENTS.md`,
   `.codex-kit-state.json`, existing project skills, referenced guidance, and
   `codex-kit project status`. Record the initial status and Git state before
   editing. Preserve unrelated dirty or untracked content, and keep recoverable
   originals for files that may change. Before loading detailed guidance,
   classify the work and read only the applicable project skills and references.
2. Inventory applicable `AGENTS.md`, `AGENTS.override.md`, configured fallback
   instruction filenames when discoverable, representative nested instruction
   chains, `PLANS.md`, referenced Markdown, and skill-owned references. Record
   current ownership, routes, and UTF-8 byte counts for root instructions, the
   planning index, representative instruction chains, and selected task
   guidance. Report tokens only when a tokenizer already exists; do not add one.
   Treat 2–6 KiB for root instructions and 1–4 KiB for the planning index as
   diagnostic goals, never destructive limits.
3. Classify individual existing and incoming rules as universal guidance,
   critical safeguards, conditional domain guidance, repeatable procedures,
   global product decisions, feature requirements or state, demonstrably
   disposable material, or ambiguity. Preserve established conventions and
   logical organization while allowing safe partitioning that materially
   improves selective loading. Never replace `AGENTS.md` or `PLANS.md` wholesale
   or append the complete template.
4. Apply changes in this order: remove only proven semantic duplication;
   consolidate authoritative ownership; merge applicable template guidance;
   extract coherent independently relevant content; add precise routing; then
   shorten indexes only where preservation and discoverability remain clear.
   Preserve stronger applicable local requirements and report conflicts.
5. Keep repository identity, universal requirements, critical authorization and
   safety restrictions, and concise routing in `AGENTS.md`. A concise safeguard
   may reinforce a detailed conditional workflow, but detailed database,
   deployment, security, or destructive-operation procedures may be routed when
   they are not universally needed.
6. Preserve an existing `PLANS.md`. Create it only when repository evidence
   contains real durable product context. Keep product purpose, priorities,
   cross-feature decisions, feature status and indexing, and major milestones
   there. Move substantial feature-specific requirements, decisions, deferrals,
   and work state to an existing or justified feature plan; never invent or
   backfill history.
7. Put conditional domain knowledge in existing or focused documentation. Use a
   project skill only for a concrete repeatable procedure. Prefer existing
   documentation and plan directories; do not impose fixed paths, create
   speculative skills, split by size alone, or move content into nested
   `AGENTS.md` files merely to reduce root size. Preserve negations, exceptions,
   decisions, deferrals, and incomplete or completed state.
8. Give every substantial extraction a shallow route with a trigger, exact
   relative path, instruction to read it before the work, unrelated-work
   exclusion, and any cross-domain or feature-dependency condition. Each
   `SKILL.md` must state exactly when to read each owned reference. Missing or
   conflicting references are findings; do not fabricate or silently choose.
9. Check representative routing: test-only work excludes styling guidance;
   styling-only work excludes unrelated testing detail; data-only changes do not
   trigger styling; visual regression may require both; unrelated tooling loads
   neither; product work selects the root plan index, affected feature plans,
   global decisions, and required dependencies; release or deployment guidance
   loads only when requested or required; mixed-domain requests may select
   multiple owners. Revisit classification when code discovery expands scope.
   Information already read in the current conversation need not be removed
   from its history.
10. Review relevant tests, scripts, workflows, skill triggers, and validation
    commands. Classify incoming and existing testing guidance by whether it
    exercises observable production behavior through the narrowest real
    executable boundary. Never promote source inspection, implementation-text
    matching, or test-local copies of production decision logic as functional
    verification. Preserve focused source-text assertions when text is itself
    the observable contract, including generated artifacts, CLI or prompt
    output, protocols, externally consumed configuration, migration SQL, and
    required templates or instructions. Introduce only the smallest justified
    test seam, preserve regression and plausible security, trust-boundary, or
    data-loss coverage, and report cases that cannot be improved without
    disproportionate, risky, or ambiguous restructuring. Repair tests only when
    they are directly relevant to changed guidance or required validation;
    otherwise report low-value source-inspection or duplicated-logic tests as
    audit candidates rather than broadening reconciliation into unrelated test
    rewrites. Remove tests only when demonstrably duplicate, obsolete, or
    speculative.
11. Validate reference integrity, preserved semantic ownership, always-on
    safeguards, representative routing, project skills, and expected second-run
    idempotence. Validate every created or modified project skill with an
    available skill validator. A reviewed already-optimized project is a
    successful no-op. If validation fails, restore only
    reconciliation-attributable edits where safely possible, preserve
    pre-existing work, report partial state, and do not mark applied.
12. Report before/after bytes; files created, modified, or preserved; where
    extracted content moved; routes and checks performed; justified large root
    sections; unresolved ambiguities or missing checks; and preservation,
    reference-integrity, and idempotence results. State whether `PLANS.md` was
    preserved, created, or updated and whether template state was marked applied.

Never run `codex-kit project sync` on the user's behalf or recommend it for an
unreleased local template edit. The user should sync only after installing a
released codex-kit version containing the template. Run
`codex-kit project mark-applied` only after a user-run `project init` or eligible
`project sync`, when the initial status was `reconciliation required`, and after
reconciliation, optimization, and validation succeed. Preserved ambiguity blocks
marking only when it prevents determining applicable template guidance or
validating retention. Otherwise report it without rewriting it.

If legacy `codex-kit:shared-template` markers exist, preserve local content and
reconcile their meaning semantically. Do not add, recreate, or depend on managed
markers. Summarize added, updated, skipped, adapted, and relocated guidance, and
identify reusable changes that should be promoted to codex-kit's canonical
template with their target section and exact generalized wording.
