#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ConfigKey = "model" | "model_reasoning_effort";
type Ownership = "created" | "preexisting" | "replaced";

interface PackageJson {
  name: string;
  version: string;
  publishConfig?: { registry?: string };
}

interface FileRecord {
  target: string;
  hash: string;
  ownership: Ownership;
  backup: string | null;
}

interface StoredConfigValue {
  present: boolean;
  value?: string;
}

interface ConfigState {
  target: string;
  desired: Record<ConfigKey, string>;
  previous: Partial<Record<ConfigKey, StoredConfigValue>>;
}

interface GlobalState {
  version: string;
  files: Record<string, FileRecord>;
  globalAgents?: { target: string } | null;
  config?: ConfigState | null;
}

interface TemplateState {
  availableHash?: string;
  availableVersion?: string;
  appliedHash?: string;
  appliedAt?: string;
}

interface ProjectState {
  version: number;
  template: TemplateState;
}

interface Options {
  cwd: string;
  codexHome: string;
  orchestrator: string;
  reasoningEffort: string;
  force: boolean;
  positionals: string[];
}

interface ConfigEntry {
  value: string;
  line: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets");
const AGENTS_DIR = join(ASSETS, "agents");
const ROUTING_FILE = join(ASSETS, "SUBAGENT_ROUTING.md");
const TEMPLATE_FILE = join(ASSETS, "TEMPLATE_AGENTS.md");
const PACKAGE = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as PackageJson;

const GLOBAL_BEGIN = "<!-- BEGIN codex-kit:subagent-routing -->";
const GLOBAL_END = "<!-- END codex-kit:subagent-routing -->";
const PROJECT_BEGIN = "<!-- BEGIN codex-kit:shared-template -->";
const PROJECT_END = "<!-- END codex-kit:shared-template -->";
const STATE_FILE = ".codex-kit-state.json";
const PROJECT_STATE_FILE = ".codex-kit-state.json";
const REGISTRY = PACKAGE.publishConfig?.registry ?? "https://registry.npmjs.org";
const DEFAULT_ORCHESTRATOR = "gpt-5.6-sol";
const DEFAULT_REASONING_EFFORT = "high";

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const read = (file: string): Buffer => readFileSync(file);
const readText = (file: string): string => readFileSync(file, "utf8");

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "");
}

function backup(file: string): string | null {
  if (!existsSync(file)) return null;
  let destination = `${file}.codex-kit.bak-${timestamp()}`;
  let suffix = 1;
  while (existsSync(destination)) destination = `${file}.codex-kit.bak-${timestamp()}-${suffix++}`;
  copyFileSync(file, destination);
  console.log(`backup: ${destination}`);
  return destination;
}

function write(file: string, data: string | Uint8Array): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.codex-kit.tmp-${process.pid}`;
  writeFileSync(temporary, data);
  renameSync(temporary, file);
}

function loadState(home: string): GlobalState {
  const file = join(home, STATE_FILE);
  if (!existsSync(file)) return { version: PACKAGE.version, files: {} };
  try {
    const state: unknown = JSON.parse(readText(file));
    return isRecord(state) && isRecord(state.files)
      ? (state as unknown as GlobalState)
      : { version: PACKAGE.version, files: {} };
  } catch {
    throw new Error(`${file} is not valid JSON; move it aside before reinstalling.`);
  }
}

function saveState(home: string, state: GlobalState): void {
  write(join(home, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

function topLevelConfigEntries(contents: string): Map<ConfigKey, ConfigEntry> {
  const entries = new Map<ConfigKey, ConfigEntry>();
  let inTable = false;
  for (const line of contents.split("\n")) {
    if (/^\s*\[/.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable) continue;
    const match = /^(\s*)(model|model_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(line);
    const key = match?.[2] as ConfigKey | undefined;
    const value = match?.[3];
    if (key && value !== undefined && !entries.has(key)) entries.set(key, { value, line });
  }
  return entries;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function setTopLevelConfig(contents: string, desired: Record<ConfigKey, string>): string {
  const lines = contents.split("\n");
  const seen = new Set();
  let firstTable = lines.length;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line !== undefined && /^\s*\[/.test(line)) {
      firstTable = index;
      break;
    }
  }
  for (let index = 0; index < firstTable; index++) {
    const line = lines[index];
    if (line === undefined) continue;
    const match = /^(\s*)(model|model_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(line);
    const key = match?.[2] as ConfigKey | undefined;
    if (!match || !key || seen.has(key)) continue;
    lines[index] = `${match[1]}${key} = ${tomlString(desired[key])}`;
    seen.add(key);
  }
  const missing = (Object.keys(desired) as ConfigKey[])
    .filter((key) => !seen.has(key))
    .map((key) => `${key} = ${tomlString(desired[key])}`);
  if (missing.length) lines.splice(0, 0, ...missing, "");
  return lines.join("\n");
}

function restoreTopLevelConfig(contents: string, config: ConfigState): string {
  const desired = config.desired ?? {};
  const previous = config.previous ?? {};
  const lines = contents.split("\n");
  let firstTable = lines.length;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line !== undefined && /^\s*\[/.test(line)) {
      firstTable = index;
      break;
    }
  }
  const restored = new Set();
  for (let index = 0; index < firstTable; index++) {
    const line = lines[index];
    if (line === undefined) continue;
    const match = /^(\s*)(model|model_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(line);
    const key = match?.[2] as ConfigKey | undefined;
    if (!match || !key || restored.has(key)) continue;
    if (match[3] !== tomlString(desired[key])) continue;
    const prior = previous[key];
    if (prior?.present) {
      lines[index] = `${match[1]}${key} = ${prior.value}`;
    } else {
      lines.splice(index, 1);
      index--;
      firstTable--;
    }
    restored.add(key);
  }
  if (Object.values(previous).some((entry) => entry && !entry.present) && lines[0] === "") lines.shift();
  return lines.join("\n");
}

function loadProjectState(cwd: string): ProjectState {
  const file = join(cwd, PROJECT_STATE_FILE);
  if (!existsSync(file)) return { version: 1, template: {} };
  try {
    const state: unknown = JSON.parse(readText(file));
    return isRecord(state) && isRecord(state.template)
      ? (state as unknown as ProjectState)
      : { version: 1, template: {} };
  } catch {
    throw new Error(`${file} is not valid JSON; move it aside before syncing.`);
  }
}

function saveProjectState(cwd: string, state: ProjectState): void {
  write(join(cwd, PROJECT_STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

function templatePrompt(): string {
  return `Template reference updated. Ask Codex:\n\nThe project's TEMPLATE_AGENTS.md was refreshed from codex-kit. Compare it with\nAGENTS.md and merge only new or changed reusable guidelines that apply to this\nrepository. Preserve project-specific instructions and existing adaptations. Do\nnot replace AGENTS.md wholesale. If a template rule conflicts with a local rule,\nkeep the local rule and report the conflict. Summarize what was added, updated,\nskipped, or adapted, and why. When finished, run codex-kit project mark-applied.`;
}

function managedBlock(content: string, begin: string, end: string): string {
  return `${begin}\n${content.trimEnd()}\n${end}`;
}

function replaceOrAppendBlock(original: string, content: string, begin: string, end: string): string {
  const start = original.indexOf(begin);
  const finish = original.indexOf(end);
  if ((start >= 0) !== (finish >= 0) || (start >= 0 && finish < start)) {
    throw new Error(`Malformed managed block: expected both ${begin} and ${end}.`);
  }
  const block = managedBlock(content, begin, end);
  if (start >= 0) return `${original.slice(0, start)}${block}${original.slice(finish + end.length)}`;
  return `${original.trimEnd()}${original.trim() ? "\n\n" : ""}${block}\n`;
}

function removeBlock(original: string, begin: string, end: string): string {
  const start = original.indexOf(begin);
  const finish = original.indexOf(end);
  if (start < 0 && finish < 0) return original;
  if (start < 0 || finish < start) throw new Error(`Malformed managed block in AGENTS.md.`);
  const before = original.slice(0, start).trimEnd();
  const after = original.slice(finish + end.length).trimStart();
  return `${before}${before && after ? "\n\n" : ""}${after}${before || after ? "\n" : ""}`;
}

function installFile(
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
    return previous ?? { target, hash: sourceHash, ownership: "preexisting", backup: null };
  }

  const safelyOwned =
    previous &&
    previous.target === target &&
    previous.ownership !== "preexisting" &&
    previous.hash === targetHash;
  if (!safelyOwned && !force) {
    console.warn(`preserved modified or pre-existing file: ${target} (use --force to replace)`);
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

function installGlobal(options: Options): void {
  const home = options.codexHome;
  mkdirSync(home, { recursive: true });
  const prior = loadState(home);
  const next: GlobalState = {
    version: PACKAGE.version,
    files: {},
    globalAgents: null,
    config: prior.config ?? null,
  };

  for (const name of readdirSync(AGENTS_DIR).filter((name) => name.endsWith(".toml")).sort()) {
    const key = `agents/${name}`;
    const record = installFile(
      join(AGENTS_DIR, name),
      join(home, "agents", name),
      key,
      prior,
      options.force,
    );
    if (record) next.files[key] = record;
  }

  const routingRecord = installFile(
    ROUTING_FILE,
    join(home, "SUBAGENT_ROUTING.md"),
    "routing",
    prior,
    options.force,
  );
  if (routingRecord) next.files.routing = routingRecord;

  for (const [key, record] of Object.entries(prior.files)) {
    if (key in next.files) continue;
    const target = record.target;
    if (!existsSync(target) || sha256(read(target)) !== record.hash) {
      console.warn(`preserved stale modified or missing file: ${target}`);
      next.files[key] = record;
      continue;
    }
    if (record.ownership === "created") {
      rmSync(target);
      console.log(`removed stale: ${target}`);
    } else if (record.ownership === "replaced" && record.backup && existsSync(record.backup)) {
      copyFileSync(record.backup, target);
      console.log(`restored stale: ${target}`);
    }
  }

  const globalAgents = join(home, "AGENTS.md");
  const original = existsSync(globalAgents) ? readText(globalAgents) : "";
  const updated = replaceOrAppendBlock(
    original,
    readText(ROUTING_FILE),
    GLOBAL_BEGIN,
    GLOBAL_END,
  );
  if (updated !== original) {
    backup(globalAgents);
    write(globalAgents, updated);
    console.log(`updated: ${globalAgents}`);
  }
  next.globalAgents = { target: globalAgents };
  saveState(home, next);

  const commitPusher = join(home, "agents", "commit-pusher.toml");
  if (existsSync(commitPusher)) {
    console.warn(`warning: existing unmanaged commit-pusher remains at ${commitPusher}`);
  }
  console.log(`Codex kit ${PACKAGE.version} installed under ${home}`);
}

function configureGlobal(options: Options): void {
  const home = options.codexHome;
  mkdirSync(home, { recursive: true });
  const configFile = join(home, "config.toml");
  const desired: Record<ConfigKey, string> = {
    model: options.orchestrator,
    model_reasoning_effort: options.reasoningEffort,
  };
  const priorState = loadState(home);
  const original = existsSync(configFile) ? readText(configFile) : "";
  const current = topLevelConfigEntries(original);
  const priorConfig = priorState.config;

  if (priorConfig?.target === configFile) {
    const changedByUser = (Object.entries(priorConfig.desired) as [ConfigKey, string][]).some(([key, value]) => {
      const entry = current.get(key);
      return !entry || entry.value !== tomlString(value);
    });
    if (changedByUser && !options.force) {
      console.warn(`preserved modified config: ${configFile} (use --force to replace)`);
      return;
    }
  }

  const updated = setTopLevelConfig(original, desired);
  if (updated !== original) {
    backup(configFile);
    write(configFile, updated);
    console.log(`configured orchestrator: ${configFile}`);
  } else console.log(`unchanged: ${configFile}`);

  const previous: Partial<Record<ConfigKey, StoredConfigValue>> = priorConfig?.previous ?? {};
  for (const key of Object.keys(desired) as ConfigKey[]) {
    if (key in previous) continue;
    const entry = current.get(key);
    previous[key] = entry
      ? { present: true, value: entry.value }
      : { present: false };
  }
  priorState.version = PACKAGE.version;
  priorState.config = {
    target: configFile,
    desired,
    previous,
  };
  saveState(home, priorState);
  console.log(`Orchestrator: ${desired.model}`);
  console.log(`Reasoning effort: ${desired.model_reasoning_effort}`);
}

function listGlobal(options: Options): void {
  const home = options.codexHome;
  const configFile = join(home, "config.toml");
  const globalAgents = join(home, "AGENTS.md");
  const routingFile = join(home, "SUBAGENT_ROUTING.md");
  const agentsDir = join(home, "agents");
  const stateFile = join(home, STATE_FILE);
  const state = loadState(home);
  const config = existsSync(configFile) ? topLevelConfigEntries(readText(configFile)) : new Map();
  const value = (key: ConfigKey): string => {
    const raw = config.get(key)?.value;
    if (!raw) return "not set";
    try {
      return String(JSON.parse(raw));
    } catch {
      return raw;
    }
  };
  const managedTargets = new Set(Object.values(state.files).map((record) => record.target));

  console.log(`Codex home: ${home}`);
  console.log(`Config: ${configFile}${existsSync(configFile) ? "" : " (missing)"}`);
  console.log(`Orchestrator: ${value("model")}`);
  console.log(`Reasoning effort: ${value("model_reasoning_effort")}`);
  console.log(`Kit state: ${existsSync(stateFile) ? state.version : "not installed"}`);
  const hasRoutingBlock = existsSync(globalAgents) && readText(globalAgents).includes(GLOBAL_BEGIN);
  console.log(`Global routing: ${hasRoutingBlock ? "installed" : "not installed"}`);
  console.log(`Routing file: ${existsSync(routingFile) ? routingFile : "missing"}`);
  console.log("Custom agents:");
  const agents = existsSync(agentsDir)
    ? readdirSync(agentsDir).filter((name) => name.endsWith(".toml")).sort()
    : [];
  if (!agents.length) return console.log("  (none)");
  for (const filename of agents) {
    const file = join(agentsDir, filename);
    const contents = readText(file);
    const field = (key: "name" | "model" | "model_reasoning_effort"): string =>
      new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m").exec(contents)?.[1] ?? "not set";
    const ownership = managedTargets.has(file) ? "managed" : "unmanaged";
    console.log(`  ${field("name")} — ${field("model")}, ${field("model_reasoning_effort")} (${ownership})`);
  }
}

function uninstallGlobal(options: Options): void {
  const home = options.codexHome;
  const statePath = join(home, STATE_FILE);
  if (!existsSync(statePath)) {
    console.log(`No installer state at ${statePath}; nothing removed.`);
    return;
  }
  const state = loadState(home);
  for (const record of Object.values(state.files)) {
    const target = record.target;
    if (!existsSync(target) || sha256(read(target)) !== record.hash) {
      console.warn(`preserved modified or missing file: ${target}`);
      continue;
    }
    if (record.ownership === "created") {
      rmSync(target);
      console.log(`removed: ${target}`);
    } else if (record.ownership === "replaced" && record.backup && existsSync(record.backup)) {
      copyFileSync(record.backup, target);
      console.log(`restored: ${target}`);
    } else {
      console.log(`preserved pre-existing file: ${target}`);
    }
  }

  const globalAgents = state.globalAgents?.target ?? join(home, "AGENTS.md");
  if (existsSync(globalAgents)) {
    const original = readText(globalAgents);
    const updated = removeBlock(original, GLOBAL_BEGIN, GLOBAL_END);
    if (updated !== original) {
      backup(globalAgents);
      if (updated) write(globalAgents, updated);
      else rmSync(globalAgents);
      console.log(`removed managed routing from: ${globalAgents}`);
    }
  }
  if (state.config?.target) {
    const configFile = state.config.target;
    if (!existsSync(configFile)) {
      console.warn(`preserved missing config: ${configFile}`);
    } else {
      const originalConfig = readText(configFile);
      const current = topLevelConfigEntries(originalConfig);
      const changed = (Object.entries(state.config.desired) as [ConfigKey, string][]).some(([key, value]) => {
        const entry = current.get(key);
        return !entry || entry.value !== tomlString(value);
      });
      if (changed) {
        console.warn(`preserved modified config: ${configFile}`);
      } else {
        const restored = restoreTopLevelConfig(originalConfig, state.config);
        if (restored !== originalConfig) {
          backup(configFile);
          if (restored.trim()) write(configFile, restored);
          else rmSync(configFile);
          console.log(`restored config: ${configFile}`);
        }
      }
    }
  }
  rmSync(statePath);
  console.log(`Codex kit uninstalled from ${home}`);
}

function syncProject(options: Options): void {
  const cwd = options.cwd;
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new Error(`Not a directory: ${cwd}`);
  const agentsFile = join(cwd, "AGENTS.md");
  const stagedTemplate = join(cwd, "TEMPLATE_AGENTS.md");
  const template = readText(TEMPLATE_FILE);
  const desired = Buffer.from(template);
  const sourceHash = sha256(desired);
  const state = loadProjectState(cwd);
  const previousAvailable = state.template.availableHash;

  if (existsSync(stagedTemplate)) {
    const currentHash = sha256(read(stagedTemplate));
    const locallyModified = currentHash !== sourceHash && (!previousAvailable || currentHash !== previousAvailable);
    if (locallyModified && currentHash !== sourceHash && !options.force) {
      console.warn(`preserved locally modified template: ${stagedTemplate} (use --force to replace)`);
      console.log(`The installed kit has template ${PACKAGE.version}; review the local change before syncing.`);
      return;
    }
    if (currentHash === sourceHash) console.log(`unchanged: ${stagedTemplate}`);
    else {
      backup(stagedTemplate);
      write(stagedTemplate, desired);
      console.log(`refreshed template reference: ${stagedTemplate}`);
    }
  } else {
    write(stagedTemplate, desired);
    console.log(`created template reference: ${stagedTemplate}`);
  }

  state.version = 1;
  state.template = {
    ...state.template,
    availableHash: sourceHash,
    availableVersion: PACKAGE.version,
  };
  saveProjectState(cwd, state);

  if (!existsSync(agentsFile)) {
    const contents = "# Project-Specific Instructions\n\n<!-- Add repository-specific commands, architecture, and exceptions here. -->\n";
    write(agentsFile, contents);
    console.log(`created project instructions file: ${agentsFile}`);
  } else if (readText(agentsFile).includes(PROJECT_BEGIN) || readText(agentsFile).includes(PROJECT_END)) {
    console.warn(`preserved legacy managed template in: ${agentsFile}`);
    console.warn("Ask Codex to migrate it to semantic template reconciliation before applying updates.");
  }
  console.log(templatePrompt());
}

function projectStatus(options: Options): void {
  const cwd = options.cwd;
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new Error(`Not a directory: ${cwd}`);
  const stagedTemplate = join(cwd, "TEMPLATE_AGENTS.md");
  const agentsFile = join(cwd, "AGENTS.md");
  const state = loadProjectState(cwd);
  const availableHash = state.template.availableHash ?? null;
  const appliedHash = state.template.appliedHash ?? null;
  const sourceHash = sha256(read(TEMPLATE_FILE));
  const localHash = existsSync(stagedTemplate) ? sha256(read(stagedTemplate)) : null;

  console.log(`Project: ${cwd}`);
  if (!localHash) return console.log("Status: not initialized (run codex-kit project sync)");
  if (!existsSync(agentsFile)) return console.log("Status: AGENTS.md missing (reconcile the template first)");
  console.log(`Available: ${state.template.availableVersion ?? "unknown"} (${availableHash ?? "untracked"})`);
  console.log(`Applied:   ${appliedHash ?? "never"}`);
  if (sourceHash !== availableHash) return console.log("Status: kit template update available; run project sync");
  if (localHash !== availableHash) return console.log("Status: local template changed; review it before syncing");
  if (appliedHash !== localHash) return console.log("Status: reconciliation required");
  console.log("Status: up to date");
}

function markApplied(options: Options): void {
  const cwd = options.cwd;
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new Error(`Not a directory: ${cwd}`);
  const stagedTemplate = join(cwd, "TEMPLATE_AGENTS.md");
  const agentsFile = join(cwd, "AGENTS.md");
  if (!existsSync(stagedTemplate)) throw new Error(`Missing ${stagedTemplate}; run project sync first.`);
  if (!existsSync(agentsFile)) throw new Error(`Missing ${agentsFile}; reconcile the template into AGENTS.md first.`);
  const state = loadProjectState(cwd);
  const appliedHash = sha256(read(stagedTemplate));
  state.version = 1;
  state.template = {
    ...state.template,
    appliedHash,
    appliedAt: new Date().toISOString(),
  };
  saveProjectState(cwd, state);
  console.log(`recorded template reconciliation: ${stagedTemplate}`);
}

function compareVersions(left: string, right: string): number {
  const parseVersion = (value: string): { numbers: [number, number, number]; prerelease: string | null } => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
    if (!match) throw new Error(`Invalid package version: ${value}`);
    return {
      numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
      prerelease: match[4] ?? null,
    };
  };
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index++) {
    const leftNumber = a.numbers[index]!;
    const rightNumber = b.numbers[index]!;
    if (leftNumber !== rightNumber) return Math.sign(leftNumber - rightNumber);
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return Math.sign(a.prerelease.localeCompare(b.prerelease, "en", { numeric: true }));
}

function checkVersion(): void {
  let latest = process.env.CODEX_KIT_LATEST_VERSION;
  if (!latest) {
    const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const result = spawnSync(
      executable,
      ["view", PACKAGE.name, "version", "--json", `--registry=${REGISTRY}`],
      { encoding: "utf8", timeout: 15_000 },
    );
    if (result.error) throw new Error(`Unable to run pnpm: ${result.error.message}`);
    if (result.status !== 0) {
      const detail = result.stderr.trim() || "pnpm view failed";
      throw new Error(`Unable to check ${REGISTRY}: ${detail}`);
    }
    try {
      const value: unknown = JSON.parse(result.stdout);
      latest = Array.isArray(value) && typeof value.at(-1) === "string"
        ? value.at(-1)
        : typeof value === "string"
          ? value
          : undefined;
    } catch {
      latest = result.stdout.trim();
    }
  }
  if (typeof latest !== "string" || !latest) throw new Error("Registry returned no package version.");

  console.log(`Installed: ${PACKAGE.version}`);
  console.log(`Latest:    ${latest}`);
  const comparison = compareVersions(PACKAGE.version, latest);
  if (comparison === 0) return console.log("codex-kit is up to date.");
  if (comparison > 0) return console.log("This local build is newer than the published package.");
  console.log(`Update available. Run:
  pnpm add --global ${PACKAGE.name}@latest
  codex-kit global install`);
}

function parse(argv: string[]): Options {
  const options: Options = {
    cwd: process.cwd(),
    codexHome: resolve(process.env.CODEX_HOME || join(homedir(), ".codex")),
    orchestrator: DEFAULT_ORCHESTRATOR,
    reasoningEffort: DEFAULT_REASONING_EFFORT,
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
    } else if (arg === "--reasoning-effort") {
      const value = argv[++index];
      if (!value) throw new Error(`${arg} requires a value.`);
      options.reasoningEffort = value;
    } else options.positionals.push(arg);
  }
  return options;
}

function help(): void {
  console.log(`codex-kit ${PACKAGE.version}

Usage:
  codex-kit global install [--codex-home PATH] [--force]
  codex-kit global configure [--orchestrator MODEL] [--reasoning-effort LEVEL]
  codex-kit global list [--codex-home PATH]
  codex-kit global uninstall [--codex-home PATH]
  codex-kit project init [--cwd PATH]
  codex-kit project sync [--cwd PATH]
  codex-kit project status [--cwd PATH]
  codex-kit project mark-applied [--cwd PATH]
  codex-kit version check
  codex-kit --help
  codex-kit --version

Global configure defaults to gpt-5.6-sol with high reasoning and edits only
the top-level model settings in CODEX_HOME/config.toml.
Global install manages custom agents and a marked routing block under CODEX_HOME.
Project sync refreshes TEMPLATE_AGENTS.md and never merges it into AGENTS.md.`);
}

export function main(argv: string[] = process.argv.slice(2)): void {
  const options = parse(argv);
  if (options.positionals.includes("--version")) return console.log(PACKAGE.version);
  if (!options.positionals.length || options.positionals.includes("--help")) return help();
  const [scope, action] = options.positionals;
  if (scope === "global" && action === "install") return installGlobal(options);
  if (scope === "global" && action === "configure") return configureGlobal(options);
  if (scope === "global" && action === "list") return listGlobal(options);
  if (scope === "global" && action === "uninstall") return uninstallGlobal(options);
  if (scope === "project" && (action === "init" || action === "sync")) return syncProject(options);
  if (scope === "project" && action === "status") return projectStatus(options);
  if (scope === "project" && action === "mark-applied") return markApplied(options);
  if (scope === "version" && action === "check") return checkVersion();
  throw new Error(`Unknown command: ${options.positionals.join(" ")}`);
}

if (
  process.argv[1] &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    main();
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
