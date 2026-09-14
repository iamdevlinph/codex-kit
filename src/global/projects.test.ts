import { PassThrough } from "node:stream";
import type { ReadStream, WriteStream } from "node:tty";
import { write } from "../files.js";
import { registerProject } from "../project/registry.js";
import {
	assert,
	existsSync,
	join,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	test,
	tmpdir,
	writeFileSync,
} from "../test-support/cli.js";
import {
	formatProjectsTable,
	removeProjectsInteractively,
} from "./projects.js";

function terminalStreams() {
	const input = new PassThrough() as PassThrough & ReadStream;
	const output = new PassThrough() as PassThrough & WriteStream;
	Object.defineProperty(input, "isTTY", { value: true, configurable: true });
	Object.defineProperty(output, "isTTY", { value: true });
	input.setRawMode = () => input;
	let text = "";
	output.on("data", (chunk) => {
		text += chunk.toString();
	});
	return { input, output, text: () => text };
}

test("project table preserves duplicate basenames, full paths, and status spacing", () => {
	const table = formatProjectsTable([
		{
			name: "same",
			path: "/a/same",
			status: "✅ Up to date",
			unavailable: false,
		},
		{
			name: "same",
			path: "/b/same",
			status: "⚠️ Update available",
			unavailable: true,
		},
	]);
	assert.match(table, /^PROJECT\s+STATUS\s+PATH/m);
	assert.match(table, /same\s+✅ Up to date\s+\/a\/same/);
	assert.match(table, /same\s+⚠️ Update available\s+\/b\/same/);
	assert.doesNotMatch(table, /✅\s{2}Up to date|⚠️\s{2}Update/);
	const pathColumns = table
		.split("\n")
		.slice(1)
		.map((line) => line.indexOf("/"));
	assert.equal(pathColumns[1], (pathColumns[0] ?? 0) + 1);
});

test("removal picker focuses unavailable projects and removes multiple records only", async () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-picker-"));
	const home = join(root, "home");
	const available = join(root, "z-available");
	const missing = join(root, "a-missing");
	mkdirSync(available);
	writeFileSync(join(available, "keep"), "project file\n");
	registerProject(home, available);
	write(
		join(home, "codex-kit", "projects", "renamed-record.json"),
		`${JSON.stringify({ path: missing })}\n`,
	);
	const terminal = terminalStreams();
	try {
		setImmediate(() => terminal.input.write(" \u001b[B \r"));
		await removeProjectsInteractively(home, terminal.input, terminal.output);
		assert.match(terminal.text(), /❯ ◯ a-missing\s+❌ Unavailable/);
		assert.match(terminal.text(), new RegExp(`removed: ${missing}`));
		assert.match(terminal.text(), new RegExp(`removed: ${available}`));
		assert.deepEqual(readdirSync(join(home, "codex-kit", "projects")), []);
		assert.equal(
			readFileSync(join(available, "keep"), "utf8"),
			"project file\n",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("removal picker keeps records on empty selection and cancellation", async () => {
	const root = mkdtempSync(join(tmpdir(), "codex-kit-picker-keep-"));
	const home = join(root, "home");
	const project = join(root, "project");
	mkdirSync(project);
	registerProject(home, project);
	try {
		const empty = terminalStreams();
		setImmediate(() => empty.input.write("\r"));
		await removeProjectsInteractively(home, empty.input, empty.output);
		assert.equal(readdirSync(join(home, "codex-kit", "projects")).length, 1);

		const cancelled = terminalStreams();
		setImmediate(() => cancelled.input.write("\u0003"));
		await assert.rejects(
			removeProjectsInteractively(home, cancelled.input, cancelled.output),
			/Project removal cancelled/,
		);
		assert.equal(readdirSync(join(home, "codex-kit", "projects")).length, 1);
		assert.equal(existsSync(project), true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("removal picker rejects non-interactive use and reports an empty registry", async () => {
	const streams = terminalStreams();
	Object.defineProperty(streams.input, "isTTY", { value: false });
	await assert.rejects(
		removeProjectsInteractively("/unused", streams.input, streams.output),
		/interactive terminal/,
	);
	Object.defineProperty(streams.input, "isTTY", { value: true });
	await removeProjectsInteractively("/unused", streams.input, streams.output);
	assert.match(streams.text(), /\(none\)/);
});
