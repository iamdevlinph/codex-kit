import {
	assert,
	existsSync,
	join,
	ROOT,
	readdirSync,
	readFileSync,
	test,
} from "./test-support/cli.js";

test("publishing targets public npm through trusted publishing", () => {
	const manifest = JSON.parse(
		readFileSync(join(ROOT, "package.json"), "utf8"),
	) as {
		engines?: { node?: string };
		files?: string[];
		license?: string;
		publishConfig?: { access?: string; registry?: string };
	};
	assert.deepEqual(manifest.publishConfig, {
		registry: "https://registry.npmjs.org",
		access: "public",
	});
	assert.equal(manifest.files?.includes("MAINTAINERS.md"), false);
	assert.equal(manifest.engines?.node, ">=20");
	assert.equal(manifest.license, "ISC");
	assert.equal(existsSync(join(ROOT, ".npmrc")), false);
	assert.equal(existsSync(join(ROOT, "package-lock.json")), false);
	const license = readFileSync(join(ROOT, "LICENSE"), "utf8");
	assert.match(license, /ISC License/);
	assert.doesNotMatch(
		license,
		/only to files included|repository-only|proprietary/,
	);
	assert.match(license, /Copyright \(c\) 2026 Devlin Pajaron/);
	const buildFiles = readdirSync(join(ROOT, "bin"), { recursive: true })
		.map(String)
		.sort();
	assert.deepEqual(buildFiles, ["codex-kit.js", "routing-hook.js"]);
	for (const file of buildFiles)
		assert.match(
			readFileSync(join(ROOT, "bin", file), "utf8"),
			/^#!\/usr\/bin\/env node\n/,
		);
	const buildScript = readFileSync(join(ROOT, "scripts", "build.mjs"), "utf8");
	assert.match(buildScript, /minify: false/);
	assert.equal(
		readFileSync(join(ROOT, "assets", "TEMPLATE_AGENTS.md"), "utf8"),
		readFileSync(join(ROOT, "TEMPLATE_AGENTS.md"), "utf8"),
	);

	const workflow = readFileSync(
		join(ROOT, ".github", "workflows", "publish.yml"),
		"utf8",
	);
	assert.match(workflow, /id-token: write/);
	assert.match(workflow, /registry-url: https:\/\/registry\.npmjs\.org/);
	assert.match(workflow, /npm publish --access public/);
	assert.doesNotMatch(
		workflow,
		/NODE_AUTH_TOKEN|NPM_TOKEN|npm\.pkg\.github\.com/,
	);
});
