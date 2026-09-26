import { PACKAGE } from "../package.js";
import {
	assert,
	CLI,
	existsSync,
	join,
	mkdirSync,
	mkdtempSync,
	readdirSync,
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

function onlyRecord(home: string): string {
	const records = readdirSync(join(home, "codex-kit", "projects"));
	assert.equal(records.length, 1);
	const record = records[0];
	assert.ok(record);
	assert.match(record, /\.json$/);
	return join(home, "codex-kit", "projects", record);
}

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
		let record = onlyRecord(home);
		assert.deepEqual(JSON.parse(readFileSync(record, "utf8")), {
			path: canonical,
		});
		unlinkSync(record);
		run(["project", "sync", "--cwd", project, "--codex-home", home], {
			env: latest,
		});
		record = onlyRecord(home);
		writeFileSync(join(project, "TEMPLATE_AGENTS.md"), "changed\n");
		unlinkSync(record);
		run(["project", "sync", "--cwd", project, "--codex-home", home], {
			env: latest,
		});
		record = onlyRecord(home);
		assert.deepEqual(JSON.parse(readFileSync(record, "utf8")), {
			path: canonical,
		});
		assert.match(
			run(["global", "projects", "--codex-home", home]).stdout,
			new RegExp(
				`project\\s+⚠️ Reconciliation required\\s+${canonical.replaceAll("/", "\\/")}`,
			),
		);
		run(["global", "install", "--codex-home", home]);
		run(["global", "uninstall", "--codex-home", home]);
		assert.equal(existsSync(record), true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("project register is state-free, canonical, idempotent, and directory-only", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-register-"));
	const home = join(root, "home");
	const project = join(root, "project");
	const link = join(root, "link");
	const file = join(root, "file");
	mkdirSync(project);
	symlinkSync(project, link);
	writeFileSync(file, "untouched\n");
	try {
		for (const cwd of [link, project])
			run(["project", "register", "--cwd", cwd, "--codex-home", home]);
		const canonical = realpathSync(project);
		assert.deepEqual(JSON.parse(readFileSync(onlyRecord(home), "utf8")), {
			path: canonical,
		});
		assert.deepEqual(readdirSync(project), []);
		assert.equal(readFileSync(file, "utf8"), "untouched\n");
		for (const cwd of [join(root, "missing"), file]) {
			const failed = spawnSync(
				process.execPath,
				[CLI, "project", "register", "--cwd", cwd, "--codex-home", home],
				{ encoding: "utf8" },
			);
			assert.notEqual(failed.status, 0);
			assert.match(failed.stderr, /Not a directory:/);
		}
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
	const canonicalCurrent = realpathSync(current);
	try {
		assert.match(
			run(["global", "projects", "--codex-home", home]).stdout,
			/^\(none\)\n$/,
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
			join(records, "renamed-record.json"),
			`${JSON.stringify({ path: missing })}\n`,
		);
		writeFileSync(
			join(records, "uninitialized.json"),
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
		assert.match(output, /^PROJECT\s+STATUS\s+PATH/m);
		assert.match(
			output,
			new RegExp(
				`a-current\\s+✅ Up to date\\s+${canonicalCurrent.replaceAll("/", "\\/")}`,
			),
		);
		assert.match(output, /b-invalid\s+❌ Unavailable: .* is not valid JSON/);
		assert.match(output, /c-missing\s+❌ Unavailable: Not a directory:/);
		assert.match(
			output,
			/d-uninitialized\s+⚠️ Not initialized \(run codex-kit project sync\)/,
		);
		assert.match(
			output,
			/e-no-agents\s+⚠️ AGENTS\.md missing \(reconcile the template first\)/,
		);
		assert.match(output, /f-kit-update\s+⚠️ Update available; run project sync/);
		assert.match(
			output,
			/g-local-change\s+⚠️ Local template changed; review it before syncing/,
		);
		for (const label of [
			"✅ Up to date",
			"⚠️ Update available",
			"⚠️ Local template changed",
			"⚠️ Not initialized",
			"⚠️ AGENTS.md missing",
			"❌ Unavailable",
		])
			assert.ok(output.includes(label));
		assert.ok(output.indexOf("a-current") < output.indexOf("b-invalid"));
		assert.equal(readdirSync(records).length, 7);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
