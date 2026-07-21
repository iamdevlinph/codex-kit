import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Options } from "../cli/options.js";
import { backup, readText, write } from "../files.js";
import { PACKAGE } from "../package.js";
import {
	type ConfigKey,
	type ConfigState,
	loadState,
	saveState,
} from "./state.js";

interface ConfigEntry {
	value: string;
	line: string;
}

export function topLevelConfigEntries(
	contents: string,
): Map<ConfigKey, ConfigEntry> {
	const entries = new Map<ConfigKey, ConfigEntry>();
	let inTable = false;
	for (const line of contents.split("\n")) {
		if (/^\s*\[/.test(line)) {
			inTable = true;
			continue;
		}
		if (inTable) continue;
		const match =
			/^(\s*)(model|model_reasoning_effort|plan_mode_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(
				line,
			);
		const key = match?.[2] as ConfigKey | undefined;
		const value = match?.[3];
		if (key && value !== undefined && !entries.has(key))
			entries.set(key, { value, line });
	}
	return entries;
}

const tomlString = (value: string) => JSON.stringify(value);

function setTopLevelConfig(
	contents: string,
	desired: Record<ConfigKey, string>,
): string {
	const lines = contents.split("\n");
	const seen = new Set<ConfigKey>();
	let firstTable = lines.findIndex((line) => /^\s*\[/.test(line));
	if (firstTable < 0) firstTable = lines.length;
	for (let index = 0; index < firstTable; index++) {
		const match =
			/^(\s*)(model|model_reasoning_effort|plan_mode_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(
				lines[index] ?? "",
			);
		const key = match?.[2] as ConfigKey | undefined;
		if (!match || !key || seen.has(key)) continue;
		lines[index] = `${match[1]}${key} = ${tomlString(desired[key])}`;
		seen.add(key);
	}
	const missing = (Object.keys(desired) as ConfigKey[])
		.filter((key) => !seen.has(key))
		.map((key) => `${key} = ${tomlString(desired[key])}`);
	if (missing.length) lines.splice(0, 0, ...missing, "");
	return lines.join("\n");
}

export function restoreTopLevelConfig(
	contents: string,
	config: ConfigState,
): string {
	const lines = contents.split("\n");
	let firstTable = lines.findIndex((line) => /^\s*\[/.test(line));
	if (firstTable < 0) firstTable = lines.length;
	const restored = new Set<ConfigKey>();
	for (let index = 0; index < firstTable; index++) {
		const match =
			/^(\s*)(model|model_reasoning_effort|plan_mode_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(
				lines[index] ?? "",
			);
		const key = match?.[2] as ConfigKey | undefined;
		if (
			!match ||
			!key ||
			restored.has(key) ||
			match[3] !== tomlString(config.desired[key])
		)
			continue;
		const prior = config.previous[key];
		if (prior?.present) lines[index] = `${match[1]}${key} = ${prior.value}`;
		else {
			lines.splice(index, 1);
			index--;
			firstTable--;
		}
		restored.add(key);
	}
	if (
		Object.values(config.previous).some((entry) => entry && !entry.present) &&
		lines[0] === ""
	)
		lines.shift();
	return lines.join("\n");
}

export function configureGlobal(options: Options): void {
	const home = options.codexHome;
	const configFile = join(home, "config.toml");
	const desired: Record<ConfigKey, string> = {
		model: options.orchestrator,
		model_reasoning_effort: options.reasoningEffort,
		plan_mode_reasoning_effort: options.planReasoningEffort,
	};
	const state = loadState(home);
	const original = existsSync(configFile) ? readText(configFile) : "";
	const current = topLevelConfigEntries(original);
	if (state.config?.target === configFile) {
		const changed = (
			Object.entries(state.config.desired) as [ConfigKey, string][]
		).some(([key, value]) => current.get(key)?.value !== tomlString(value));
		if (changed && !options.force) {
			console.warn(
				`preserved modified config: ${configFile} (use --force to replace)`,
			);
			return;
		}
	}
	const updated = setTopLevelConfig(original, desired);
	if (updated !== original) {
		backup(configFile);
		write(configFile, updated);
		console.log(`configured orchestrator: ${configFile}`);
	} else console.log(`unchanged: ${configFile}`);
	const previous = state.config?.previous ?? {};
	for (const key of Object.keys(desired) as ConfigKey[]) {
		if (key in previous) continue;
		const entry = current.get(key);
		previous[key] = entry
			? { present: true, value: entry.value }
			: { present: false };
	}
	state.version = PACKAGE.version;
	state.config = { target: configFile, desired, previous };
	saveState(home, state);
	console.log(`Orchestrator: ${desired.model}`);
	console.log(`Reasoning effort: ${desired.model_reasoning_effort}`);
	console.log(
		`Plan mode reasoning effort: ${desired.plan_mode_reasoning_effort}`,
	);
}

export function restoreConfig(config: ConfigState): void {
	if (!existsSync(config.target)) {
		console.warn(`preserved missing config: ${config.target}`);
		return;
	}
	const original = readText(config.target);
	const current = topLevelConfigEntries(original);
	const changed = (
		Object.entries(config.desired) as [ConfigKey, string][]
	).some(([key, value]) => current.get(key)?.value !== tomlString(value));
	if (changed) {
		console.warn(`preserved modified config: ${config.target}`);
		return;
	}
	const restored = restoreTopLevelConfig(original, config);
	if (restored === original) return;
	backup(config.target);
	if (restored.trim()) write(config.target, restored);
	else rmSync(config.target);
	console.log(`restored config: ${config.target}`);
}
