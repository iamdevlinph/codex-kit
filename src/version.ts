import { spawnSync } from "node:child_process";
import { PACKAGE, REGISTRY } from "./package.js";

export function compareVersions(left: string, right: string): number {
	const parse = (
		value: string,
	): { numbers: [number, number, number]; prerelease: string | null } => {
		const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
		if (!match) throw new Error(`Invalid package version: ${value}`);
		return {
			numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
			prerelease: match[4] ?? null,
		};
	};
	const a = parse(left);
	const b = parse(right);
	for (const [leftNumber, rightNumber] of [
		[a.numbers[0], b.numbers[0]],
		[a.numbers[1], b.numbers[1]],
		[a.numbers[2], b.numbers[2]],
	] as const)
		if (leftNumber !== rightNumber) return Math.sign(leftNumber - rightNumber);
	if (a.prerelease === b.prerelease) return 0;
	if (!a.prerelease) return 1;
	if (!b.prerelease) return -1;
	return Math.sign(
		a.prerelease.localeCompare(b.prerelease, "en", { numeric: true }),
	);
}

export function checkVersion(): void {
	let latest = process.env.CODEX_KIT_LATEST_VERSION;
	if (!latest) {
		const result = spawnSync(
			process.platform === "win32" ? "pnpm.cmd" : "pnpm",
			["view", PACKAGE.name, "version", "--json", `--registry=${REGISTRY}`],
			{ encoding: "utf8", timeout: 15_000 },
		);
		if (result.error)
			throw new Error(`Unable to run pnpm: ${result.error.message}`);
		if (result.status !== 0)
			throw new Error(
				`Unable to check ${REGISTRY}: ${result.stderr.trim() || "pnpm view failed"}`,
			);
		try {
			const value: unknown = JSON.parse(result.stdout);
			latest =
				Array.isArray(value) && typeof value.at(-1) === "string"
					? value.at(-1)
					: typeof value === "string"
						? value
						: undefined;
		} catch {
			latest = result.stdout.trim();
		}
	}
	if (!latest) throw new Error("Registry returned no package version.");
	console.log(`Installed: ${PACKAGE.version}`);
	console.log(`Latest:    ${latest}`);
	const comparison = compareVersions(PACKAGE.version, latest);
	if (comparison === 0) {
		console.log("codex-kit is up to date.");
		return;
	}
	if (comparison > 0) {
		console.log("This local build is newer than the published package.");
		return;
	}
	console.log(
		`Update available. Run:\n  pnpm add --global ${PACKAGE.name}@latest\n  codex-kit global install`,
	);
}
