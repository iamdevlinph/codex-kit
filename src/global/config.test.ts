import {
	assert,
	join,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	run,
	test,
	tmpdir,
	writeFileSync,
} from "../test-support/cli.js";

test("global configure sets the Sol orchestrator without replacing unrelated config", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-configure-"));
	const home = join(root, ".codex");
	try {
		mkdirSync(home);
		const config = join(home, "config.toml");
		const original =
			'model = "gpt-5.6-luna"\nplan_mode_reasoning_effort = "low"\nservice_tier = "default"\n\n[projects."/tmp/example"]\ntrust_level = "trusted"\n';
		writeFileSync(config, original);
		run(["global", "configure", "--codex-home", home]);
		const configured = readFileSync(config, "utf8");
		assert.match(configured, /model = "gpt-5.6-sol"/);
		assert.match(configured, /model_reasoning_effort = "low"/);
		assert.match(configured, /plan_mode_reasoning_effort = "high"/);
		assert.match(configured, /service_tier = "default"/);
		assert.match(configured, /trust_level = "trusted"/);

		run([
			"global",
			"configure",
			"--codex-home",
			home,
			"--force",
			"--reasoning-effort",
			"low",
			"--plan-reasoning-effort",
			"medium",
		]);
		const customized = readFileSync(config, "utf8");
		assert.match(customized, /model_reasoning_effort = "low"/);
		assert.match(customized, /plan_mode_reasoning_effort = "medium"/);

		run(["global", "uninstall", "--codex-home", home]);
		assert.equal(readFileSync(config, "utf8"), original);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
