import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Options } from "../cli/options.js";
import { isRecord, read, readText, sha256, write } from "../files.js";
import { PACKAGE, RECONCILE_SKILL, TEMPLATE_FILE } from "../package.js";
import { compareVersions, getLatestVersion } from "../version.js";
import { registerProject } from "./registry.js";

interface ProjectState {
	version: number;
	template: {
		availableHash?: string;
		availableVersion?: string;
		appliedHash?: string;
		appliedAt?: string;
	};
}
const STATE_FILE = ".codex-kit-state.json";
const PROJECT_BEGIN = "<!-- BEGIN codex-kit:shared-template -->";
const PROJECT_END = "<!-- END codex-kit:shared-template -->";
const PROJECT_SCAFFOLD =
	"# Project-Specific Instructions\n\n<!-- Add repository-specific commands, architecture, and exceptions here. -->\n";

function loadProjectState(cwd: string): ProjectState {
	const file = join(cwd, STATE_FILE);
	if (!existsSync(file)) return { version: 1, template: {} };
	try {
		const state: unknown = JSON.parse(readText(file));
		return isRecord(state) && isRecord(state.template)
			? (state as unknown as ProjectState)
			: { version: 1, template: {} };
	} catch {
		throw new Error(`${file} is not valid JSON; move it aside before syncing.`);
	}
}
const saveProjectState = (cwd: string, state: ProjectState) =>
	write(join(cwd, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
const requireDirectory = (cwd: string) => {
	if (!existsSync(cwd) || !statSync(cwd).isDirectory())
		throw new Error(`Not a directory: ${cwd}`);
};

function initializationPrompt(): string {
	return `Project guidance needs initialization. Copy everything between the markers into Codex.

===== BEGIN CODEX INITIALIZATION PROMPT =====
Explore this repository before changing code. First determine whether it has a
substantially scaffolded implementation with enough dependency, configuration,
script, and source evidence to derive reliable project guidance.

If evidence is insufficient, do not add speculative rules or mark the template
applied. Report what still needs to be scaffolded, then stop.

If evidence is sufficient, identify the stack, package manager, scripts,
structure, established patterns, testing tools, and generated files. Add concise
project-specific guidance to AGENTS.md based only on repository evidence,
including exact verification commands. Then use the global
$${RECONCILE_SKILL} skill to merge applicable reusable guidance from
TEMPLATE_AGENTS.md while preserving AGENTS.md organization and local rules.
Inspect and preserve any existing PLANS.md. Create or maintain a concise
PLANS.md only when repository evidence contains real roadmap items, durable
decisions, or resume-worthy completed work; never invent or backfill speculative
history. Keep always-on repository instructions in AGENTS.md, move misplaced
roadmap or history into PLANS.md, and report what PLANS.md work was done.
Validate the final instruction changes, mark the template applied only after
validation succeeds, and confirm codex-kit project status is up to date.
===== END CODEX INITIALIZATION PROMPT =====`;
}

function reconciliationPrompt(): string {
	return `Template reference updated. Copy everything between the markers into Codex.

===== BEGIN CODEX RECONCILIATION PROMPT =====
Use the global $${RECONCILE_SKILL} skill to reconcile the existing AGENTS.md
with the refreshed TEMPLATE_AGENTS.md.

Inspect TEMPLATE_AGENTS.md, AGENTS.md, PLANS.md, .codex-kit-state.json,
existing .agents/skills, and codex-kit project status. Preserve local
adaptations and AGENTS.md/PLANS.md organization; merge only applicable reusable
guidance. Preserve an existing PLANS.md, and create or update it only for
evidence-backed durable decisions, roadmap/status, or resume-worthy milestones.
Never invent or backfill speculative history. Move misplaced roadmap or history
out of AGENTS.md, keeping critical always-on safety and authorization rules in
AGENTS.md. The reconciliation must extract only concrete conditional procedures
into validated skills. Do not copy the complete template or introduce managed
markers. Report what PLANS.md content was preserved, created, or changed.

Validate the final instruction changes. Mark applied only after reconciliation
and validation succeed, confirm codex-kit project status is up to date, then
report any template-worthy generalized promotion.
===== END CODEX RECONCILIATION PROMPT =====`;
}

export async function syncProject(
	options: Options,
	action: "init" | "sync" = "sync",
): Promise<void> {
	const { cwd } = options;
	requireDirectory(cwd);
	const latest = await getLatestVersion();
	if (compareVersions(PACKAGE.version, latest) < 0)
		throw new Error(
			`Installed: ${PACKAGE.version}\nLatest:    ${latest}\nPublished guidelines are newer than this local build. Rerun with:\n  pnpm dlx ${PACKAGE.name}@latest project ${action} --cwd '${cwd.replaceAll("'", "'\\''")}'`,
		);
	const agentsFile = join(cwd, "AGENTS.md");
	const stagedTemplate = join(cwd, "TEMPLATE_AGENTS.md");
	const desired = Buffer.from(readText(TEMPLATE_FILE));
	const sourceHash = sha256(desired);
	const state = loadProjectState(cwd);
	if (existsSync(stagedTemplate)) {
		const currentHash = sha256(read(stagedTemplate));
		if (currentHash === sourceHash) console.log(`unchanged: ${stagedTemplate}`);
		else {
			write(stagedTemplate, desired);
			console.log(`refreshed template reference: ${stagedTemplate}`);
		}
	} else {
		write(stagedTemplate, desired);
		console.log(`created template reference: ${stagedTemplate}`);
	}
	state.version = 1;
	state.template = {
		...state.template,
		availableHash: sourceHash,
		availableVersion: PACKAGE.version,
	};
	saveProjectState(cwd, state);
	const createdAgents = !existsSync(agentsFile);
	if (createdAgents) {
		write(agentsFile, PROJECT_SCAFFOLD);
		console.log(`created project instructions file: ${agentsFile}`);
	} else {
		const agents = readText(agentsFile);
		if (agents.includes(PROJECT_BEGIN) || agents.includes(PROJECT_END)) {
			console.warn(`preserved legacy managed template in: ${agentsFile}`);
			console.warn(
				"Ask Codex to migrate it to semantic template reconciliation before applying updates.",
			);
		}
	}
	const needsInitialization =
		readText(agentsFile).trim() === PROJECT_SCAFFOLD.trim();
	registerProject(options.codexHome, cwd);
	console.log(
		needsInitialization ? initializationPrompt() : reconciliationPrompt(),
	);
}

interface ProjectStatus {
	availableHash?: string | null;
	availableVersion?: string;
	appliedHash?: string;
	status: string;
}

export function evaluateProjectStatus(cwd: string): ProjectStatus {
	requireDirectory(cwd);
	const stagedTemplate = join(cwd, "TEMPLATE_AGENTS.md");
	const state = loadProjectState(cwd);
	const availableHash = state.template.availableHash ?? null;
	const localHash = existsSync(stagedTemplate)
		? sha256(read(stagedTemplate))
		: null;
	if (!localHash) {
		return { status: "not initialized (run codex-kit project sync)" };
	}
	const details = {
		availableHash,
		availableVersion: state.template.availableVersion ?? "unknown",
		appliedHash: state.template.appliedHash ?? "never",
	};
	if (!existsSync(join(cwd, "AGENTS.md"))) {
		return { status: "AGENTS.md missing (reconcile the template first)" };
	}
	if (sha256(read(TEMPLATE_FILE)) !== availableHash) {
		return {
			...details,
			status: "kit template update available; run project sync",
		};
	}
	if (localHash !== availableHash) {
		return {
			...details,
			status: "local template changed; review it before syncing",
		};
	}
	if (state.template.appliedHash !== localHash) {
		return { ...details, status: "reconciliation required" };
	}
	return { ...details, status: "up to date" };
}

export function projectStatus(options: Options): void {
	const status = evaluateProjectStatus(options.cwd);
	console.log(`Project: ${options.cwd}`);
	if (!status.availableVersion) {
		console.log(`Status: ${status.status}`);
		return;
	}
	console.log(
		`Available: ${status.availableVersion} (${status.availableHash ?? "untracked"})`,
	);
	console.log(`Applied:   ${status.appliedHash}`);
	console.log(`Status: ${status.status}`);
}

export function markApplied(options: Options): void {
	const { cwd } = options;
	requireDirectory(cwd);
	const stagedTemplate = join(cwd, "TEMPLATE_AGENTS.md");
	const agentsFile = join(cwd, "AGENTS.md");
	if (!existsSync(stagedTemplate))
		throw new Error(`Missing ${stagedTemplate}; run project sync first.`);
	if (!existsSync(agentsFile))
		throw new Error(
			`Missing ${agentsFile}; reconcile the template into AGENTS.md first.`,
		);
	const state = loadProjectState(cwd);
	state.version = 1;
	state.template = {
		...state.template,
		appliedHash: sha256(read(stagedTemplate)),
		appliedAt: new Date().toISOString(),
	};
	saveProjectState(cwd, state);
	console.log(`recorded template reconciliation: ${stagedTemplate}`);
}
