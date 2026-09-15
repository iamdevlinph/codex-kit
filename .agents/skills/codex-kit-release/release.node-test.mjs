import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./release.mjs", import.meta.url));

function repo(version = "1.2.3") {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-release-"));
	execFileSync("git", ["init", "-q"], { cwd: root });
	execFileSync("git", ["config", "user.email", "test@example.com"], {
		cwd: root,
	});
	execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
	writeFileSync(
		join(root, "package.json"),
		`${JSON.stringify({ name: "test", version }, null, "\t")}\n`,
	);
	writeFileSync(join(root, "RELEASE_NOTES.md"), "- Previous release\n");
	execFileSync("git", ["add", "."], { cwd: root });
	execFileSync("git", ["commit", "-qm", "baseline"], { cwd: root });
	execFileSync("git", ["tag", `v${version}`], { cwd: root });
	return root;
}

function run(root, ...args) {
	return spawnSync(process.execPath, [script, ...args], {
		cwd: root,
		encoding: "utf8",
	});
}

test("bumps each classification and reruns idempotently", () => {
	for (const [kind, expected] of Object.entries({
		none: "1.2.3",
		major: "2.0.0",
		minor: "1.3.0",
		patch: "1.2.4",
	})) {
		const root = repo();
		if (kind !== "none")
			writeFileSync(join(root, "RELEASE_NOTES.md"), "- New release\n");
		assert.equal(run(root, "bump", kind).status, 0);
		assert.equal(run(root, "bump", kind).status, 0);
		assert.equal(
			JSON.parse(readFileSync(join(root, "package.json"))).version,
			expected,
		);
	}
});

test("rejects malformed and conflicting versions", () => {
	for (const version of ["bad", "1.2.5"]) {
		const root = repo();
		writeFileSync(join(root, "package.json"), JSON.stringify({ version }));
		writeFileSync(join(root, "RELEASE_NOTES.md"), "- New release\n");
		assert.equal(run(root, "bump", "patch").status, 1);
	}
});

test("rejects unchanged, missing, and empty release notes", () => {
	for (const state of ["unchanged", "missing", "empty"]) {
		const root = repo();
		if (state === "missing") unlinkSync(join(root, "RELEASE_NOTES.md"));
		if (state === "empty") writeFileSync(join(root, "RELEASE_NOTES.md"), "\n");
		assert.equal(run(root, "bump", "patch").status, 1);
	}
});

test("validates release tags, one-step versions, and changed notes", () => {
	const root = repo();
	writeFileSync(join(root, "RELEASE_NOTES.md"), "- New release\n");
	assert.equal(run(root, "bump", "minor").status, 0);
	assert.equal(run(root, "validate-tag", "v1.3.0", "v1.2.3").status, 0);
	assert.equal(run(root, "validate-tag", "v1.3.1", "v1.2.3").status, 1);
});
