# Database Guidance

Create additive migrations before destructive migrations. Inspect schema ownership, generate the migration with the repository command, review SQL, and validate rollback behavior.

Production migrations remain subject to the explicit migration-authorization rule in `AGENTS.md`.
