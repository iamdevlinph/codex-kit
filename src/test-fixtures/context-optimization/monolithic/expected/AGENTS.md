# Project Instructions

- Follow the existing architecture.
- Preserve unrelated changes.
- Never run production deletion without explicit authorization.
- Never apply production migrations without explicit authorization.

When changing UI appearance or interaction, read `docs/ui.md` before implementation. Do not load it for unrelated work.

When changing schemas, migrations, or persistence, read `docs/database.md` before implementation. Do not load it for unrelated work; keep production changes subject to the authorization rule above.

When release or production deployment work is requested, read `docs/deployment.md` before proceeding. Do not load it for unrelated work.

For product-facing work, read `PLANS.md`, then only the affected feature plans and required dependencies.
