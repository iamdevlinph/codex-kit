import { existsSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { isRecord, readText, sha256, write } from "../files.js";

const registryDirectory = (codexHome: string) =>
	join(codexHome, "codex-kit", "projects");

export function registerProject(codexHome: string, cwd: string): void {
	const path = realpathSync(cwd);
	write(
		join(registryDirectory(codexHome), `${sha256(path)}.json`),
		`${JSON.stringify({ path }, null, 2)}\n`,
	);
}

export function registeredProjects(codexHome: string): string[] {
	const directory = registryDirectory(codexHome);
	if (!existsSync(directory)) return [];
	return readdirSync(directory)
		.filter((name) => name.endsWith(".json"))
		.flatMap((name) => {
			try {
				const record: unknown = JSON.parse(readText(join(directory, name)));
				return isRecord(record) && typeof record.path === "string"
					? [record.path]
					: [];
			} catch {
				return [];
			}
		})
		.sort();
}

export function removeRegisteredProjects(
	codexHome: string,
	projects: Iterable<string>,
): void {
	const selected = new Set(projects);
	const directory = registryDirectory(codexHome);
	if (!existsSync(directory)) return;
	for (const name of readdirSync(directory).filter((name) =>
		name.endsWith(".json"),
	)) {
		let record: unknown;
		try {
			record = JSON.parse(readText(join(directory, name)));
		} catch {
			continue;
		}
		if (
			isRecord(record) &&
			typeof record.path === "string" &&
			selected.has(record.path)
		)
			rmSync(join(directory, name));
	}
}
