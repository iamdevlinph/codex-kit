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

test("global install and uninstall manage only package-owned files", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-kit-global-"));
  const home = join(root, ".codex");
  try {
    mkdirSync(home);
    const config = join(home, "config.toml");
    writeFileSync(config, 'model = "gpt-5.6-sol"\n');
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
    assert.equal(readFileSync(config, "utf8"), 'model = "gpt-5.6-sol"\n');

    const explorer = join(home, "agents", "code-explorer.toml");
    writeFileSync(explorer, `${readFileSync(explorer, "utf8")}\n# local edit\n`);
    const reinstall = run(["global", "install", "--codex-home", home]);
    assert.match(reinstall.stderr, /preserved modified/);

    run(["global", "uninstall", "--codex-home", home]);
    assert.match(readFileSync(explorer, "utf8"), /local edit/);
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
    const original = 'model = "gpt-5.6-luna"\nservice_tier = "default"\n\n[projects."/tmp/example"]\ntrust_level = "trusted"\n';
    writeFileSync(config, original);
    run(["global", "configure", "--codex-home", home]);
    const configured = readFileSync(config, "utf8");
    assert.match(configured, /model = "gpt-5.6-sol"/);
    assert.match(configured, /model_reasoning_effort = "high"/);
    assert.match(configured, /service_tier = "default"/);
    assert.match(configured, /trust_level = "trusted"/);

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
    assert.match(result.stdout, /Reasoning effort: high/);
    assert.match(result.stdout, /Global routing: installed/);
    assert.match(result.stdout, /code-explorer — gpt-5\.6-luna, medium \(managed\)/);
    assert.match(result.stdout, /code-reviewer — gpt-5\.6-sol, high \(managed\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project sync keeps AGENTS.md separate from the template reference", () => {
  const project = mkdtempSync(join(tmpdir(), "codex-kit-project-"));
  try {
    run(["project", "init", "--cwd", project]);
    const agents = join(project, "AGENTS.md");
    writeFileSync(agents, `${readFileSync(agents, "utf8")}\n- Keep this local rule.\n`);
    run(["project", "sync", "--cwd", project]);
    assert.match(readFileSync(agents, "utf8"), /Keep this local rule/);
    assert.match(readFileSync(join(project, "TEMPLATE_AGENTS.md"), "utf8"), /Shared Agent Defaults/);
    assert.match(readFileSync(join(project, ".codex-kit-state.json"), "utf8"), /availableHash/);
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
