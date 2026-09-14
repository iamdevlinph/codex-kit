import { basename } from "node:path";
import { emitKeypressEvents } from "node:readline";
import type { ReadStream, WriteStream } from "node:tty";
import { evaluateProjectStatus } from "../project/commands.js";
import {
	registeredProjects,
	removeRegisteredProjects,
} from "../project/registry.js";

interface ProjectRow {
	name: string;
	path: string;
	status: string;
	unavailable: boolean;
}

const displayStatus = (status: string): string => {
	if (status === "up to date") return "✅ Up to date";
	if (status === "reconciliation required") return "⚠️ Reconciliation required";
	if (status.startsWith("kit template update available"))
		return status.replace(
			"kit template update available",
			"⚠️ Update available",
		);
	if (status.startsWith("local template changed"))
		return status.replace("local template changed", "⚠️ Local template changed");
	if (status.startsWith("not initialized"))
		return status.replace("not initialized", "⚠️ Not initialized");
	if (status.startsWith("AGENTS.md missing"))
		return status.replace("AGENTS.md missing", "⚠️ AGENTS.md missing");
	return status;
};

const statusWidth = (status: string) =>
	[...status].reduce(
		(width, character) =>
			width +
			(character === "\uFE0F"
				? 0
				: character === "✅" || character === "⚠" || character === "❌"
					? 2
					: 1),
		0,
	);
const padStatus = (status: string, width: number) =>
	`${status}${" ".repeat(width - statusWidth(status))}`;

export function projectRows(codexHome: string): ProjectRow[] {
	return registeredProjects(codexHome).map((path) => {
		try {
			return {
				name: basename(path),
				path,
				status: displayStatus(evaluateProjectStatus(path).status),
				unavailable: false,
			};
		} catch (error) {
			return {
				name: basename(path),
				path,
				status: `❌ Unavailable: ${error instanceof Error ? error.message : String(error)}`,
				unavailable: true,
			};
		}
	});
}

export function formatProjectsTable(rows: ProjectRow[]): string {
	if (!rows.length) return "(none)";
	const nameWidth = Math.max(
		"PROJECT".length,
		...rows.map(({ name }) => name.length),
	);
	const widestStatus = Math.max(
		"STATUS".length,
		...rows.map(({ status }) => statusWidth(status)),
	);
	return [
		`${"PROJECT".padEnd(nameWidth)}  ${"STATUS".padEnd(widestStatus)}  PATH`,
		...rows.map(
			({ name, path, status }) =>
				`${name.padEnd(nameWidth)}  ${padStatus(status, widestStatus)}  ${path}`,
		),
	].join("\n");
}

export async function removeProjectsInteractively(
	codexHome: string,
	input: ReadStream = process.stdin,
	output: WriteStream = process.stdout,
): Promise<void> {
	if (!input.isTTY || !output.isTTY)
		throw new Error("Project removal requires an interactive terminal.");
	const rows = projectRows(codexHome);
	if (!rows.length) {
		output.write("(none)\n");
		return;
	}
	let cursor = Math.max(
		0,
		rows.findIndex(({ unavailable }) => unavailable),
	);
	const selected = new Set<number>();
	let renderedLines = 0;
	const render = () => {
		if (renderedLines) output.write(`\u001b[${renderedLines}F\u001b[J`);
		const widestStatus = Math.max(
			...rows.map(({ status }) => statusWidth(status)),
		);
		const lines = [
			"Select projects to remove:",
			"",
			...rows.map(
				(row, index) =>
					`${index === cursor ? "❯" : " "} ${selected.has(index) ? "◉" : "◯"} ${row.name}  ${padStatus(row.status, widestStatus)}  ${row.path}`,
			),
			"",
			"↑/↓ move  Space select  Enter remove  Ctrl+C cancel",
		];
		renderedLines = lines.length;
		output.write(`${lines.join("\n")}\n`);
	};

	emitKeypressEvents(input);
	input.setRawMode(true);
	input.resume();
	output.write("\u001b[?25l");
	render();
	try {
		await new Promise<void>((resolve, reject) => {
			const onKeypress = (
				_text: string,
				key: { name?: string; ctrl?: boolean },
			) => {
				if (key.ctrl && key.name === "c") {
					input.off("keypress", onKeypress);
					reject(new Error("Project removal cancelled."));
					return;
				}
				if (key.name === "up")
					cursor = (cursor + rows.length - 1) % rows.length;
				else if (key.name === "down") cursor = (cursor + 1) % rows.length;
				else if (key.name === "space") {
					if (selected.has(cursor)) selected.delete(cursor);
					else selected.add(cursor);
				} else if (key.name === "return" || key.name === "enter") {
					input.off("keypress", onKeypress);
					resolve();
					return;
				} else return;
				render();
			};
			input.on("keypress", onKeypress);
		});
	} finally {
		input.setRawMode(false);
		input.pause();
		output.write("\u001b[?25h");
	}
	const removed = [...selected]
		.map((index) => rows[index]?.path)
		.filter(Boolean) as string[];
	removeRegisteredProjects(codexHome, removed);
	for (const path of removed) output.write(`removed: ${path}\n`);
}
