#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets");
const AGENTS_DIR = join(ASSETS, "agents");
const ROUTING_FILE = join(ASSETS, "SUBAGENT_ROUTING.md");
const TEMPLATE_FILE = join(ASSETS, "TEMPLATE_AGENTS.md");
const PACKAGE = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const GLOBAL_BEGIN = "<!-- BEGIN codex-kit:subagent-routing -->";
const GLOBAL_END = "<!-- END codex-kit:subagent-routing -->";
const PROJECT_BEGIN = "<!-- BEGIN codex-kit:shared-template -->";
const PROJECT_END = "<!-- END codex-kit:shared-template -->";
const STATE_FILE = ".codex-kit-state.json";
const PROJECT_STATE_FILE = ".codex-kit-state.json";
const REGISTRY = PACKAGE.publishConfig?.registry ?? "https://registry.npmjs.org";
const DEFAULT_ORCHESTRATOR = "gpt-5.6-sol";
const DEFAULT_REASONING_EFFORT = "high";

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const read = (file) => readFileSync(file);
const readText = (file) => readFileSync(file, "utf8");

function timestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "");
}

function backup(file) {
  if (!existsSync(file)) return null;
  let destination = `${file}.codex-kit.bak-${timestamp()}`;
  let suffix = 1;
  while (existsSync(destination)) destination = `${file}.codex-kit.bak-${timestamp()}-${suffix++}`;
  copyFileSync(file, destination);
  console.log(`backup: ${destination}`);
  return destination;
}

function write(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.codex-kit.tmp-${process.pid}`;
  writeFileSync(temporary, data);
  renameSync(temporary, file);
}

function loadState(home) {
  const file = join(home, STATE_FILE);
  if (!existsSync(file)) return { version: PACKAGE.version, files: {} };
  try {
    const state = JSON.parse(readText(file));
    return state && typeof state === "object" && state.files
      ? state
      : { version: PACKAGE.version, files: {} };
  } catch {
    throw new Error(`${file} is not valid JSON; move it aside before reinstalling.`);
  }
}

function saveState(home, state) {
  write(join(home, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

function topLevelConfigEntries(contents) {
  const entries = new Map();
  let inTable = false;
  for (const line of contents.split("\n")) {
    if (/^\s*\[/.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable) continue;
    const match = /^(\s*)(model|model_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !entries.has(match[2])) entries.set(match[2], { value: match[3], line });
  }
  return entries;
}

function tomlString(value) {
  return JSON.stringify(value);
}

function setTopLevelConfig(contents, desired) {
  const lines = contents.split("\n");
  const seen = new Set();
  let firstTable = lines.length;
  for (let index = 0; index < lines.length; index++) {
    if (/^\s*\[/.test(lines[index])) {
      firstTable = index;
      break;
    }
  }
  for (let index = 0; index < firstTable; index++) {
    const match = /^(\s*)(model|model_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(lines[index]);
    if (!match || seen.has(match[2])) continue;
    lines[index] = `${match[1]}${match[2]} = ${tomlString(desired[match[2]])}`;
    seen.add(match[2]);
  }
  const missing = Object.keys(desired)
    .filter((key) => !seen.has(key))
    .map((key) => `${key} = ${tomlString(desired[key])}`);
  if (missing.length) lines.splice(0, 0, ...missing, "");
  return lines.join("\n");
}

function restoreTopLevelConfig(contents, config) {
  const desired = config.desired ?? {};
  const previous = config.previous ?? {};
  const lines = contents.split("\n");
  let firstTable = lines.length;
  for (let index = 0; index < lines.length; index++) {
    if (/^\s*\[/.test(lines[index])) {
      firstTable = index;
      break;
    }
  }
  const restored = new Set();
  for (let index = 0; index < firstTable; index++) {
    const match = /^(\s*)(model|model_reasoning_effort)\s*=\s*(.*?)\s*$/.exec(lines[index]);
    if (!match || !(match[2] in desired) || restored.has(match[2])) continue;
    if (match[3] !== tomlString(desired[match[2]])) continue;
    if (previous[match[2]]?.present) {
      lines[index] = `${match[1]}${match[2]} = ${previous[match[2]].value}`;
    } else {
      lines.splice(index, 1);
      index--;
      firstTable--;
    }
    restored.add(match[2]);
  }
  if (Object.values(previous).some((entry) => !entry.present) && lines[0] === "") lines.shift();
  return lines.join("\n");
}

function loadProjectState(cwd) {
  const file = join(cwd, PROJECT_STATE_FILE);
  if (!existsSync(file)) return { version: 1, template: {} };
  try {
    const state = JSON.parse(readText(file));
    return state && typeof state === "object" && state.template ? state : { version: 1, template: {} };
  } catch {
    throw new Error(`${file} is not valid JSON; move it aside before syncing.`);
  }
}

function saveProjectState(cwd, state) {
  write(join(cwd, PROJECT_STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

function templatePrompt() {
  return `Template reference updated. Ask Codex:\n\nThe project's TEMPLATE_AGENTS.md was refreshed from codex-kit. Compare it with\nAGENTS.md and merge only new or changed reusable guidelines that apply to this\nrepository. Preserve project-specific instructions and existing adaptations. Do\nnot replace AGENTS.md wholesale. If a template rule conflicts with a local rule,\nkeep the local rule and report the conflict. Summarize what was added, updated,\nskipped, or adapted, and why. When finished, run codex-kit project mark-applied.`;
}

function managedBlock(content, begin, end) {
  return `${begin}\n${content.trimEnd()}\n${end}`;
}

function replaceOrAppendBlock(original, content, begin, end) {
  const start = original.indexOf(begin);
  const finish = original.indexOf(end);
  if ((start >= 0) !== (finish >= 0) || (start >= 0 && finish < start)) {
    throw new Error(`Malformed managed block: expected both ${begin} and ${end}.`);
  }
  const block = managedBlock(content, begin, end);
  if (start >= 0) return `${original.slice(0, start)}${block}${original.slice(finish + end.length)}`;
  return `${original.trimEnd()}${original.trim() ? "\n\n" : ""}${block}\n`;
}

function removeBlock(original, begin, end) {
  const start = original.indexOf(begin);
  const finish = original.indexOf(end);
  if (start < 0 && finish < 0) return original;
  if (start < 0 || finish < start) throw new Error(`Malformed managed block in AGENTS.md.`);
  const before = original.slice(0, start).trimEnd();
  const after = original.slice(finish + end.length).trimStart();
  return `${before}${before && after ? "\n\n" : ""}${after}${before || after ? "\n" : ""}`;
}

function installFile(source, target, key, prior, force) {
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

function installGlobal(options) {
  const home = options.codexHome;
  mkdirSync(home, { recursive: true });
  const prior = loadState(home);
  const next = { version: PACKAGE.version, files: {}, globalAgents: null, config: prior.config ?? null };

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

function configureGlobal(options) {
  const home = options.codexHome;
  mkdirSync(home, { recursive: true });
  const configFile = join(home, "config.toml");
  const desired = {
    model: options.orchestrator,
    model_reasoning_effort: options.reasoningEffort,
  };
  const priorState = loadState(home);
  const original = existsSync(configFile) ? readText(configFile) : "";
  const current = topLevelConfigEntries(original);
  const priorConfig = priorState.config;

  if (priorConfig?.target === configFile) {
    const changedByUser = Object.entries(priorConfig.desired ?? {}).some(([key, value]) => {
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

  const previous = priorConfig?.previous ?? {};
  for (const key of Object.keys(desired)) {
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

function listGlobal(options) {
  const home = options.codexHome;
  const configFile = join(home, "config.toml");
  const globalAgents = join(home, "AGENTS.md");
  const routingFile = join(home, "SUBAGENT_ROUTING.md");
  const agentsDir = join(home, "agents");
  const stateFile = join(home, STATE_FILE);
  const state = loadState(home);
  const config = existsSync(configFile) ? topLevelConfigEntries(readText(configFile)) : new Map();
  const value = (key) => {
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
    const field = (key) => new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m").exec(contents)?.[1] ?? "not set";
    const ownership = managedTargets.has(file) ? "managed" : "unmanaged";
    console.log(`  ${field("name")} — ${field("model")}, ${field("model_reasoning_effort")} (${ownership})`);
  }
}

function uninstallGlobal(options) {
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
      const changed = Object.entries(state.config.desired ?? {}).some(([key, value]) => {
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

function syncProject(options) {
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

function projectStatus(options) {
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

function markApplied(options) {
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

function compareVersions(left, right) {
  const parseVersion = (value) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
    if (!match) throw new Error(`Invalid package version: ${value}`);
    return { numbers: match.slice(1, 4).map(Number), prerelease: match[4] ?? null };
  };
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index++) {
    if (a.numbers[index] !== b.numbers[index]) return Math.sign(a.numbers[index] - b.numbers[index]);
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return Math.sign(a.prerelease.localeCompare(b.prerelease, "en", { numeric: true }));
}

function checkVersion() {
  let latest = process.env.CODEX_KIT_LATEST_VERSION;
  if (!latest) {
    const executable = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = spawnSync(
      executable,
      ["view", PACKAGE.name, "version", "--json", `--registry=${REGISTRY}`],
      { encoding: "utf8", timeout: 15_000 },
    );
    if (result.error) throw new Error(`Unable to run npm: ${result.error.message}`);
    if (result.status !== 0) {
      const detail = result.stderr.trim() || "npm view failed";
      throw new Error(`Unable to check ${REGISTRY}: ${detail}`);
    }
    try {
      const value = JSON.parse(result.stdout);
      latest = Array.isArray(value) ? value.at(-1) : value;
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

function parse(argv) {
  const options = {
    cwd: process.cwd(),
    codexHome: resolve(process.env.CODEX_HOME || join(homedir(), ".codex")),
    orchestrator: DEFAULT_ORCHESTRATOR,
    reasoningEffort: DEFAULT_REASONING_EFFORT,
    force: false,
    positionals: [],
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--force") options.force = true;
    else if (arg === "--cwd" || arg === "--codex-home") {
      const value = argv[++index];
      if (!value) throw new Error(`${arg} requires a path.`);
      options[arg === "--cwd" ? "cwd" : "codexHome"] = resolve(value);
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

function help() {
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
  codex-kit --version

Global configure defaults to gpt-5.6-sol with high reasoning and edits only
the top-level model settings in CODEX_HOME/config.toml.
Global install manages custom agents and a marked routing block under CODEX_HOME.
Project sync refreshes TEMPLATE_AGENTS.md and never merges it into AGENTS.md.`);
}

export function main(argv = process.argv.slice(2)) {
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}
