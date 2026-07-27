import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface Options {
	cwd: string;
	codexHome: string;
	orchestrator: string;
	reasoningEffort: string;
	planReasoningEffort: string;
	force: boolean;
	positionals: string[];
}

export function parse(argv: string[]): Options {
	const options: Options = {
		cwd: process.cwd(),
		codexHome: resolve(process.env.CODEX_HOME || join(homedir(), ".codex")),
		orchestrator: "gpt-5.6-sol",
		reasoningEffort: "low",
		planReasoningEffort: "high",
		force: false,
		positionals: [],
	};
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === undefined) continue;
		if (arg === "--force") options.force = true;
		else if (arg === "--cwd" || arg === "--codex-home") {
			const value = argv[++index];
			if (!value) throw new Error(`${arg} requires a path.`);
			if (arg === "--cwd") options.cwd = resolve(value);
			else options.codexHome = resolve(value);
		} else if (arg === "--orchestrator" || arg === "--model") {
			const value = argv[++index];
			if (!value) throw new Error(`${arg} requires a model.`);
			options.orchestrator = value;
		} else if (
			arg === "--reasoning-effort" ||
			arg === "--plan-reasoning-effort"
		) {
			const value = argv[++index];
			if (!value) throw new Error(`${arg} requires a value.`);
			if (arg === "--reasoning-effort") options.reasoningEffort = value;
			else options.planReasoningEffort = value;
		} else options.positionals.push(arg);
	}
	return options;
}
