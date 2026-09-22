import { relative, sep } from "node:path";
import {
	assert,
	existsSync,
	join,
	readdirSync,
	readFileSync,
	test,
} from "../test-support/cli.js";

interface FixtureManifest {
	expectNoChange?: boolean;
	expectRootReduction?: boolean;
	expectedMissing?: string[];
	expectedInstructionChain?: string[];
	instructionDirectories?: string[];
	authoritativeContent: Array<{ owner: string; text: string }>;
	routes: Array<{
		task: string;
		include: string[];
		exclude: string[];
		routeOwner?: string;
		routeInstruction?: string;
	}>;
	unresolvedReferences: string[];
	unresolvedFindings?: string[];
}

const FIXTURES = join(
	process.cwd(),
	"src",
	"test-fixtures",
	"context-optimization",
);

function fixtureFiles(root: string): Map<string, string> {
	const files = new Map<string, string>();
	const visit = (directory: string) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) visit(path);
			else
				files.set(
					relative(root, path).split(sep).join("/"),
					readFileSync(path, "utf8"),
				);
		}
	};
	visit(root);
	return files;
}

const references = (content: string) =>
	[...content.matchAll(/`([^`\n]+\.md)`/g)]
		.map((match) => match[1])
		.filter((target): target is string => Boolean(target));

function reachableFiles(
	files: Map<string, string>,
	owner: string,
): Set<string> {
	const reachable = new Set([owner]);
	const pending = [owner];
	while (pending.length) {
		const source = pending.pop();
		if (!source) continue;
		for (const target of references(files.get(source) ?? "")) {
			if (!files.has(target) || reachable.has(target)) continue;
			reachable.add(target);
			pending.push(target);
		}
	}
	return reachable;
}

for (const fixtureName of readdirSync(FIXTURES).sort()) {
	test(`context optimization fixture: ${fixtureName}`, () => {
		const fixture = join(FIXTURES, fixtureName);
		const manifest = JSON.parse(
			readFileSync(join(fixture, "manifest.json"), "utf8"),
		) as FixtureManifest;
		const before = fixtureFiles(join(fixture, "before"));
		const expectedRoot = join(fixture, "expected");
		const expected = fixtureFiles(expectedRoot);

		if (manifest.expectNoChange) assert.deepEqual(expected, before);
		if (manifest.expectRootReduction) {
			const original = before.get("AGENTS.md");
			const optimized = expected.get("AGENTS.md");
			assert.ok(original && optimized);
			assert.ok(
				Buffer.byteLength(optimized) <= Buffer.byteLength(original) * 0.7,
				"the deliberately bloated root fixture should shrink by at least 30%",
			);
		}

		for (const missing of manifest.expectedMissing ?? [])
			assert.equal(
				expected.has(missing),
				false,
				`${missing} should stay absent`,
			);

		for (const requirement of manifest.authoritativeContent) {
			assert.ok(
				expected.get(requirement.owner)?.includes(requirement.text),
				`${requirement.text} is missing from ${requirement.owner}`,
			);
			const copies = [...expected.values()].reduce(
				(count, content) => count + content.split(requirement.text).length - 1,
				0,
			);
			assert.equal(copies, 1, `${requirement.text} must have one owner`);
		}

		for (const route of manifest.routes) {
			assert.equal(
				new Set(route.include).size,
				route.include.length,
				`${route.task} has duplicate includes`,
			);
			for (const path of [...route.include, ...route.exclude])
				assert.ok(
					expected.has(path),
					`${route.task} references missing ${path}`,
				);
			for (const path of route.exclude)
				assert.equal(
					route.include.includes(path),
					false,
					`${route.task} selects ${path}`,
				);
			if (route.include.length > 1) {
				assert.ok(route.routeOwner && route.routeInstruction);
				assert.ok(
					expected.get(route.routeOwner)?.includes(route.routeInstruction),
					`${route.task} is missing its actionable route`,
				);
				const reachable = reachableFiles(expected, route.routeOwner);
				for (const path of route.include)
					assert.ok(
						reachable.has(path),
						`${route.task} cannot discover ${path}`,
					);
			}
		}

		for (const [source, content] of expected) {
			if (!source.endsWith(".md")) continue;
			for (const target of references(content)) {
				if (manifest.unresolvedReferences.includes(target)) continue;
				assert.ok(
					existsSync(join(expectedRoot, target)),
					`${source} references missing ${target}`,
				);
			}
		}

		const config = expected.get(".codex/config.toml") ?? "";
		const fallbacks = [...config.matchAll(/"([^"]+\.md)"/g)]
			.map((match) => match[1])
			.filter((target): target is string => Boolean(target));
		for (const fallback of fallbacks)
			assert.ok(
				expected.has(fallback),
				`configured fallback ${fallback} is missing`,
			);

		if (manifest.expectedInstructionChain) {
			const chain = (manifest.instructionDirectories ?? []).map((directory) => {
				const prefix = directory === "." ? "" : `${directory}/`;
				const override = `${prefix}AGENTS.override.md`;
				const agents = `${prefix}AGENTS.md`;
				if (expected.has(override)) return override;
				if (expected.has(agents)) return agents;
				return fallbacks.find((fallback) =>
					expected.has(`${prefix}${fallback}`),
				);
			});
			assert.deepEqual(chain, manifest.expectedInstructionChain);
		}

		for (const finding of manifest.unresolvedFindings ?? [])
			assert.ok(
				finding.trim(),
				`${fixtureName} has an empty unresolved finding`,
			);
		if (manifest.unresolvedReferences.length)
			assert.ok(manifest.unresolvedFindings?.length);
	});
}
