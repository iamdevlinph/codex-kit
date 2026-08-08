import { PACKAGE, REGISTRY } from "./package.js";

type ParsedVersion = {
	numbers: [number, number, number];
	prerelease: string | null;
};

function parseVersion(value: string): ParsedVersion {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
	if (!match) throw new Error(`Invalid package version: ${value}`);
	return {
		numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
		prerelease: match[4] ?? null,
	};
}

export function compareVersions(left: string, right: string): number {
	const a = parseVersion(left);
	const b = parseVersion(right);
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

async function fetchLatestVersion(): Promise<string> {
	const url = `${REGISTRY}/${encodeURIComponent(PACKAGE.name)}/latest`;
	let response: Response;
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
	} catch (error) {
		throw new Error(
			`Unable to check ${REGISTRY}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (!response.ok)
		throw new Error(
			`Unable to check ${REGISTRY}: ${response.status} ${response.statusText}`,
		);
	let value: unknown;
	try {
		value = await response.json();
	} catch {
		throw new Error("Registry returned no package version.");
	}
	if (
		!value ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		typeof (value as { version?: unknown }).version !== "string"
	)
		throw new Error("Registry returned no package version.");
	const latest = (value as { version: string }).version;
	parseVersion(latest);
	return latest;
}

export async function checkVersion(): Promise<void> {
	let latest = process.env.CODEX_KIT_LATEST_VERSION;
	if (!latest) latest = await fetchLatestVersion();
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
