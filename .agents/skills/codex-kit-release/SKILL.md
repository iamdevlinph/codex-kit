---
name: codex-kit-release
description: Prepare and fully validate completed codex-kit package, template, build, or release-workflow changes; do not use for feature-only, test-only, or unrelated tooling work.
---

# Codex-kit release preparation

Read this skill before final validation when work changes the package, template,
build, or release workflow. Do not load it for feature-only, test-only, or
unrelated tooling work. For mixed feature-and-release work, also read
`.agents/skills/codex-kit-feature-workflow/SKILL.md`.

Inspect changes since the latest `v*` release tag together with relevant
working-tree changes.

1. Classify the completed releasable change as `major` for breaking public behavior, `minor` for backward-compatible features, `patch` for fixes, or `none` for documentation/instruction-only work.
2. Synchronize public CLI usage in `README.md` and development, publishing, and
   template-promotion guidance in `MAINTAINERS.md` with changed behavior.
3. Inspect the package boundary. `MAINTAINERS.md`, repository instructions,
   source, and tests must remain outside the npm package; verify the dry-run
   tarball contents before release.
4. For `major`, `minor`, or `patch`, replace all of `RELEASE_NOTES.md` with concise bullets for only the upcoming release, without a heading or history. For `none`, preserve `RELEASE_NOTES.md` and `package.json` unchanged.
5. Run `node .agents/skills/codex-kit-release/release.mjs bump <classification>` before final validation.
6. Run `pnpm run format:check`, `pnpm run typecheck`, `pnpm test`,
   `pnpm run pack:check`, and `git diff --check`.

The script uses committed `package.json` as its baseline, is idempotent, and rejects malformed or conflicting versions, missing or empty notes, and bumps without changed notes. It never stages, commits, tags, pushes, publishes, or creates a release. After an explicitly authorized release commit is pushed to `main`, the validated `publish.yml` workflow creates the immutable tag, publishes npm, and creates the GitHub Release. Agents never perform those actions interactively without explicit user authorization.
