import { createHash } from "node:crypto";
import { PACKAGE } from "../package.js";
import {
	assert,
	CLI,
	existsSync,
	join,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	run,
	spawnSync,
	symlinkSync,
	test,
	tmpdir,
	unlinkSync,
	writeFileSync,
} from "../test-support/cli.js";

const latest = { CODEX_KIT_LATEST_VERSION: PACKAGE.version };
const hash = (value: string) =>
	createHash("sha256").update(value).digest("hex");

test("successful project operations register canonical projects once", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-registry-"));
	const home = join(root, "home");
	const project = join(root, "project");
	mkdirSync(project);
	const link = join(root, "project-link");
	symlinkSync(project, link);
	try {
		run(["project", "init", "--cwd", link, "--codex-home", home], {
			env: latest,
		});
		const canonical = realpathSync(project);
		const record = join(
			home,
			"codex-kit",
			"projects",
			`${hash(canonical)}.json`,
		);
		assert.deepEqual(JSON.parse(readFileSync(record, "utf8")), {
			path: canonical,
		});
		unlinkSync(record);
		run(["project", "sync", "--cwd", project, "--codex-home", home], {
			env: latest,
		});
		assert.equal(existsSync(record), true);
		writeFileSync(join(project, "TEMPLATE_AGENTS.md"), "changed\n");
		unlinkSync(record);
		run(["project", "sync", "--cwd", project, "--codex-home", home], {
			env: latest,
		});
		assert.equal(existsSync(record), true);
		assert.match(
			run(["global", "projects", "--codex-home", home]).stdout,
			new RegExp(
				`${canonical.replaceAll("/", "\\/")} — reconciliation required`,
			),
		);
		run(["global", "install", "--codex-home", home]);
		run(["global", "uninstall", "--codex-home", home]);
		assert.equal(existsSync(record), true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("failed project operations do not register projects", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-registry-failed-"));
	const home = join(root, "home");
	const project = join(root, "project");
	mkdirSync(project);
	try {
		const failed = spawnSync(
			process.execPath,
			[CLI, "project", "sync", "--cwd", project, "--codex-home", home],
			{
				encoding: "utf8",
				env: { ...process.env, CODEX_KIT_LATEST_VERSION: "999.0.0" },
			},
		);
		assert.notEqual(failed.status, 0);
		assert.equal(existsSync(join(home, "codex-kit", "projects")), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("global projects reports empty, current, stale, and unavailable records independently", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-projects-"));
	const home = join(root, "home");
	const current = join(root, "a-current");
	const invalid = join(root, "b-invalid");
	const missing = join(root, "c-missing");
	const uninitialized = join(root, "d-uninitialized");
	const noAgents = join(root, "e-no-agents");
	const kitUpdate = join(root, "f-kit-update");
	const localChange = join(root, "g-local-change");
	mkdirSync(current);
	mkdirSync(invalid);
	mkdirSync(uninitialized);
	mkdirSync(noAgents);
	mkdirSync(kitUpdate);
	mkdirSync(localChange);
	try {
		assert.match(
			run(["global", "projects", "--codex-home", home]).stdout,
			/Projects:\n {2}\(none\)/,
		);
		run(["project", "sync", "--cwd", current, "--codex-home", home], {
			env: latest,
		});
		run(["project", "mark-applied", "--cwd", current]);
		run(["project", "sync", "--cwd", invalid, "--codex-home", home], {
			env: latest,
		});
		writeFileSync(join(invalid, ".codex-kit-state.json"), "invalid");
		const records = join(home, "codex-kit", "projects");
		writeFileSync(
			join(records, `${hash(missing)}.json`),
			`${JSON.stringify({ path: missing })}\n`,
		);
		writeFileSync(
			join(records, `${hash(uninitialized)}.json`),
			`${JSON.stringify({ path: uninitialized })}\n`,
		);
		for (const project of [noAgents, kitUpdate, localChange])
			run(["project", "sync", "--cwd", project, "--codex-home", home], {
				env: latest,
			});
		rmSync(join(noAgents, "AGENTS.md"));
		const kitStateFile = join(kitUpdate, ".codex-kit-state.json");
		const kitState = JSON.parse(readFileSync(kitStateFile, "utf8"));
		kitState.template.availableHash = "outdated";
		writeFileSync(kitStateFile, `${JSON.stringify(kitState)}\n`);
		writeFileSync(join(localChange, "TEMPLATE_AGENTS.md"), "changed\n");
		const output = run(["global", "projects", "--codex-home", home]).stdout;
		assert.match(
			output,
			new RegExp(`${current.replaceAll("/", "\\/")} — up to date`),
		);
		assert.match(output, /b-invalid — unavailable: .* is not valid JSON/);
		assert.match(output, /c-missing — unavailable: Not a directory:/);
		assert.match(output, /d-uninitialized — not initialized/);
		assert.match(output, /e-no-agents — AGENTS\.md missing/);
		assert.match(output, /f-kit-update — kit template update available/);
		assert.match(output, /g-local-change — local template changed/);
		assert.ok(output.indexOf(current) < output.indexOf(invalid));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
