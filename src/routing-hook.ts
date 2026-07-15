#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface HookInput {
  hook_event_name?: string;
  agent_type?: string;
}

const home = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routingFile = join(home, "SUBAGENT_ROUTING.md");
const input = JSON.parse(readFileSync(0, "utf8")) as HookInput;

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
  process.stdout.write(hookContext(
    "SubagentStart",
    `You are the delegated ${input.agent_type ?? "worker"}. ` +
      "Follow the assigned scope, perform the role's work directly without further delegation, validate it, and return concise evidence.",
  ));
}
