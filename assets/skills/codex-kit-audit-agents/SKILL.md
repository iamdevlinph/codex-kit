---
name: codex-kit-audit-agents
description: Audit and optimize a project's instruction architecture when explicitly requested, preserving local safeguards and decisions without changing template state.
---

# Audit and optimize project guidance

Optimize the project's instruction architecture only where repository evidence
supports the change. The goal is the smallest practical task context with all
applicable safeguards, instructions, decisions, and project knowledge preserved.

## Inventory and protect

1. Inspect Git status and record recoverable originals for files that may
   change. Preserve unrelated dirty or untracked content, and never replace
   user-owned files wholesale.
2. Inventory the root `AGENTS.md`, applicable `AGENTS.override.md` and nested
   instruction chains, configured fallback instruction filenames when
   discoverable, any `PLANS.md`, Markdown they reference, project skills, and
   skill-owned references. Exclude unrelated generated, vendor, and archived
   content. A missing file or broken reference is a finding, not permission to
   invent it.
3. Record UTF-8 byte counts for the root `AGENTS.md`, main `PLANS.md`, and
   representative applicable instruction chains. For representative tasks,
   record the bytes of guidance their routes select. Report tokens only when a
   suitable tokenizer is already available; do not add one. Treat 2–6 KiB for
   root instructions and 1–4 KiB for the planning index as diagnostic goals,
   never deletion limits.
4. Classify each meaningful rule or decision, not merely each heading, as:
   universal guidance, a critical safeguard, conditional domain guidance, a
   repeatable procedure, a global product decision, feature-specific
   requirements or state, demonstrably disposable material, or ambiguity.
   Map its current owner and routes before editing.

## Optimize ownership

Apply changes in this order: remove only proven semantic duplication;
consolidate authoritative ownership; extract coherent independently relevant
content; add precise routing; then shorten indexes only where preservation and
discoverability remain clear.

- Keep repository identity, universal requirements, critical authorization and
  safety restrictions, and concise routing in `AGENTS.md`.
- Keep product purpose, priorities, cross-feature decisions, feature status and
  indexing, and major milestones in `PLANS.md`. Create it only from real durable
  evidence. Move substantial feature-specific requirements, decisions,
  deferrals, and work state to an existing or justified feature plan.
- Put conditional domain knowledge in existing or focused documentation. Use a
  project skill only for a concrete repeatable procedure. Prefer existing
  documentation and plan directories; do not impose `docs/agent-guidance/` or
  `plans/`, create speculative skills, split by size alone, or hide root content
  in nested `AGENTS.md` files merely to reduce the root count.
- Preserve negations, exceptions, conditions, approved decisions, deferrals,
  and incomplete or completed state. Keep ambiguous or conflicting content in
  place and report it rather than choosing silently.
- A concise always-on safeguard may intentionally reinforce a detailed
  conditional procedure, but otherwise keep one authoritative owner.

Every substantial extracted document needs a shallow, actionable route stating
when it applies, its exact relative path, that it must be read before the work,
and that it should not be loaded for unrelated work. Include cross-domain and
feature-dependency conditions where required. Do not create routing chains of
indexes when a direct route is practical.

## Validate and report

Validate that all references resolve, required content remains represented,
safety and authorization rules remain always-on, authoritative ownership is
clear, and a second optimization would not cause further churn. Check a small
set of representative single-domain, cross-domain, product-planning, and
unrelated tasks. Actual fresh-session file-read traces are stronger evidence
than self-reported reads; when traces are unavailable, label the routing check
as static rather than claiming observed context selection.

Review relevant tests, package scripts, workflows, skill triggers, and
validation commands. Require the smallest existing check that proves changed
observable behavior. In relevant test audits, identify source-inspection tests
used as proxies for runtime behavior and production decision logic recreated in
test-local code. Determine the legitimate regression or observable contract
each test protects, then prefer the narrowest existing production boundary: the
public interface when practical, otherwise the actual production function or
module, or a focused integration test when behavior spans components. Introduce
only the smallest localized test seam when justified. Remove an old
source-inspection or duplicated-logic test only after its legitimate contract is
covered.

Preserve focused source-text assertions when text is itself the observable
contract, including generated artifacts, CLI, help, or prompt output,
serialization or protocol formats, externally consumed configuration, migration
SQL, and required templates or instructions. Do not delete tests merely because
they assert strings. When behavioral replacement would require disproportionate,
risky, or ambiguous restructuring, preserve the regression coverage and report
the limitation instead of substituting fake behavioral coverage. Otherwise
remove tests only when demonstrably duplicate, obsolete, or speculative;
preserve explicit regression and plausible security, trust-boundary, or
data-loss coverage. Repair stale commands or paths only from repository
evidence, narrow overly broad skill triggers, and validate every created or
modified project skill with an available skill validator.

If validation fails, restore only audit-attributable edits where safely
possible, preserve pre-existing work, and report any partial state. The final
report must include:

- before/after byte counts and representative selected-context measurements;
- files created, modified, or preserved and where extracted content moved;
- routing scenarios and checks performed;
- justified large always-loaded sections;
- unresolved conflicts, ambiguities, missing references, and unavailable checks;
- source-inspection or duplicated-logic tests replaced, preserved as genuine
  text contracts, or reported as unsafe to restructure;
- preservation, reference-integrity, and idempotence results.

This audit is independent of template synchronization. Never run `project sync`,
register the project, inspect template state merely to optimize instructions,
modify `.codex-kit-state.json`, or run `mark-applied`. Confirm that state was
untouched in the report.
