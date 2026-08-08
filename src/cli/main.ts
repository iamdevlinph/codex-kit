import {
	configureGlobal,
	installGlobal,
	listGlobal,
	uninstallGlobal,
} from "../global/commands.js";
import { PACKAGE } from "../package.js";
import {
	markApplied,
	projectStatus,
	syncProject,
} from "../project/commands.js";
import { checkVersion } from "../version.js";
import { parse } from "./options.js";

function help(): void {
	console.log(`codex-kit ${PACKAGE.version}

Usage:
  codex-kit <command> [options]

Commands:
  global install       Install or update package-owned agents and routing guidance.
  global configure     Set the orchestrator and normal/Plan reasoning defaults.
  global list          Show model settings, routing status, and custom agents.
  global uninstall     Restore managed config values and remove package-owned files.
  project init         Initialize AGENTS.md, TEMPLATE_AGENTS.md, and project state.
  project sync         Refresh TEMPLATE_AGENTS.md without editing AGENTS.md.
  project status       Show whether template changes still need reconciliation.
  project mark-applied Record the current template as reconciled with AGENTS.md.
  version check        Compare the installed version with the latest npm release.
  -h, --help           Show this help.
  -v, --version        Print the installed version.

Options by command:
  global install
    --codex-home PATH  Use a Codex home other than CODEX_HOME or ~/.codex.
    --force            Replace modified files managed by codex-kit.

  global configure
    --codex-home PATH         Use a Codex home other than CODEX_HOME or ~/.codex.
    --force                   Replace modified config managed by codex-kit.
    --orchestrator MODEL      Set the root/orchestrator model (default: gpt-5.6-sol).
    --model MODEL             Alias for --orchestrator.
    --reasoning-effort LEVEL       Set normal reasoning effort (default: low).
    --plan-reasoning-effort LEVEL  Set Plan-mode reasoning effort (default: high).

  global list, global uninstall
    --codex-home PATH  Use a Codex home other than CODEX_HOME or ~/.codex.

  project init, project sync
    --cwd PATH  Use a project directory other than the current directory.
    --force     Replace modified files managed by codex-kit.

  project status, project mark-applied
    --cwd PATH  Use a project directory other than the current directory.

Examples:
  codex-kit global install --force
  codex-kit global configure --reasoning-effort low --plan-reasoning-effort high
  codex-kit project sync --cwd /path/to/project --force
  codex-kit project status --cwd /path/to/project`);
}

export async function main(
	argv: string[] = process.argv.slice(2),
): Promise<void> {
	const options = parse(argv);
	if (
		options.positionals.includes("--version") ||
		options.positionals.includes("-v")
	) {
		console.log(PACKAGE.version);
		return;
	}
	if (
		!options.positionals.length ||
		options.positionals.includes("--help") ||
		options.positionals.includes("-h")
	) {
		help();
		return;
	}
	const [scope, action] = options.positionals;
	if (scope === "global" && action === "install") installGlobal(options);
	else if (scope === "global" && action === "configure")
		configureGlobal(options);
	else if (scope === "global" && action === "list") listGlobal(options);
	else if (scope === "global" && action === "uninstall")
		uninstallGlobal(options);
	else if (scope === "project" && (action === "init" || action === "sync"))
		syncProject(options);
	else if (scope === "project" && action === "status") projectStatus(options);
	else if (scope === "project" && action === "mark-applied")
		markApplied(options);
	else if (scope === "version" && action === "check") await checkVersion();
	else throw new Error(`Unknown command: ${options.positionals.join(" ")}`);
}
