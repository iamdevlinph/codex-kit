import {
	assert,
	existsSync,
	join,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	run,
	test,
	tmpdir,
	writeFileSync,
} from "../test-support/cli.js";

test("global install and uninstall manage only package-owned files", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-global-"));
	const home = join(root, ".codex");
	try {
		mkdirSync(home);
		const config = join(home, "config.toml");
		const hooks = join(home, "hooks.json");
		const originalHooks = {
			hooks: {
				SessionStart: [
					{
						matcher: "startup",
						hooks: [{ type: "command", command: "existing-hook" }],
					},
				],
			},
		};
		writeFileSync(config, 'model = "gpt-5.6-sol"\n');
		writeFileSync(hooks, `${JSON.stringify(originalHooks, null, 2)}\n`);
		writeFileSync(join(home, "AGENTS.md"), "# Existing global guidance\n");
		run(["global", "install", "--codex-home", home]);
		assert.deepEqual(readdirSync(join(home, "agents")).sort(), [
			"code-explorer.toml",
			"code-reviewer.toml",
			"implementer.toml",
			"quick-implementer.toml",
		]);
		const globalAgents = readFileSync(join(home, "AGENTS.md"), "utf8");
		assert.match(globalAgents, /Existing global guidance/);
		assert.match(globalAgents, /BEGIN codex-kit:subagent-routing/);
		assert.match(
			globalAgents,
			/Route by role and task shape, never by a\s+model name/,
		);
		assert.match(
			globalAgents,
			/spawn that exact role\s+before performing\s+the role's work/,
		);
		assert.match(globalAgents, /changes spanning up to\s+roughly three files/);
		assert.match(
			globalAgents,
			/Multiple `implementer` instances may run concurrently only when a substantial\s+task divides into genuinely independent slices/,
		);
		assert.match(
			globalAgents,
			/exclusive\s+ownership of named files or modules and a separate validation scope/,
		);
		assert.match(
			globalAgents,
			/Do not\s+spawn duplicate agents merely because multiple files are involved/,
		);
		assert.match(
			globalAgents,
			/quick-implementer.*explicit manual delegation/s,
		);
		assert.match(globalAgents, /run only\s+lightweight integration checks/);
		assert.match(globalAgents, /Wait once for at most 60 seconds/);
		assert.match(globalAgents, /five minutes\s+for `implementer`/);
		assert.match(globalAgents, /no result within two minutes is hung/);
		assert.match(
			globalAgents,
			/implementation agent performs its edits directly and must not\s+delegate them again/,
		);
		const installedHooks = readFileSync(hooks, "utf8");
		assert.match(installedHooks, /existing-hook/);
		assert.match(installedHooks, /UserPromptSubmit/);
		assert.match(installedHooks, /SubagentStart/);
		assert.doesNotMatch(installedHooks, /SubagentStop/);
		assert.doesNotMatch(installedHooks, /PreToolUse/);
		assert.equal(readFileSync(config, "utf8"), 'model = "gpt-5.6-sol"\n');
		assert.ok(existsSync(join(home, "codex-kit", "routing-hook.js")));
		const reconciliationSkill = join(
			home,
			"skills",
			"codex-kit-reconcile-agents",
			"SKILL.md",
		);
		const reconciliationSkillMetadata = join(
			home,
			"skills",
			"codex-kit-reconcile-agents",
			"agents",
			"openai.yaml",
		);
		assert.match(
			readFileSync(reconciliationSkill, "utf8"),
			/semantic|reconcile/i,
		);
		assert.match(
			readFileSync(reconciliationSkill, "utf8"),
			/do not create speculative/,
		);
		assert.match(
			readFileSync(reconciliationSkill, "utf8"),
			/available skill validator/,
		);
		assert.match(
			readFileSync(reconciliationSkill, "utf8"),
			/Never run `codex-kit project sync` on the user's behalf/,
		);
		assert.match(
			readFileSync(reconciliationSkill, "utf8"),
			/run `project sync` only\s+after updating codex-kit to a released version/,
		);
		assert.match(
			readFileSync(reconciliationSkill, "utf8"),
			/the initial status\s+recorded in step 1 was\s+`reconciliation required`/,
		);
		assert.match(
			readFileSync(reconciliationSkill, "utf8"),
			/Do not add, recreate, or\s+depend on managed markers/,
		);
		assert.match(
			readFileSync(reconciliationSkillMetadata, "utf8"),
			/\$codex-kit-reconcile-agents/,
		);

		const explorer = join(home, "agents", "code-explorer.toml");
		writeFileSync(
			explorer,
			`${readFileSync(explorer, "utf8")}\n# local edit\n`,
		);
		const reinstall = run(["global", "install", "--codex-home", home]);
		assert.match(reinstall.stderr, /preserved modified/);

		run(["global", "uninstall", "--codex-home", home]);
		assert.match(readFileSync(explorer, "utf8"), /local edit/);
		assert.deepEqual(JSON.parse(readFileSync(hooks, "utf8")), originalHooks);
		assert.equal(existsSync(join(home, "codex-kit", "routing-hook.js")), false);
		assert.equal(existsSync(reconciliationSkill), false);
		assert.equal(existsSync(reconciliationSkillMetadata), false);
		assert.equal(
			existsSync(join(home, "skills", "codex-kit-reconcile-agents")),
			false,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test("global install restores a replaced user reconciliation skill on uninstall", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-user-skill-"));
	const home = join(root, ".codex");
	const skillDir = join(home, "skills", "codex-kit-reconcile-agents");
	const skill = join(skillDir, "SKILL.md");
	try {
		mkdirSync(skillDir, { recursive: true });
		writeFileSync(skill, "# User reconciliation skill\n");
		const preserved = run(["global", "install", "--codex-home", home]);
		assert.match(preserved.stderr, /preserved modified or pre-existing file/);
		assert.equal(readFileSync(skill, "utf8"), "# User reconciliation skill\n");

		run(["global", "install", "--codex-home", home, "--force"]);
		assert.match(readFileSync(skill, "utf8"), /codex-kit project mark-applied/);
		run(["global", "uninstall", "--codex-home", home]);
		assert.equal(readFileSync(skill, "utf8"), "# User reconciliation skill\n");
		assert.equal(existsSync(join(skillDir, "agents", "openai.yaml")), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("global list summarizes model, routing, agents, and kit ownership", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-list-"));
	const home = join(root, ".codex");
	try {
		run(["global", "install", "--codex-home", home]);
		run(["global", "configure", "--codex-home", home]);
		const result = run(["global", "list", "--codex-home", home]);
		assert.match(result.stdout, /Orchestrator: gpt-5\.6-sol/);
		assert.match(result.stdout, /Reasoning effort: medium/);
		assert.match(result.stdout, /Plan mode reasoning effort: high/);
		assert.match(result.stdout, /Global routing: installed/);
		assert.match(result.stdout, /Routing hook: installed/);
		assert.match(result.stdout, /Reconciliation skill: installed/);
		assert.match(
			result.stdout,
			/code-explorer — gpt-5\.6-terra, medium \(managed\)/,
		);
		assert.match(
			result.stdout,
			/code-reviewer — gpt-5\.6-sol, high \(managed\)/,
		);
		assert.match(
			result.stdout,
			/implementer — gpt-5\.6-luna, high \(managed\)/,
		);
		assert.match(
			result.stdout,
			/quick-implementer — gpt-5\.6-luna, medium \(managed\)/,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
