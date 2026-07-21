import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

const ROOT = resolve(process.cwd());
const CLI = join(ROOT, "bin", "codex-kit.js");

function run(args: string[], options: RunOptions = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: options.cwd ?? ROOT,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function runRoutingHook(home: string, input: Record<string, unknown>) {
  const result = spawnSync(process.execPath, [join(home, "codex-kit", "routing-hook.js")], {
    input: JSON.stringify(input),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("CLI runs through a global-style symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-kit-bin-"));
  const linkedCli = join(root, "codex-kit");
  try {
    symlinkSync(CLI, linkedCli);
    const help = spawnSync(process.execPath, [linkedCli, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /Usage:/);

    const version = spawnSync(process.execPath, [linkedCli, "--version"], { encoding: "utf8" });
    const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      version: string;
    };
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout.trim(), manifest.version);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("help describes every command", () => {
  const help = run(["--help"]).stdout;
  for (const command of [
    "global install",
    "global configure",
    "global list",
    "global uninstall",
    "project init",
    "project sync",
    "project status",
    "project mark-applied",
    "version check",
    "--help",
    "--version",
  ]) {
    assert.match(help, new RegExp(command.replaceAll("-", "\\-")));
  }
  assert.match(help, /Refresh TEMPLATE_AGENTS\.md without editing AGENTS\.md/);
  assert.match(help, /Restore managed config values/);
  assert.match(help, /Options by command:/);
  assert.match(help, /global install\n\s+--codex-home PATH[^\n]+\n\s+--force/);
  assert.match(help, /global list, global uninstall\n\s+--codex-home PATH/);
  assert.match(help, /project init, project sync\n\s+--cwd PATH[^\n]+\n\s+--force/);
  assert.match(help, /--reasoning-effort LEVEL\s+Set normal reasoning effort \(default: low\)/);
  assert.match(help, /--plan-reasoning-effort LEVEL\s+Set Plan-mode reasoning effort \(default: high\)/);
  assert.match(help, /codex-kit global configure --reasoning-effort low --plan-reasoning-effort high/);
  assert.match(help, /codex-kit project sync --cwd \/path\/to\/project --force/);
});

test("global install and uninstall manage only package-owned files", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-kit-global-"));
  const home = join(root, ".codex");
  try {
    mkdirSync(home);
    const config = join(home, "config.toml");
    const hooks = join(home, "hooks.json");
    const originalHooks = {
      hooks: {
        SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "existing-hook" }] }],
      },
    };
    writeFileSync(config, 'model = "gpt-5.6-sol"\n');
    writeFileSync(hooks, `${JSON.stringify(originalHooks, null, 2)}\n`);
    writeFileSync(join(home, "AGENTS.md"), "# Existing global guidance\n");
    run(["global", "install", "--codex-home", home]);
    assert.deepEqual(readdirSync(join(home, "agents")).sort(), [
      "code-explorer.toml",
      "code-reviewer.toml",
      "implementer.toml",
      "quick-implementer.toml",
    ]);
    const globalAgents = readFileSync(join(home, "AGENTS.md"), "utf8");
    assert.match(globalAgents, /Existing global guidance/);
    assert.match(globalAgents, /BEGIN codex-kit:subagent-routing/);
    assert.match(globalAgents, /Route by role and task shape, never by a\s+model name/);
    assert.match(globalAgents, /spawn that exact role\s+before performing\s+the role's work/);
    assert.match(globalAgents, /changes spanning up to\s+roughly three files/);
    assert.match(globalAgents, /Multiple `implementer` instances may run concurrently only when a substantial\s+task divides into genuinely independent slices/);
    assert.match(globalAgents, /exclusive\s+ownership of named files or modules and a separate validation scope/);
    assert.match(globalAgents, /Do not\s+spawn duplicate agents merely because multiple files are involved/);
    assert.match(globalAgents, /quick-implementer.*explicit manual delegation/s);
    assert.match(globalAgents, /run only\s+lightweight integration checks/);
    assert.match(globalAgents, /Wait once for at most 60 seconds/);
    assert.match(globalAgents, /five minutes\s+for `implementer`/);
    assert.match(globalAgents, /no result within two minutes is hung/);
    assert.match(globalAgents, /implementation agent performs its edits directly and must not\s+delegate them again/);
    const installedHooks = readFileSync(hooks, "utf8");
    assert.match(installedHooks, /existing-hook/);
    assert.match(installedHooks, /UserPromptSubmit/);
    assert.match(installedHooks, /SubagentStart/);
    assert.doesNotMatch(installedHooks, /SubagentStop/);
    assert.doesNotMatch(installedHooks, /PreToolUse/);
    assert.equal(readFileSync(config, "utf8"), 'model = "gpt-5.6-sol"\n');
    assert.ok(existsSync(join(home, "codex-kit", "routing-hook.js")));
    const reconciliationSkill = join(home, "skills", "codex-kit-reconcile-agents", "SKILL.md");
    const reconciliationSkillMetadata = join(home, "skills", "codex-kit-reconcile-agents", "agents", "openai.yaml");
    assert.match(readFileSync(reconciliationSkill, "utf8"), /semantic|reconcile/i);
    assert.match(readFileSync(reconciliationSkill, "utf8"), /do not create speculative/);
    assert.match(readFileSync(reconciliationSkill, "utf8"), /available skill validator/);
    assert.match(readFileSync(reconciliationSkill, "utf8"), /Do not add, recreate, or\s+depend on managed markers/);
    assert.match(readFileSync(reconciliationSkillMetadata, "utf8"), /\$codex-kit-reconcile-agents/);

    const explorer = join(home, "agents", "code-explorer.toml");
    writeFileSync(explorer, `${readFileSync(explorer, "utf8")}\n# local edit\n`);
    const reinstall = run(["global", "install", "--codex-home", home]);
    assert.match(reinstall.stderr, /preserved modified/);

    run(["global", "uninstall", "--codex-home", home]);
    assert.match(readFileSync(explorer, "utf8"), /local edit/);
    assert.deepEqual(JSON.parse(readFileSync(hooks, "utf8")), originalHooks);
    assert.equal(existsSync(join(home, "codex-kit", "routing-hook.js")), false);
    assert.equal(existsSync(reconciliationSkill), false);
    assert.equal(existsSync(reconciliationSkillMetadata), false);
    assert.equal(existsSync(join(home, "skills", "codex-kit-reconcile-agents")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("global install restores a replaced user reconciliation skill on uninstall", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-kit-user-skill-"));
  const home = join(root, ".codex");
  const skillDir = join(home, "skills", "codex-kit-reconcile-agents");
  const skill = join(skillDir, "SKILL.md");
  try {
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(skill, "# User reconciliation skill\n");
    const preserved = run(["global", "install", "--codex-home", home]);
    assert.match(preserved.stderr, /preserved modified or pre-existing file/);
    assert.equal(readFileSync(skill, "utf8"), "# User reconciliation skill\n");

    run(["global", "install", "--codex-home", home, "--force"]);
    assert.match(readFileSync(skill, "utf8"), /codex-kit project mark-applied/);
    run(["global", "uninstall", "--codex-home", home]);
    assert.equal(readFileSync(skill, "utf8"), "# User reconciliation skill\n");
    assert.equal(existsSync(join(skillDir, "agents", "openai.yaml")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("routing hook injects balanced policy and briefs subagents", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-kit-routing-hook-"));
  const home = join(root, ".codex");
  try {
    run(["global", "install", "--codex-home", home]);
    run(["global", "configure", "--codex-home", home]);

    const promptOutput = runRoutingHook(home, {
      hook_event_name: "UserPromptSubmit",
      model: "gpt-5.6-sol",
      permission_mode: "default",
      prompt: "Implement the plan.",
    });
    assert.match(promptOutput, /classify the work using this file/i);
    assert.match(promptOutput, /quick-implementer.*explicit manual delegation/s);
    assert.match(promptOutput, /code-reviewer/);
    assert.match(promptOutput, /Agent definitions, not this policy, determine each role's model/);

    assert.equal(runRoutingHook(home, {
      hook_event_name: "PreToolUse",
      tool_name: "apply_patch",
      tool_input: { command: "*** Begin Patch" },
    }), "");

    const started = JSON.parse(runRoutingHook(home, {
      hook_event_name: "SubagentStart",
      session_id: "worker-session",
      turn_id: "worker-turn",
      agent_id: "worker-1",
      agent_type: "quick-implementer",
    })) as { hookSpecificOutput: { additionalContext: string } };
    assert.match(started.hookSpecificOutput.additionalContext, /without further delegation/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("global configure sets the Sol orchestrator without replacing unrelated config", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-kit-configure-"));
  const home = join(root, ".codex");
  try {
    mkdirSync(home);
    const config = join(home, "config.toml");
    const original = 'model = "gpt-5.6-luna"\nplan_mode_reasoning_effort = "low"\nservice_tier = "default"\n\n[projects."/tmp/example"]\ntrust_level = "trusted"\n';
    writeFileSync(config, original);
    run(["global", "configure", "--codex-home", home]);
    const configured = readFileSync(config, "utf8");
    assert.match(configured, /model = "gpt-5.6-sol"/);
    assert.match(configured, /model_reasoning_effort = "low"/);
    assert.match(configured, /plan_mode_reasoning_effort = "high"/);
    assert.match(configured, /service_tier = "default"/);
    assert.match(configured, /trust_level = "trusted"/);

    run([
      "global", "configure", "--codex-home", home, "--force",
      "--reasoning-effort", "low", "--plan-reasoning-effort", "medium",
    ]);
    const customized = readFileSync(config, "utf8");
    assert.match(customized, /model_reasoning_effort = "low"/);
    assert.match(customized, /plan_mode_reasoning_effort = "medium"/);

    run(["global", "uninstall", "--codex-home", home]);
    assert.equal(readFileSync(config, "utf8"), original);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("global list summarizes model, routing, agents, and kit ownership", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-kit-list-"));
  const home = join(root, ".codex");
  try {
    run(["global", "install", "--codex-home", home]);
    run(["global", "configure", "--codex-home", home]);
    const result = run(["global", "list", "--codex-home", home]);
    assert.match(result.stdout, /Orchestrator: gpt-5\.6-sol/);
    assert.match(result.stdout, /Reasoning effort: low/);
    assert.match(result.stdout, /Plan mode reasoning effort: high/);
    assert.match(result.stdout, /Global routing: installed/);
    assert.match(result.stdout, /Routing hook: installed/);
    assert.match(result.stdout, /Reconciliation skill: installed/);
    assert.match(result.stdout, /code-explorer — gpt-5\.6-terra, medium \(managed\)/);
    assert.match(result.stdout, /code-reviewer — gpt-5\.6-sol, high \(managed\)/);
    assert.match(result.stdout, /implementer — gpt-5\.6-luna, high \(managed\)/);
    assert.match(result.stdout, /quick-implementer — gpt-5\.6-luna, medium \(managed\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project sync keeps AGENTS.md separate and prints skill-aware reconciliation guidance", () => {
  const project = mkdtempSync(join(tmpdir(), "codex-kit-project-"));
  try {
    run(["project", "init", "--cwd", project]);
    const agents = join(project, "AGENTS.md");
    assert.match(readFileSync(agents, "utf8"), /# Project-Specific Instructions/);
    writeFileSync(agents, `${readFileSync(agents, "utf8")}\n- Keep this local rule.\n`);
    const result = run(["project", "sync", "--cwd", project]);
    assert.match(readFileSync(agents, "utf8"), /Keep this local rule/);
    const template = readFileSync(join(project, "TEMPLATE_AGENTS.md"), "utf8");
    assert.match(template, /Shared Agent Defaults/);
    assert.match(template, /Instructions And Skills/);
    assert.match(template, /For behavior changes and bug fixes, add or update the smallest focused/);
    assert.match(template, /Do not introduce a test framework or create low-value tests/);
    assert.match(template, /Run the relevant focused tests after changing tested behavior/);
    assert.match(readFileSync(join(project, ".codex-kit-state.json"), "utf8"), /availableHash/);
    assert.match(result.stdout, /\.agents\/skills/);
    assert.match(result.stdout, /\$codex-kit-reconcile-agents/);
    assert.match(result.stdout, /always-on safety and authorization rules/);
    assert.match(result.stdout, /extract only concrete/);
    assert.match(result.stdout, /do not copy the complete\s+template or introduce managed markers/);
    assert.match(result.stdout, /Mark applied only after reconciliation/);
    assert.doesNotMatch(result.stdout, /BEGIN codex-kit:shared-template/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("project sync never overwrites an unmanaged AGENTS.md", () => {
  const project = mkdtempSync(join(tmpdir(), "codex-kit-unmanaged-"));
  try {
    const agents = join(project, "AGENTS.md");
    writeFileSync(agents, "# Existing\n\n- Preserve me.\n");
    run(["project", "sync", "--cwd", project]);
    assert.equal(readFileSync(agents, "utf8"), "# Existing\n\n- Preserve me.\n");
    assert.match(readFileSync(join(project, "TEMPLATE_AGENTS.md"), "utf8"), /Shared Agent Defaults/);
    assert.match(readFileSync(join(project, "AGENTS.md"), "utf8"), /Preserve me/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("project status and mark-applied track semantic reconciliation", () => {
  const project = mkdtempSync(join(tmpdir(), "codex-kit-status-"));
  try {
    run(["project", "init", "--cwd", project]);
    const pending = run(["project", "status", "--cwd", project]);
    assert.match(pending.stdout, /reconciliation required/);
    run(["project", "mark-applied", "--cwd", project]);
    const current = run(["project", "status", "--cwd", project]);
    assert.match(current.stdout, /up to date/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("project sync preserves an independently modified template", () => {
  const project = mkdtempSync(join(tmpdir(), "codex-kit-template-edit-"));
  try {
    run(["project", "init", "--cwd", project]);
    const template = join(project, "TEMPLATE_AGENTS.md");
    writeFileSync(template, `${readFileSync(template, "utf8")}\n- Local candidate rule.\n`);
    const result = run(["project", "sync", "--cwd", project]);
    assert.match(result.stderr, /preserved locally modified template/);
    assert.match(readFileSync(template, "utf8"), /Local candidate rule/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("publishing targets public npm through trusted publishing", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    files?: string[];
    publishConfig?: { access?: string; registry?: string };
  };
  assert.deepEqual(manifest.publishConfig, {
    registry: "https://registry.npmjs.org",
    access: "public",
  });
  assert.equal(manifest.files?.includes("MAINTAINERS.md"), false);
  assert.equal(existsSync(join(ROOT, ".npmrc")), false);

  const workflow = readFileSync(join(ROOT, ".github", "workflows", "publish.yml"), "utf8");
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /registry-url: https:\/\/registry\.npmjs\.org/);
  assert.match(workflow, /npm publish --access public/);
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|NPM_TOKEN|npm\.pkg\.github\.com/);
});

test("version check reports an available public package update", () => {
  const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    version: string;
  };
  const major = Number.parseInt(version, 10);
  assert.ok(Number.isSafeInteger(major));
  const latestVersion = `${major + 1}.0.0`;
  const result = run(["version", "check"], {
    env: { CODEX_KIT_LATEST_VERSION: latestVersion },
  });
  assert.ok(result.stdout.includes(`Installed: ${version}\n`));
  assert.ok(result.stdout.includes(`Latest:    ${latestVersion}\n`));
  assert.match(result.stdout, /Update available/);
  assert.match(result.stdout, /pnpm add --global @iamdevlinph\/codex-kit@latest/);
});
