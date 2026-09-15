---
name: codex-kit-release
description: Classify completed codex-kit package, template, build, or release-workflow changes and prepare the next version and latest-only release notes before final validation.
---

# Codex-kit release preparation

Inspect changes since the latest `v*` release tag together with relevant working-tree changes.

1. Classify the completed releasable change as `major` for breaking public behavior, `minor` for backward-compatible features, `patch` for fixes, or `none` for documentation/instruction-only work.
2. For `major`, `minor`, or `patch`, replace all of `RELEASE_NOTES.md` with concise bullets for only the upcoming release, without a heading or history. For `none`, preserve it unchanged.
3. Run `node .agents/skills/codex-kit-release/release.mjs bump <classification>` before final validation.

The script uses committed `package.json` as its baseline, is idempotent, and rejects malformed or conflicting versions, missing or empty notes, and bumps without changed notes. It never stages, commits, tags, pushes, publishes, or creates a release. Those actions always require explicit user authorization.
