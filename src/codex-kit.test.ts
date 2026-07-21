import {
	assert,
	CLI,
	join,
	mkdtempSync,
	ROOT,
	readFileSync,
	rmSync,
	spawnSync,
	symlinkSync,
	test,
	tmpdir,
} from "./test-support/cli.js";

test("CLI runs through a global-style symlink", () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-bin-"));
	const linkedCli = join(root, "codex-kit");
	try {
		symlinkSync(CLI, linkedCli);
		const help = spawnSync(process.execPath, [linkedCli, "--help"], {
			encoding: "utf8",
		});
		assert.equal(help.status, 0, help.stderr);
		assert.match(help.stdout, /Usage:/);

		const version = spawnSync(process.execPath, [linkedCli, "--version"], {
			encoding: "utf8",
		});
		const manifest = JSON.parse(
			readFileSync(join(ROOT, "package.json"), "utf8"),
		) as {
			version: string;
		};
		assert.equal(version.status, 0, version.stderr);
		assert.equal(version.stdout.trim(), manifest.version);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
