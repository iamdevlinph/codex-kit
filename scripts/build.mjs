import { copyFileSync, rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("bin", { recursive: true, force: true });
copyFileSync("TEMPLATE_AGENTS.md", "assets/TEMPLATE_AGENTS.md");

const options = {
	bundle: true,
	format: "esm",
	legalComments: "none",
	minify: false,
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
