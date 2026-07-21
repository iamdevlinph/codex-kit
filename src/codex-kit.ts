#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "./cli/main.js";

export { main } from "./cli/main.js";

if (
	process.argv[1] &&
	realpathSync(resolve(process.argv[1])) ===
		realpathSync(fileURLToPath(import.meta.url))
) {
	try {
		main();
	} catch (error) {
		console.error(
			`error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exitCode = 1;
	}
}
