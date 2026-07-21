import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { backup, isRecord, readJsonObject, readText, write } from "../files.js";
import type { HooksState } from "./state.js";

const shellQuote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;
const hookCommands = (
	file: string,
): Pick<HooksState, "command" | "commandWindows"> => ({
	command: `/usr/bin/env node ${shellQuote(file)}`,
	commandWindows: `node ${JSON.stringify(file)}`,
});

function removeHookHandlers(
	root: Record<string, unknown>,
	state: Pick<HooksState, "command" | "commandWindows">,
): void {
	const hooks = root.hooks;
	if (!isRecord(hooks)) return;
	for (const [event, groupsValue] of Object.entries(hooks)) {
		if (!Array.isArray(groupsValue)) continue;
		const groups = groupsValue.flatMap((groupValue) => {
			if (!isRecord(groupValue) || !Array.isArray(groupValue.hooks))
				return [groupValue];
			const handlers = groupValue.hooks.filter(
				(handler) =>
					!isRecord(handler) ||
					(handler.command !== state.command &&
						handler.commandWindows !== state.commandWindows),
			);
			return handlers.length ? [{ ...groupValue, hooks: handlers }] : [];
		});
		if (groups.length) hooks[event] = groups;
		else delete hooks[event];
	}
}

export function installRoutingHooks(
	home: string,
	previous?: HooksState | null,
): HooksState {
	const target = join(home, "hooks.json");
	const commands = hookCommands(join(home, "codex-kit", "routing-hook.js"));
	const created = previous?.created ?? !existsSync(target);
	const root = readJsonObject(target);
	if (previous) removeHookHandlers(root, previous);
	const hooks = isRecord(root.hooks) ? root.hooks : {};
	root.hooks = hooks;
	const handler = { type: "command", ...commands, timeout: 5 };
	hooks.UserPromptSubmit = [
		...(Array.isArray(hooks.UserPromptSubmit) ? hooks.UserPromptSubmit : []),
		{ hooks: [{ ...handler, statusMessage: "Loading subagent routing" }] },
	];
	hooks.SubagentStart = [
		...(Array.isArray(hooks.SubagentStart) ? hooks.SubagentStart : []),
		{ hooks: [{ ...handler, statusMessage: "Briefing delegated worker" }] },
	];
	const updated = `${JSON.stringify(root, null, 2)}\n`;
	const original = existsSync(target) ? readText(target) : "";
	if (updated !== original) {
		backup(target);
		write(target, updated);
		console.log(`updated: ${target}`);
	}
	return { target, ...commands, created };
}

export function uninstallRoutingHooks(state: HooksState): void {
	if (!existsSync(state.target)) {
		console.warn(`preserved missing hooks file: ${state.target}`);
		return;
	}
	const root = readJsonObject(state.target);
	removeHookHandlers(root, state);
	if (isRecord(root.hooks) && !Object.keys(root.hooks).length)
		delete root.hooks;
	backup(state.target);
	if (state.created && !Object.keys(root).length) rmSync(state.target);
	else write(state.target, `${JSON.stringify(root, null, 2)}\n`);
	console.log(`removed managed routing hooks from: ${state.target}`);
}
