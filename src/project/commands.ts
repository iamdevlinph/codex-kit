import { existsSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Options } from "../cli/options.js";
import { isRecord, read, readText, sha256, write } from "../files.js";
import {
	AUDIT_SKILL,
	PACKAGE,
	RECONCILE_SKILL,
	TEMPLATE_FILE,
} from "../package.js";
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
Explore this repository, classify its evidence and task-specific workflows, then
use the global $${RECONCILE_SKILL} skill to initialize its instruction
architecture from TEMPLATE_AGENTS.md. Keep AGENTS.md to a concise baseline plus
routing, preserve critical safeguards and existing PLANS.md content, and do not
invent guidance without repository evidence. Audit skills and references for
narrow triggers and selective loading. If the repository is not sufficiently
scaffolded to support reliable guidance, stop without changing instructions or
marking the template applied. Otherwise, validate the result and mark applied
only when the skill's conditions are satisfied.
===== END CODEX INITIALIZATION PROMPT =====`;
}

function reconciliationPrompt(): string {
	return `Template reference updated. Copy everything between the markers into Codex.

===== BEGIN CODEX RECONCILIATION PROMPT =====
Use the global $${RECONCILE_SKILL} skill to reconcile the existing instruction
architecture with the refreshed TEMPLATE_AGENTS.md. Run its task-relevance
audit, preserve local adaptations and critical safeguards, validate the result,
and mark applied only when the skill's conditions are satisfied.
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

export function registerProjectCommand(options: Options): void {
	requireDirectory(options.cwd);
	registerProject(options.codexHome, options.cwd);
	console.log(`registered: ${realpathSync(options.cwd)}`);
}

export function auditProject(options: Options): void {
	requireDirectory(options.cwd);
	const project = realpathSync(options.cwd);
	const quotedProject = JSON.stringify(project);
	console.log(`Project: ${quotedProject}\n
===== BEGIN CODEX PROJECT INSTRUCTION AUDIT PROMPT =====
Use the global $${AUDIT_SKILL} skill to audit the project at ${quotedProject}.
Review its instruction architecture and repository evidence, apply only
unambiguous cleanup, preserve safeguards and durable local decisions, and report
ambiguous improvements instead of guessing. Validate every change.
===== END CODEX PROJECT INSTRUCTION AUDIT PROMPT =====`);
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
