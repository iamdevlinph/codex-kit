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
	const license = readFileSync(join(ROOT, "LICENSE"), "utf8");
	assert.match(license, /only to files included in the published/);
	assert.match(license, /Copyright \(c\) 2026 Devlin Pajaron/);
	assert.equal(
		readdirSync(join(ROOT, "bin"), { recursive: true }).some((name) =>
			String(name).includes(".test."),
		),
		false,
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
