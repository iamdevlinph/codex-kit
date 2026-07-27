import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	statSync,
} from "node:fs";
import { join } from "node:path";
import type { Options } from "../cli/options.js";
import { backup, read, readText, sha256, write } from "../files.js";
import {
	AGENTS_DIR,
	PACKAGE,
	RECONCILE_SKILL,
	RECONCILE_SKILL_FILE,
	RECONCILE_SKILL_METADATA_FILE,
	ROUTING_FILE,
	ROUTING_HOOK_FILE,
} from "../package.js";
import {
	configureGlobal,
	restoreConfig,
	topLevelConfigEntries,
} from "./config.js";
import { installRoutingHooks, uninstallRoutingHooks } from "./hooks.js";
import {
	type ConfigKey,
	type GlobalState,
	installFile,
	loadState,
	restoreFile,
	STATE_FILE,
	saveState,
} from "./state.js";

const GLOBAL_BEGIN = "<!-- BEGIN codex-kit:subagent-routing -->";
const GLOBAL_END = "<!-- END codex-kit:subagent-routing -->";

const managedBlock = (content: string, begin: string, end: string) =>
	`${begin}\n${content.trimEnd()}\n${end}`;
function replaceOrAppendBlock(
	original: string,
	content: string,
	begin: string,
	end: string,
): string {
	const start = original.indexOf(begin);
	const finish = original.indexOf(end);
	if (start >= 0 !== finish >= 0 || (start >= 0 && finish < start))
		throw new Error(
			`Malformed managed block: expected both ${begin} and ${end}.`,
		);
	const block = managedBlock(content, begin, end);
	return start >= 0
		? `${original.slice(0, start)}${block}${original.slice(finish + end.length)}`
		: `${original.trimEnd()}${original.trim() ? "\n\n" : ""}${block}\n`;
}
function removeBlock(original: string, begin: string, end: string): string {
	const start = original.indexOf(begin);
	const finish = original.indexOf(end);
	if (start < 0 && finish < 0) return original;
	if (start < 0 || finish < start)
		throw new Error("Malformed managed block in AGENTS.md.");
	const before = original.slice(0, start).trimEnd();
	const after = original.slice(finish + end.length).trimStart();
	return `${before}${before && after ? "\n\n" : ""}${after}${before || after ? "\n" : ""}`;
}

export { configureGlobal };

export function installGlobal(options: Options): void {
	const home = options.codexHome;
	mkdirSync(home, { recursive: true });
	const prior = loadState(home);
	const next: GlobalState = {
		version: PACKAGE.version,
		files: {},
		globalAgents: null,
		hooks: null,
		config: prior.config ?? null,
	};
	for (const name of readdirSync(AGENTS_DIR)
		.filter((name) => name.endsWith(".toml"))
		.sort()) {
		const key = `agents/${name}`;
		const record = installFile(
			join(AGENTS_DIR, name),
			join(home, "agents", name),
			key,
			prior,
			options.force,
		);
		if (record) next.files[key] = record;
	}
	const sources = [
		[ROUTING_FILE, join(home, "SUBAGENT_ROUTING.md"), "routing"],
		[
			RECONCILE_SKILL_FILE,
			join(home, "skills", RECONCILE_SKILL, "SKILL.md"),
			`skills/${RECONCILE_SKILL}/SKILL.md`,
		],
		[
			RECONCILE_SKILL_METADATA_FILE,
			join(home, "skills", RECONCILE_SKILL, "agents", "openai.yaml"),
			`skills/${RECONCILE_SKILL}/agents/openai.yaml`,
		],
		[
			ROUTING_HOOK_FILE,
			join(home, "codex-kit", "routing-hook.js"),
			"routing-hook",
		],
	] as const;
	for (const [source, target, key] of sources) {
		const record = installFile(source, target, key, prior, options.force);
		if (record) next.files[key] = record;
	}
	for (const [key, record] of Object.entries(prior.files)) {
		if (key in next.files) continue;
		if (
			!existsSync(record.target) ||
			sha256(read(record.target)) !== record.hash
		) {
			console.warn(
				`preserved stale modified or missing file: ${record.target}`,
			);
			next.files[key] = record;
		} else if (record.ownership === "created") {
			rmSync(record.target);
			console.log(`removed stale: ${record.target}`);
		} else if (
			record.ownership === "replaced" &&
			record.backup &&
			existsSync(record.backup)
		) {
			copyFileSync(record.backup, record.target);
			console.log(`restored stale: ${record.target}`);
		}
	}
	const globalAgents = join(home, "AGENTS.md");
	const original = existsSync(globalAgents) ? readText(globalAgents) : "";
	const updated = replaceOrAppendBlock(
		original,
		readText(ROUTING_FILE),
		GLOBAL_BEGIN,
		GLOBAL_END,
	);
	if (updated !== original) {
		backup(globalAgents);
		write(globalAgents, updated);
		console.log(`updated: ${globalAgents}`);
	}
	next.globalAgents = { target: globalAgents };
	next.hooks = installRoutingHooks(home, prior.hooks);
	saveState(home, next);
	configureGlobal(options);
	const commitPusher = join(home, "agents", "commit-pusher.toml");
	if (existsSync(commitPusher))
		console.warn(
			`warning: existing unmanaged commit-pusher remains at ${commitPusher}`,
		);
	console.log(`Codex kit ${PACKAGE.version} installed under ${home}`);
}

export function listGlobal(options: Options): void {
	const home = options.codexHome;
	const configFile = join(home, "config.toml");
	const globalAgents = join(home, "AGENTS.md");
	const state = loadState(home);
	const config = existsSync(configFile)
		? topLevelConfigEntries(readText(configFile))
		: new Map();
	const value = (key: ConfigKey): string => {
		const raw = config.get(key)?.value;
		if (!raw) return "not set";
		try {
			return String(JSON.parse(raw));
		} catch {
			return raw;
		}
	};
	console.log(`Codex home: ${home}`);
	console.log(
		`Config: ${configFile}${existsSync(configFile) ? "" : " (missing)"}`,
	);
	console.log(`Orchestrator: ${value("model")}`);
	console.log(`Reasoning effort: ${value("model_reasoning_effort")}`);
	console.log(
		`Plan mode reasoning effort: ${value("plan_mode_reasoning_effort")}`,
	);
	console.log(
		`Kit state: ${existsSync(join(home, STATE_FILE)) ? state.version : "not installed"}`,
	);
	console.log(
		`Global routing: ${existsSync(globalAgents) && readText(globalAgents).includes(GLOBAL_BEGIN) ? "installed" : "not installed"}`,
	);
	console.log(
		`Routing file: ${existsSync(join(home, "SUBAGENT_ROUTING.md")) ? join(home, "SUBAGENT_ROUTING.md") : "missing"}`,
	);
	const routingHook = state.hooks;
	console.log(
		`Routing hook: ${routingHook && existsSync(routingHook.target) && readText(routingHook.target).includes(routingHook.command) ? "installed" : "not installed"}`,
	);
	const skillTargets = [
		[
			join(home, "skills", RECONCILE_SKILL, "SKILL.md"),
			state.files[`skills/${RECONCILE_SKILL}/SKILL.md`],
		],
		[
			join(home, "skills", RECONCILE_SKILL, "agents", "openai.yaml"),
			state.files[`skills/${RECONCILE_SKILL}/agents/openai.yaml`],
		],
	] as const;
	const skillStatus = skillTargets.every(
		([target, record]) =>
			existsSync(target) && record && sha256(read(target)) === record.hash,
	)
		? "installed"
		: skillTargets.some(([target]) => existsSync(target))
			? "modified or incomplete"
			: "missing";
	console.log(`Reconciliation skill: ${skillStatus}`);
	console.log("Custom agents:");
	const agentsDir = join(home, "agents");
	const agents = existsSync(agentsDir)
		? readdirSync(agentsDir)
				.filter((name) => name.endsWith(".toml"))
				.sort()
		: [];
	if (!agents.length) {
		console.log("  (none)");
		return;
	}
	const managed = new Set(
		Object.values(state.files).map((record) => record.target),
	);
	for (const filename of agents) {
		const file = join(agentsDir, filename);
		const contents = readText(file);
		const field = (key: "name" | "model" | "model_reasoning_effort") =>
			new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m").exec(contents)?.[1] ??
			"not set";
		console.log(
			`  ${field("name")} — ${field("model")}, ${field("model_reasoning_effort")} (${managed.has(file) ? "managed" : "unmanaged"})`,
		);
	}
}

export function uninstallGlobal(options: Options): void {
	const home = options.codexHome;
	const statePath = join(home, STATE_FILE);
	if (!existsSync(statePath)) {
		console.log(`No installer state at ${statePath}; nothing removed.`);
		return;
	}
	const state = loadState(home);
	for (const record of Object.values(state.files)) restoreFile(record);
	const globalAgents = state.globalAgents?.target ?? join(home, "AGENTS.md");
	if (existsSync(globalAgents)) {
		const original = readText(globalAgents);
		const updated = removeBlock(original, GLOBAL_BEGIN, GLOBAL_END);
		if (updated !== original) {
			backup(globalAgents);
			if (updated) write(globalAgents, updated);
			else rmSync(globalAgents);
			console.log(`removed managed routing from: ${globalAgents}`);
		}
	}
	if (state.config) restoreConfig(state.config);
	if (state.hooks) uninstallRoutingHooks(state.hooks);
	const skillDir = join(home, "skills", RECONCILE_SKILL);
	const metadataDir = join(skillDir, "agents");
	if (
		existsSync(metadataDir) &&
		statSync(metadataDir).isDirectory() &&
		!readdirSync(metadataDir).length
	)
		rmSync(metadataDir, { recursive: true });
	if (
		existsSync(skillDir) &&
		statSync(skillDir).isDirectory() &&
		!readdirSync(skillDir).length
	)
		rmSync(skillDir, { recursive: true });
	const allowancesDir = join(home, "codex-kit", "allowances");
	if (existsSync(allowancesDir))
		rmSync(allowancesDir, { recursive: true, force: true });
	const kitDir = join(home, "codex-kit");
	if (existsSync(kitDir) && !readdirSync(kitDir).length)
		rmSync(kitDir, { recursive: true });
	rmSync(statePath);
	console.log(`Codex kit uninstalled from ${home}`);
}
