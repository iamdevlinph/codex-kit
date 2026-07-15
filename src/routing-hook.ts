#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface HookInput {
  hook_event_name?: string;
  model?: string;
  session_id?: string;
  turn_id?: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  tool_input?: { command?: string };
}

const home = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routingFile = join(home, "SUBAGENT_ROUTING.md");
const allowancesDir = join(home, "codex-kit", "allowances");
const allowanceTtlMs = 15 * 60 * 1000;
const writeTools = new Set([
  "Edit",
  "Write",
  "MultiEdit",
  "NotebookEdit",
  "apply_patch",
  "ApplyPatch",
  "functions.apply_patch",
]);
const writeCommands = new Set([
  "chmod",
  "chown",
  "cp",
  "dd",
  "install",
  "ln",
  "mkdir",
  "mv",
  "rm",
  "rmdir",
  "rsync",
  "tee",
  "touch",
  "truncate",
]);
const gitWriteCommands = new Set([
  "add",
  "am",
  "apply",
  "checkout",
  "cherry-pick",
  "clean",
  "commit",
  "merge",
  "mv",
  "rebase",
  "reset",
  "restore",
  "revert",
  "rm",
  "stash",
  "switch",
]);
const input = JSON.parse(readFileSync(0, "utf8")) as HookInput;

function allowanceFile(payload: HookInput): string | null {
  if (!payload.session_id || !payload.turn_id) return null;
  const key = createHash("sha256")
    .update(`${payload.session_id}\0${payload.turn_id}`)
    .digest("hex");
  return join(allowancesDir, `${key}.json`);
}

function writeAllowance(payload: HookInput): boolean {
  const file = allowanceFile(payload);
  if (!file) return false;
  mkdirSync(allowancesDir, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify({
    agentId: payload.agent_id,
    agentType: payload.agent_type,
    expiresAt: Date.now() + allowanceTtlMs,
  }));
  renameSync(temporary, file);
  return true;
}

function removeAllowance(payload: HookInput): void {
  const file = allowanceFile(payload);
  if (file) rmSync(file, { force: true });
}

function hasAllowance(payload: HookInput): boolean {
  const file = allowanceFile(payload);
  if (!file || !existsSync(file)) return false;
  try {
    const value = JSON.parse(readFileSync(file, "utf8")) as { expiresAt?: number };
    if (typeof value.expiresAt === "number" && value.expiresAt > Date.now()) return true;
  } catch {
    // Invalid allowance files fail closed.
  }
  rmSync(file, { force: true });
  return false;
}

function pruneAllowances(): void {
  if (!existsSync(allowancesDir)) return;
  for (const name of readdirSync(allowancesDir)) {
    if (!name.endsWith(".json")) continue;
    const file = join(allowancesDir, name);
    try {
      const value = JSON.parse(readFileSync(file, "utf8")) as { expiresAt?: number };
      if (typeof value.expiresAt === "number" && value.expiresAt > Date.now()) continue;
    } catch {
      // Invalid allowance files are stale.
    }
    rmSync(file, { force: true });
  }
}

function isWriteShapedBash(command: string): boolean {
  if (/(^|[^<])(?:>>?|&>>?|\d>>?)\s*[^&]/.test(command)) return true;
  const commands = command.split(/(?:&&|\|\||;|\|)/).map((part) => part.trim()).filter(Boolean);
  return commands.some((segment) => {
    const tokens = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const executable = tokens[0]?.split("/").at(-1);
    if (!executable) return false;
    if (writeCommands.has(executable)) return true;
    if ((executable === "sed" || executable === "perl") && tokens.slice(1, 5).some((token) => /^-[^-]*i/.test(token))) return true;
    return executable === "git" && Boolean(tokens[1] && gitWriteCommands.has(tokens[1]));
  });
}

function hookContext(event: "SubagentStart", context: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: context,
    },
  });
}

if (input.hook_event_name === "UserPromptSubmit" && existsSync(routingFile)) {
  const routing = readFileSync(routingFile, "utf8").trim();
  process.stdout.write(
    `Codex-kit routing policy for this turn:\n\n${routing}\n\n` +
      "Classify the task using this policy before acting. When it requires delegation, " +
      "spawn the exact named role before doing that role's work. Agent definitions, not " +
      "this policy, determine each role's model and reasoning effort.",
  );
}

if (input.hook_event_name === "SubagentStart") {
  pruneAllowances();
  const recorded = writeAllowance(input);
  process.stdout.write(hookContext(
    "SubagentStart",
    `You are the delegated ${input.agent_type ?? "worker"}. ` +
      `${recorded ? "A temporary write lane is active." : "No write lane could be recorded."} ` +
      "Follow the assigned scope, perform the role's work directly without further delegation, validate it, and return concise evidence.",
  ));
}

if (input.hook_event_name === "SubagentStop") removeAllowance(input);

if (input.hook_event_name === "PreToolUse") {
  const writeAttempt = writeTools.has(input.tool_name ?? "") ||
    (input.tool_name === "Bash" && isWriteShapedBash(input.tool_input?.command ?? ""));
  if (writeAttempt && !input.agent_id && !hasAllowance(input)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "The root orchestrator may not write directly. Consult SUBAGENT_ROUTING.md and delegate to the exact role selected there.",
      },
    }));
  }
}
