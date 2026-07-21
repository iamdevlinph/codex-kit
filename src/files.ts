import { createHash } from "node:crypto";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;
export const sha256 = (data: string | Buffer) =>
	createHash("sha256").update(data).digest("hex");
export const read = (file: string): Buffer => readFileSync(file);
export const readText = (file: string): string => readFileSync(file, "utf8");

export function backup(file: string): string | null {
	if (!existsSync(file)) return null;
	const stamp = () => new Date().toISOString().replace(/[-:TZ.]/g, "");
	let destination = `${file}.codex-kit.bak-${stamp()}`;
	let suffix = 1;
	while (existsSync(destination))
		destination = `${file}.codex-kit.bak-${stamp()}-${suffix++}`;
	copyFileSync(file, destination);
	console.log(`backup: ${destination}`);
	return destination;
}

export function write(file: string, data: string | Uint8Array): void {
	mkdirSync(dirname(file), { recursive: true });
	const temporary = `${file}.codex-kit.tmp-${process.pid}`;
	writeFileSync(temporary, data);
	renameSync(temporary, file);
}

export function readJsonObject(file: string): Record<string, unknown> {
	if (!existsSync(file)) return {};
	try {
		const value: unknown = JSON.parse(readText(file));
		if (isRecord(value)) return value;
	} catch {}
	throw new Error(
		`${file} must contain a JSON object; fix or move it before installing.`,
	);
}
