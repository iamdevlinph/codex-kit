import {
	assert,
	join,
	ROOT,
	readFileSync,
	run,
	test,
} from "./test-support/cli.js";

test("version check reports an available public package update", () => {
	const { version } = JSON.parse(
		readFileSync(join(ROOT, "package.json"), "utf8"),
	) as {
		version: string;
	};
	const major = Number.parseInt(version, 10);
	assert.ok(Number.isSafeInteger(major));
	const latestVersion = `${major + 1}.0.0`;
	const result = run(["version", "check"], {
		env: { CODEX_KIT_LATEST_VERSION: latestVersion },
	});
	assert.ok(result.stdout.includes(`Installed: ${version}\n`));
	assert.ok(result.stdout.includes(`Latest:    ${latestVersion}\n`));
	assert.match(result.stdout, /Update available/);
	assert.match(
		result.stdout,
		/pnpm add --global @iamdevlinph\/codex-kit@latest/,
	);
});
