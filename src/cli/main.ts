import {
	configureGlobal,
	installGlobal,
	listGlobal,
	listProjectsGlobal,
	removeProjectsGlobal,
	uninstallGlobal,
} from "../global/commands.js";
import { PACKAGE } from "../package.js";
import {
	auditProject,
	markApplied,
	projectStatus,
	registerProjectCommand,
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
  global projects      Show reconciliation status for registered projects.
  global projects remove
                       Interactively remove registered project records.
  global uninstall     Restore managed config values and remove package-owned files.
  project init         Initialize project files after checking the latest npm release.
  project sync         Refresh the template after checking the latest npm release.
  project audit        Print an explicit project-instruction audit prompt.
  project status       Show whether template changes still need reconciliation.
  project mark-applied Record the current template as reconciled with AGENTS.md.
  project register     Register a project without changing its files.
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
    --plan-reasoning-effort LEVEL  Set Plan-mode reasoning effort (default: low).

  global list, global projects, global projects remove, global uninstall
    --codex-home PATH  Use a Codex home other than CODEX_HOME or ~/.codex.

  project init, project sync
    --cwd PATH  Use a project directory other than the current directory.
                npm access is required; stale or unverifiable builds fail before writes.

  project audit, project status, project mark-applied
    --cwd PATH  Use a project directory other than the current directory.

  project register
    --cwd PATH         Use a project directory other than the current directory.
    --codex-home PATH  Use a Codex home other than CODEX_HOME or ~/.codex.

Examples:
  codex-kit global install --force
  codex-kit global configure --reasoning-effort low --plan-reasoning-effort low
  codex-kit project sync --cwd /path/to/project
  codex-kit project audit --cwd /path/to/project
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
	else if (
		scope === "global" &&
		action === "projects" &&
		options.positionals[2] === "remove"
	)
		await removeProjectsGlobal(options.codexHome);
	else if (scope === "global" && action === "projects")
		listProjectsGlobal(options);
	else if (scope === "global" && action === "uninstall")
		uninstallGlobal(options);
	else if (scope === "project" && (action === "init" || action === "sync"))
		await syncProject(options, action);
	else if (scope === "project" && action === "status") projectStatus(options);
	else if (scope === "project" && action === "audit") auditProject(options);
	else if (scope === "project" && action === "register")
		registerProjectCommand(options);
	else if (scope === "project" && action === "mark-applied")
		markApplied(options);
	else if (scope === "version" && action === "check") await checkVersion();
	else throw new Error(`Unknown command: ${options.positionals.join(" ")}`);
}
