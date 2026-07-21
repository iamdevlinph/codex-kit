import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageJson {
	name: string;
	version: string;
	publishConfig?: { registry?: string };
}

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ASSETS = join(ROOT, "assets");
export const AGENTS_DIR = join(ASSETS, "agents");
export const SKILLS_DIR = join(ASSETS, "skills");
export const RECONCILE_SKILL = "codex-kit-reconcile-agents";
export const RECONCILE_SKILL_FILE = join(
	SKILLS_DIR,
	RECONCILE_SKILL,
	"SKILL.md",
);
export const RECONCILE_SKILL_METADATA_FILE = join(
	SKILLS_DIR,
	RECONCILE_SKILL,
	"agents",
	"openai.yaml",
);
export const ROUTING_FILE = join(ASSETS, "SUBAGENT_ROUTING.md");
export const ROUTING_HOOK_FILE = join(ROOT, "bin", "routing-hook.js");
export const TEMPLATE_FILE = join(ASSETS, "TEMPLATE_AGENTS.md");
export const PACKAGE = JSON.parse(
	readFileSync(join(ROOT, "package.json"), "utf8"),
) as PackageJson;
export const REGISTRY =
	PACKAGE.publishConfig?.registry ?? "https://registry.npmjs.org";
