import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

interface RunOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
}

export { default as assert } from "node:assert/strict";
export { spawnSync } from "node:child_process";
export * from "node:fs";
export { tmpdir } from "node:os";
export { join, resolve } from "node:path";
export { test } from "vitest";

export const ROOT = resolve(process.cwd());
export const CLI = join(ROOT, "bin", "codex-kit.js");

export function run(args: string[], options: RunOptions = {}) {
	const result = spawnSync(process.execPath, [CLI, ...args], {
		cwd: options.cwd ?? ROOT,
		env: { ...process.env, ...options.env },
		encoding: "utf8",
	});
	assert.equal(result.status, 0, result.stderr);
	return result;
}

export function runRoutingHook(home: string, input: Record<string, unknown>) {
	const result = spawnSync(
		process.execPath,
		[join(home, "codex-kit", "routing-hook.js")],
		{
			input: JSON.stringify(input),
			encoding: "utf8",
		},
	);
	assert.equal(result.status, 0, result.stderr);
	return result.stdout;
}
