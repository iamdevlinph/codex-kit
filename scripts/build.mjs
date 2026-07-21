import { rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("bin", { recursive: true, force: true });

const options = {
	bundle: true,
	format: "esm",
	legalComments: "none",
	minify: true,
	platform: "node",
	target: "node20",
};

await Promise.all([
	build({
		...options,
		entryPoints: ["src/codex-kit.ts"],
		outfile: "bin/codex-kit.js",
	}),
	build({
		...options,
		entryPoints: ["src/routing-hook.ts"],
		outfile: "bin/routing-hook.js",
	}),
]);
