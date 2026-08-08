import { vi } from "vitest";
import { PACKAGE, REGISTRY } from "./package.js";
import {
	assert,
	join,
	ROOT,
	readFileSync,
	run,
	test,
} from "./test-support/cli.js";
import { checkVersion } from "./version.js";

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

test("version check fetches encoded npm metadata", async () => {
	const previous = process.env.CODEX_KIT_LATEST_VERSION;
	delete process.env.CODEX_KIT_LATEST_VERSION;
	const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
		assert.equal(url, `${REGISTRY}/%40iamdevlinph%2Fcodex-kit/latest`);
		assert.ok(init.signal);
		return new Response(JSON.stringify({ version: "1.1.0" }), { status: 200 });
	});
	vi.stubGlobal("fetch", fetchMock);
	const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
	try {
		await checkVersion();
	} finally {
		log.mockRestore();
		vi.unstubAllGlobals();
		if (previous === undefined) delete process.env.CODEX_KIT_LATEST_VERSION;
		else process.env.CODEX_KIT_LATEST_VERSION = previous;
	}
	assert.equal(fetchMock.mock.calls.length, 1);
});

test("version check rejects failed or malformed registry responses", async () => {
	const previous = process.env.CODEX_KIT_LATEST_VERSION;
	delete process.env.CODEX_KIT_LATEST_VERSION;
	try {
		for (const [response, message] of [
			[new Response("down", { status: 503 }), "Unable to check"],
			[new Response(JSON.stringify({}), { status: 200 }), "no package version"],
			[
				new Response(JSON.stringify({ version: "invalid" }), { status: 200 }),
				"Invalid package version",
			],
		] as const) {
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => response),
			);
			await assert.rejects(checkVersion(), new RegExp(message));
			vi.unstubAllGlobals();
		}
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("offline");
			}),
		);
		await assert.rejects(checkVersion(), /Unable to check .*offline/);
	} finally {
		vi.unstubAllGlobals();
		if (previous === undefined) delete process.env.CODEX_KIT_LATEST_VERSION;
		else process.env.CODEX_KIT_LATEST_VERSION = previous;
	}
});

test("version comparisons retain up-to-date and local-newer output", async () => {
	for (const [latest, message] of [
		[PACKAGE.version, "codex-kit is up to date."],
		["0.0.1", "This local build is newer"],
	] as const) {
		const previous = process.env.CODEX_KIT_LATEST_VERSION;
		process.env.CODEX_KIT_LATEST_VERSION = latest;
		const output: string[] = [];
		const log = vi
			.spyOn(console, "log")
			.mockImplementation((value) => output.push(String(value)));
		try {
			await checkVersion();
		} finally {
			log.mockRestore();
			if (previous === undefined) delete process.env.CODEX_KIT_LATEST_VERSION;
			else process.env.CODEX_KIT_LATEST_VERSION = previous;
		}
		assert.ok(output.some((line) => line.includes(message)));
	}
});
