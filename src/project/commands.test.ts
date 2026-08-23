import { vi } from "vitest";
import { parse } from "../cli/options.js";
import { PACKAGE } from "../package.js";
import {
	assert,
	CLI,
	join,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	run,
	spawnSync,
	test,
	tmpdir,
	writeFileSync,
} from "../test-support/cli.js";
import { syncProject } from "./commands.js";

function runProject(args: string[], cwd: string, latest = PACKAGE.version) {
	return run(args, {
		env: { CODEX_KIT_LATEST_VERSION: latest },
		cwd,
	});
}

for (const [command, latest] of [
	["init", "2.0.0"],
	["sync", "2.0.0"],
	["sync", "invalid"],
] as const) {
	test(`project ${command} fails before writes when latest metadata is ${latest}`, () => {
		const project = mkdtempSync(join(tmpdir(), "codex-kit stale-"));
		try {
			const result = spawnSync(
				process.execPath,
				[CLI, "project", command, "--cwd", project],
				{
					encoding: "utf8",
					env: { ...process.env, CODEX_KIT_LATEST_VERSION: latest },
				},
			);
			assert.notEqual(result.status, 0);
			assert.deepEqual(readdirSync(project), []);
			if (latest === "2.0.0") {
				assert.match(
					result.stderr,
					new RegExp(`Installed: ${PACKAGE.version.replaceAll(".", "\\.")}`),
				);
				assert.match(result.stderr, /Latest:\s+2\.0\.0/);
				assert.match(
					result.stderr,
					new RegExp(
						`pnpm dlx @iamdevlinph/codex-kit@latest project ${command} --cwd '${project}'`,
					),
				);
			}
		} finally {
			rmSync(project, { recursive: true, force: true });
		}
	});
}

test("project sync keeps AGENTS.md separate and prints skill-aware reconciliation guidance", () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-project-"));
	try {
		const initialized = runProject(
			["project", "init", "--cwd", project],
			project,
		);
		assert.match(initialized.stdout, /BEGIN CODEX INITIALIZATION PROMPT/);
		assert.match(initialized.stdout, /substantially scaffolded implementation/);
		assert.match(initialized.stdout, /existing PLANS\.md/);
		assert.match(initialized.stdout, /real roadmap items, durable/);
		assert.match(initialized.stdout, /END CODEX INITIALIZATION PROMPT/);
		const agents = join(project, "AGENTS.md");
		assert.match(
			readFileSync(agents, "utf8"),
			/# Project-Specific Instructions/,
		);
		const repeated = runProject(["project", "init", "--cwd", project], project);
		assert.match(repeated.stdout, /BEGIN CODEX INITIALIZATION PROMPT/);
		writeFileSync(
			agents,
			`${readFileSync(agents, "utf8")}\n- Keep this local rule.\n`,
		);
		const result = runProject(["project", "sync", "--cwd", project], project);
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
		assert.match(
			readFileSync(join(project, ".codex-kit-state.json"), "utf8"),
			new RegExp(`availableVersion.*${PACKAGE.version.replaceAll(".", "\\.")}`),
		);
		assert.match(result.stdout, /\.agents\/skills/);
		assert.match(result.stdout, /\$codex-kit-reconcile-agents/);
		assert.match(result.stdout, /BEGIN CODEX RECONCILIATION PROMPT/);
		assert.match(result.stdout, /END CODEX RECONCILIATION PROMPT/);
		assert.match(result.stdout, /existing AGENTS\.md/);
		assert.match(result.stdout, /AGENTS\.md, PLANS\.md/);
		assert.match(result.stdout, /Preserve an existing PLANS\.md/);
		assert.match(result.stdout, /Never invent or backfill speculative history/);
		assert.match(result.stdout, /always-on safety and authorization rules/);
		assert.match(result.stdout, /extract only concrete/);
		assert.match(
			result.stdout,
			/Do not copy the complete template or introduce managed\s+markers/,
		);
		assert.match(result.stdout, /Mark applied only after reconciliation/);
		assert.doesNotMatch(result.stdout, /BEGIN codex-kit:shared-template/);
	} finally {
		rmSync(project, { recursive: true, force: true });
	}
});

test("project sync proceeds when the local build is newer", () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-local-newer-"));
	try {
		runProject(["project", "sync", "--cwd", project], project, "0.0.1");
		assert.ok(readdirSync(project).includes("TEMPLATE_AGENTS.md"));
	} finally {
		rmSync(project, { recursive: true, force: true });
	}
});

test("project sync fails closed when the registry is unavailable", async () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-offline-"));
	const previous = process.env.CODEX_KIT_LATEST_VERSION;
	delete process.env.CODEX_KIT_LATEST_VERSION;
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			throw new Error("offline");
		}),
	);
	try {
		await assert.rejects(
			syncProject(parse(["project", "sync", "--cwd", project])),
			/Unable to check .*offline/,
		);
		assert.deepEqual(readdirSync(project), []);
	} finally {
		vi.unstubAllGlobals();
		if (previous === undefined) delete process.env.CODEX_KIT_LATEST_VERSION;
		else process.env.CODEX_KIT_LATEST_VERSION = previous;
		rmSync(project, { recursive: true, force: true });
	}
});

test("project sync never overwrites an unmanaged AGENTS.md", () => {
	const project = mkdtempSync(join(tmpdir(), "codex-kit-unmanaged-"));
	try {
		const agents = join(project, "AGENTS.md");
		writeFileSync(agents, "# Existing\n\n- Preserve me.\n");
		runProject(["project", "sync", "--cwd", project], project);
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
		runProject(["project", "init", "--cwd", project], project);
		const pending = run(["project", "status", "--cwd", project]);
		assert.match(pending.stdout, /reconciliation required/);
		runProject(["project", "mark-applied", "--cwd", project], project);
		const current = runProject(
			["project", "status", "--cwd", project],
			project,
		);
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
			runProject(["project", "init", "--cwd", project], project);
			const template = join(project, "TEMPLATE_AGENTS.md");
			writeFileSync(template, "# Local candidate rule.\n");
			runProject(["project", command, "--cwd", project], project);
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
