import {
	assert,
	join,
	mkdtempSync,
	readdirSync,
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
		const initialized = run(["project", "init", "--cwd", project]);
		assert.match(initialized.stdout, /BEGIN CODEX INITIALIZATION PROMPT/);
		assert.match(initialized.stdout, /substantially scaffolded implementation/);
		assert.match(initialized.stdout, /END CODEX INITIALIZATION PROMPT/);
		const agents = join(project, "AGENTS.md");
		assert.match(
			readFileSync(agents, "utf8"),
			/# Project-Specific Instructions/,
		);
		const repeated = run(["project", "init", "--cwd", project]);
		assert.match(repeated.stdout, /BEGIN CODEX INITIALIZATION PROMPT/);
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
			/Select tests for regression value rather than exhaustive coverage/,
		);
		assert.match(template, /Treat existing tests as regression contracts/);
		assert.match(
			template,
			/Use one representative case per equivalent behavior class/,
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
		assert.match(result.stdout, /BEGIN CODEX RECONCILIATION PROMPT/);
		assert.match(result.stdout, /END CODEX RECONCILIATION PROMPT/);
		assert.match(result.stdout, /existing AGENTS\.md/);
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

for (const command of ["init", "sync"]) {
	test(`project ${command} overwrites local template edits without a backup`, () => {
		const project = mkdtempSync(
			join(tmpdir(), `codex-kit-template-${command}-`),
		);
		try {
			run(["project", "init", "--cwd", project]);
			const template = join(project, "TEMPLATE_AGENTS.md");
			writeFileSync(template, "# Local candidate rule.\n");
			run(["project", command, "--cwd", project]);
			assert.doesNotMatch(
				readFileSync(template, "utf8"),
				/Local candidate rule/,
			);
			assert.equal(
				readdirSync(project).some((file) =>
					file.startsWith("TEMPLATE_AGENTS.md.codex-kit.bak-"),
				),
				false,
			);
		} finally {
			rmSync(project, { recursive: true, force: true });
		}
	});
}
