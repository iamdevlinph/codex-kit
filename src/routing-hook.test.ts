import {
	assert,
	join,
	mkdtempSync,
	rmSync,
	run,
	runRoutingHook,
	test,
	tmpdir,
} from "./test-support/cli.js";

test("routing hook injects semantic policy and briefs subagents", () => {
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
		assert.match(
			promptOutput,
			/quick-implementer.*explicit manual delegation/s,
		);
		assert.match(promptOutput, /code-reviewer/);
		assert.match(promptOutput, /UI\/style preflight/);
		assert.match(promptOutput, /closest same-purpose shipped features/);
		assert.match(promptOutput, /whether to keep, update, or override/);
		assert.match(promptOutput, /rendered comparison unavailable/);
		assert.match(
			promptOutput,
			/Every new or materially changed feature follows this mandatory workflow/,
		);
		assert.match(promptOutput, /map each responsibility to its final file/);
		assert.match(
			promptOutput,
			/Every\s+completed feature receives automatic structural review/,
		);
		assert.match(
			promptOutput,
			/Pages, routes, controllers, commands, and\s+entrypoints contain composition and orchestration only/,
		);
		assert.match(
			promptOutput,
			/Avoid generic `utils`, `helpers`, or `components` dumping grounds/,
		);
		assert.doesNotMatch(promptOutput, /\b300\b/);
		assert.match(
			promptOutput,
			/Agent definitions, not this policy, determine each role's model/,
		);

		assert.equal(
			runRoutingHook(home, {
				hook_event_name: "PreToolUse",
				tool_name: "apply_patch",
				tool_input: { command: "*** Begin Patch" },
			}),
			"",
		);

		const started = JSON.parse(
			runRoutingHook(home, {
				hook_event_name: "SubagentStart",
				session_id: "worker-session",
				turn_id: "worker-turn",
				agent_id: "worker-1",
				agent_type: "quick-implementer",
			}),
		) as { hookSpecificOutput: { additionalContext: string } };
		assert.match(
			started.hookSpecificOutput.additionalContext,
			/without further delegation/,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
