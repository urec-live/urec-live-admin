## Shared team workflow

Read `TEAM_WORKFLOW.md` before making changes. It defines the shared setup, task ownership, verification, and handoff rules for Codex and Claude Code. Existing architecture and roadmap notes below may be stale; check source and stay within the current task. Do not implement roadmap items without a task requesting them.

## Commit evidence

Every commit message must include a `Manual test:` section in its body. State the shortest reproducible steps, expected result, and any required local account, environment, or provider prerequisite. If no manual test is appropriate, say why and record the automated validation instead. Keep the subject line concise; do not substitute a PR description for commit-level test instructions.

When a new commit is pushed to an existing PR, update that PR's description whenever the commit changes its scope, behavior, validation, rollout, or review guidance. Do not leave a PR description that is materially stale; a trivial correction that changes none of those does not require an edit.

## Local handoff

At the end of an implementation task, restart the relevant local service or services from the changed branch before handoff. Confirm the applicable health endpoint or page is reachable, then provide the local URL and focused manual-test steps. Do not present a successful build as proof that a restarted service, provider integration, or production deployment works.

# Agent instructions

Read `CLAUDE.md` for repository coding conventions.
