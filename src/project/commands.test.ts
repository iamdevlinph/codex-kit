import {
	assert,
	join,
	mkdtempSync,
	readFileSync,
	rmSync,
	run,
	test,
	tmpdir,
	writeFileSync,
} from "../test-support/cli.js";

test("project sync keeps AGENTS.md separate and prints skill-aware reconciliation guidance", () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-project-"));
	try {
		run(["project", "init", "--cwd", project]);
		const agents = join(project, "AGENTS.md");
		assert.match(
			readFileSync(agents, "utf8"),
			/# Project-Specific Instructions/,
		);
		writeFileSync(
			agents,
			`${readFileSync(agents, "utf8")}\n- Keep this local rule.\n`,
		);
		const result = run(["project", "sync", "--cwd", project]);
		assert.match(readFileSync(agents, "utf8"), /Keep this local rule/);
		const template = readFileSync(join(project, "TEMPLATE_AGENTS.md"), "utf8");
		assert.match(template, /Shared Agent Defaults/);
		assert.match(template, /Instructions And Skills/);
		assert.match(
			template,
			/For behavior changes and bug fixes, add or update the smallest focused/,
		);
		assert.match(
			template,
			/Do not introduce a test framework or create low-value tests/,
		);
		assert.match(
			template,
			/Run the relevant focused tests after changing tested behavior/,
		);
		assert.match(template, /With pnpm, use `pnpm add -E` \(`--save-exact`\)/);
		assert.match(
			readFileSync(join(project, ".codex-kit-state.json"), "utf8"),
			/availableHash/,
		);
		assert.match(result.stdout, /\.agents\/skills/);
		assert.match(result.stdout, /\$codex-kit-reconcile-agents/);
		assert.match(result.stdout, /always-on safety and authorization rules/);
		assert.match(result.stdout, /extract only concrete/);
		assert.match(
			result.stdout,
			/do not copy the complete\s+template or introduce managed markers/,
		);
		assert.match(result.stdout, /Mark applied only after reconciliation/);
		assert.doesNotMatch(result.stdout, /BEGIN codex-kit:shared-template/);
	} finally {
		rmSync(project, { recursive: true, force: true });
	}
});
test("project sync never overwrites an unmanaged AGENTS.md", () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-unmanaged-"));
	try {
		const agents = join(project, "AGENTS.md");
		writeFileSync(agents, "# Existing\n\n- Preserve me.\n");
		run(["project", "sync", "--cwd", project]);
		assert.equal(
			readFileSync(agents, "utf8"),
			"# Existing\n\n- Preserve me.\n",
		);
		assert.match(
			readFileSync(join(project, "TEMPLATE_AGENTS.md"), "utf8"),
			/Shared Agent Defaults/,
		);
		assert.match(
			readFileSync(join(project, "AGENTS.md"), "utf8"),
			/Preserve me/,
		);
	} finally {
		rmSync(project, { recursive: true, force: true });
	}
});

test("project status and mark-applied track semantic reconciliation", () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-status-"));
	try {
		run(["project", "init", "--cwd", project]);
		const pending = run(["project", "status", "--cwd", project]);
		assert.match(pending.stdout, /reconciliation required/);
		run(["project", "mark-applied", "--cwd", project]);
		const current = run(["project", "status", "--cwd", project]);
		assert.match(current.stdout, /up to date/);
	} finally {
		rmSync(project, { recursive: true, force: true });
	}
});

test("project sync preserves an independently modified template", () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-template-edit-"));
	try {
		run(["project", "init", "--cwd", project]);
		const template = join(project, "TEMPLATE_AGENTS.md");
		writeFileSync(
			template,
			`${readFileSync(template, "utf8")}\n- Local candidate rule.\n`,
		);
		const result = run(["project", "sync", "--cwd", project]);
		assert.match(result.stderr, /preserved locally modified template/);
		assert.match(readFileSync(template, "utf8"), /Local candidate rule/);
	} finally {
		rmSync(project, { recursive: true, force: true });
	}
});
