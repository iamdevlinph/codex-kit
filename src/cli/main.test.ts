import { assert, run, test } from "../test-support/cli.js";

test("help describes every command", () => {
	const help = run(["--help"]).stdout;
	for (const command of [
		"global install",
		"global configure",
		"global list",
		"global uninstall",
		"project init",
		"project sync",
		"project status",
		"project mark-applied",
		"version check",
		"-h, --help",
		"-v, --version",
	]) {
		assert.match(help, new RegExp(command.replaceAll("-", "\\-")));
	}
	assert.match(help, /Refresh TEMPLATE_AGENTS\.md without editing AGENTS\.md/);
	assert.match(help, /Restore managed config values/);
	assert.match(help, /Options by command:/);
	assert.match(help, /global install\n\s+--codex-home PATH[^\n]+\n\s+--force/);
	assert.match(help, /global list, global uninstall\n\s+--codex-home PATH/);
	assert.match(
		help,
		/project init, project sync\n\s+--cwd PATH[^\n]+\n\s+--force/,
	);
	assert.match(
		help,
		/--reasoning-effort LEVEL\s+Set normal reasoning effort \(default: low\)/,
	);
	assert.match(
		help,
		/--plan-reasoning-effort LEVEL\s+Set Plan-mode reasoning effort \(default: high\)/,
	);
	assert.match(
		help,
		/codex-kit global configure --reasoning-effort low --plan-reasoning-effort high/,
	);
	assert.match(
		help,
		/codex-kit project sync --cwd \/path\/to\/project --force/,
	);
});

test("short help and version flags match their long forms", () => {
	assert.equal(run(["-h"]).stdout, run(["--help"]).stdout);
	assert.equal(run(["-v"]).stdout, run(["--version"]).stdout);
	assert.equal(run(["-h", "-v"]).stdout, run(["--version"]).stdout);
});
