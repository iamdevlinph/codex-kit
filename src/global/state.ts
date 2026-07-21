import { copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { backup, isRecord, read, readText, sha256, write } from "../files.js";
import { PACKAGE } from "../package.js";

export type ConfigKey =
	| "model"
	| "model_reasoning_effort"
	| "plan_mode_reasoning_effort";
export interface StoredConfigValue {
	present: boolean;
	value?: string;
}
export interface ConfigState {
	target: string;
	desired: Record<ConfigKey, string>;
	previous: Partial<Record<ConfigKey, StoredConfigValue>>;
}
export interface HooksState {
	target: string;
	command: string;
	commandWindows: string;
	created: boolean;
}
export interface FileRecord {
	target: string;
	hash: string;
	ownership: "created" | "preexisting" | "replaced";
	backup: string | null;
}
export interface GlobalState {
	version: string;
	files: Record<string, FileRecord>;
	globalAgents?: { target: string } | null;
	hooks?: HooksState | null;
	config?: ConfigState | null;
}

export const STATE_FILE = ".codex-kit-state.json";

export function loadState(home: string): GlobalState {
	const file = join(home, STATE_FILE);
	if (!existsSync(file)) return { version: PACKAGE.version, files: {} };
	try {
		const state: unknown = JSON.parse(readText(file));
		return isRecord(state) && isRecord(state.files)
			? (state as unknown as GlobalState)
			: { version: PACKAGE.version, files: {} };
	} catch {
		throw new Error(
			`${file} is not valid JSON; move it aside before reinstalling.`,
		);
	}
}

export function saveState(home: string, state: GlobalState): void {
	write(join(home, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

export function installFile(
	source: string,
	target: string,
	key: string,
	prior: GlobalState,
	force: boolean,
): FileRecord | null {
	const sourceData = read(source);
	const sourceHash = sha256(sourceData);
	const previous = prior.files[key];
	if (!existsSync(target)) {
		write(target, sourceData);
		console.log(`installed: ${target}`);
		return { target, hash: sourceHash, ownership: "created", backup: null };
	}
	const targetHash = sha256(read(target));
	if (targetHash === sourceHash) {
		console.log(`unchanged: ${target}`);
		return (
			previous ?? {
				target,
				hash: sourceHash,
				ownership: "preexisting",
				backup: null,
			}
		);
	}
	const safelyOwned =
		previous &&
		previous.target === target &&
		previous.ownership !== "preexisting" &&
		previous.hash === targetHash;
	if (!safelyOwned && !force) {
		console.warn(
			`preserved modified or pre-existing file: ${target} (use --force to replace)`,
		);
		return previous ?? null;
	}
	const newBackup = backup(target);
	write(target, sourceData);
	console.log(`updated: ${target}`);
	return {
		target,
		hash: sourceHash,
		ownership: safelyOwned ? previous.ownership : "replaced",
		backup: safelyOwned ? previous.backup : newBackup,
	};
}

export function restoreFile(record: FileRecord): void {
	const { target } = record;
	if (!existsSync(target) || sha256(read(target)) !== record.hash) {
		console.warn(`preserved modified or missing file: ${target}`);
	} else if (record.ownership === "created") {
		rmSync(target);
		console.log(`removed: ${target}`);
	} else if (
		record.ownership === "replaced" &&
		record.backup &&
		existsSync(record.backup)
	) {
		copyFileSync(record.backup, target);
		console.log(`restored: ${target}`);
	} else console.log(`preserved pre-existing file: ${target}`);
}
