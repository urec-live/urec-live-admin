## Shared team workflow

Read `docs/TEAM_WORKFLOW.md` before making changes. It defines the shared setup, task ownership, verification, and handoff rules for Codex and Claude Code. Existing architecture and roadmap notes below may be stale; check source and stay within the current task. Do not implement roadmap items without a task requesting them.

## Commit evidence

Every commit message must include a `Manual test:` section in its body. State the shortest reproducible steps, expected result, and any required local account, environment, or provider prerequisite. If no manual test is appropriate, say why and record the automated validation instead. Keep the subject line concise; do not substitute a PR description for commit-level test instructions.

When a new commit is pushed to an existing PR, update that PR's description whenever the commit changes its scope, behavior, validation, rollout, or review guidance. Do not leave a PR description that is materially stale; a trivial correction that changes none of those does not require an edit.

## Local handoff

At the end of an implementation task, restart the relevant local service or services from the changed branch before handoff. Confirm the applicable health endpoint or page is reachable, then provide the local URL and focused manual-test steps. Do not present a successful build as proof that a restarted service, provider integration, or production deployment works.

# Agent instructions

Read `CLAUDE.md` for repository coding conventions.

## Standalone clone and active scope

This repository is independently versioned. Its `AGENTS.md`, `docs/TEAM_WORKFLOW.md`, and `CLAUDE.md` travel with the clone and contain the applicable guidance for Codex and Claude Code. No parent workspace instructions, personal absolute paths, or sibling checkout are required. Run commands from this repository root unless stated otherwise. Read `CLAUDE.md` for repository coding conventions; verify historical inventories and roadmap notes against source before relying on them.

The active UREC Live repositories are `backend` (Spring Boot API), `app` (native member client), and `admin` (staff web dashboard). Clone a companion repository separately only when the task needs it; record compatible revisions and configure its origin rather than assuming a sibling path. Work on `scheduling-experiments` and `urec-live-cv` is on hold: do not plan, modify, run, or validate either without an explicit request to resume it. Existing CV integration settings do not authorize running the CV project.

The member app targets native iOS and Android only. Do not design, implement, or validate member-app desktop/browser UI, desktop responsive layouts, or web compatibility unless the user explicitly changes scope. Existing web scripts/dependencies do not change this rule. Validate member UI on a native simulator, emulator, or device. The separate admin dashboard remains a web application.

## Repository quick reference

- Angular 17 staff web dashboard using standalone components, reactive forms, typed services, RxJS, Material, and Tailwind. Follow `CLAUDE.md` for coding and testing conventions; keep HTTP calls in services.
- Setup: use a compatible Node/npm toolchain and `npm ci`; run `npm start` at `http://localhost:4200`.
- Checks: `npm run build` and relevant existing tests with `npm test -- --watch=false --browsers=ChromeHeadless` (requires Chrome/Chromium configured for Karma). Browser validation is appropriate for this dashboard.
- API/WebSocket origins live in `src/environments/environment.ts` and `environment.prod.ts`; `angular.json` selects the production replacement. Verify current configured origins rather than assuming Railway or Render from historical notes. Avoid committing personal LAN overrides.
- API flows require a compatible separately running backend and a local account with an accepted admin role. Verify login, affected operation, and live updates where relevant; a page response/build does not prove backend connectivity or authorization.
