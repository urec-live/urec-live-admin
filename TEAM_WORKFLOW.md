# Two-person development workflow

Both developers and both coding agents follow this file. Tool-specific files add coding conventions; they do not define separate team workflows. Explicit task instructions control scope. Verify architecture claims against source: older feature lists and network instructions may be stale.

## Standalone clone and active scope

This repository is independently versioned. Its root `AGENTS.md`, `TEAM_WORKFLOW.md`, and `CLAUDE.md` travel with the clone and contain the applicable guidance for Codex and Claude Code. No parent workspace instructions, personal absolute paths, or sibling checkout are required. Run commands from this repository root unless stated otherwise. Read `CLAUDE.md` for repository coding conventions; verify historical inventories and roadmap notes against source before relying on them.

The active UREC Live repositories are `backend` (Spring Boot API), `app` (native member client), and `admin` (staff web dashboard). Clone a companion repository separately only when the task needs it; record compatible revisions and configure its origin rather than assuming a sibling path. Work on `scheduling-experiments` and `urec-live-cv` is on hold: do not plan, modify, run, or validate either without an explicit request to resume it. Existing CV integration settings do not authorize running the CV project.

The member app targets native iOS and Android only. Do not design, implement, or validate member-app desktop/browser UI, desktop responsive layouts, or web compatibility unless the user explicitly changes scope. Existing web scripts/dependencies do not change this rule. Validate member UI on a native simulator, emulator, or device. The separate admin dashboard remains a web application.

## Start a task

1. Confirm the repository with `git rev-parse --show-toplevel` and inspect `git status --short`.
2. Agree on the task owner, acceptance criteria, and affected repositories before overlapping work. Use one feature branch per task in each affected repository. Do not overwrite another developer's edits.
3. Read this file and the repository's agent instructions. Record API, schema, dependency, and environment changes in the task or PR.
4. Agents may edit and check locally. Commit, push, merge, deploy, or change a shared database only when explicitly authorized by the developer.

## Reproducible setup

- Backend: use JDK 21 for BOTH Maven and the running application. Check `java -version` and `mvn -version`; a compiler release setting does not select the runtime. Maven is currently not pinned by a wrapper.
- Frontends: use `npm ci` with the committed `package-lock.json` for normal setup. Use `npm install` only for an intentional dependency change and review its lockfile diff. Run local CLI commands through npm scripts or `npx`, not a global Angular/Expo installation.
- Node/npm versions are not yet standardized across the two frontends. Select and validate versions for each repository together before adding version files; do not assume one version suits both.
- Backend: copy `.env.example` to `.env` on a fresh clone and fill it locally. Never commit secrets or copy another developer's `.env`. Check required variable NAMES against `application.properties`; do not print values in logs or agent responses. Spring does not automatically source a shell `.env`.
- macOS zsh/bash: for a shell-compatible backend `.env`, run `set -a`, `source .env`, then `set +a` before starting the backend. Windows PowerShell: set process environment variables with `$env:VARIABLE_NAME = "value"`, using the names from `.env.example`, or configure them in the IDE run configuration. Bash `source` and `export` do not work in PowerShell. Do not execute a shell `.env` as a PowerShell script. Use your own development database/Neon branch. Runtime startup can seed data and update the schema; do not point development at production.
- Mobile network configuration lives in `services/networkConfig.ts`; use `EXPO_PUBLIC_BACKEND_ORIGIN` for an explicit origin. Public frontend variables must not contain secrets. Admin configuration lives in `src/environments/environment*.ts`. Do not replace shared configuration with a personal LAN IP.

## Platform ownership and native setup

| Developer | Host | Primary mobile validation |
| --- | --- | --- |
| Thanmay | macOS | iOS Simulator with Xcode |
| Abel | Windows | Android Emulator with Android Studio |

Both developers run the same JavaScript checks. Each owns native validation on their platform. Windows does not run the local iOS Simulator; hand iOS validation to Thanmay. A successful iOS run does not establish Android compatibility, or vice versa.

Run these commands from the mobile app repository root after `npm ci`. The native projects are tracked; use the checked-out projects first:

macOS / iOS:

```sh
npm run ios
```

Windows PowerShell / Android:

```powershell
npm run android
```

Install Xcode and its simulator runtimes on macOS. Install Android Studio, an Android SDK, and a working emulator on Windows. Use the JDK supported by the generated Android Gradle project; configure the Android toolchain separately from the backend's JDK 21 when necessary. Record `java -version`, `mvn -version`, and the Android build JVM when diagnosing Java failures.

The app tracks native source under `ios/` and `android/`; dependencies, build outputs, and machine-specific configuration are ignored. Check `git ls-files ios android` and `.gitignore` before regenerating anything. Use the checked-out native projects and install required local dependencies (including CocoaPods for iOS). Configure SDK paths and signing locally; do not commit personal paths or signing secrets. If a project is incomplete, inspect the clone and preserve custom native files first. Run `npx expo prebuild --platform ios --no-install` or `npx expo prebuild --platform android --no-install` only when regeneration is required for the task; inspect every generated diff. Do not use `prebuild --clean` without reviewing/backing up native changes.

For direct Gradle commands, start in the generated `android` directory:

- macOS/Linux shell: `./gradlew app:installDebug`
- Windows PowerShell: `.\gradlew.bat app:installDebug`

Usually use `npm run android` to build, install, and start Metro. If restricting `reactNativeArchitectures` manually, select the ABI of the target emulator (`x86_64` or `arm64-v8a`); do not copy the other developer's ABI blindly. Direct Gradle installation also needs Metro running via `npm start` for the development app.

Persist required native configuration through app configuration/config plugins or a versioned, repeatable integration script. Track intentional native source changes, including custom watch targets; do not leave required source only in ignored local files. Record regeneration steps in its PR. Review `package.json` and lockfile changes after prebuild; keep dependency changes intentional.

## Local backend connections

Each developer runs their own backend with their own development database and environment:

| Client | Backend running on the same host |
| --- | --- |
| iOS Simulator on macOS | `http://localhost:8080` |
| Standard Android Studio Emulator on Windows | `http://10.0.2.2:8080` |
| Browser on either host | `http://localhost:8080` |

The mobile resolver uses an explicit origin first, then Expo host discovery, then the platform fallback shown above. Expo host discovery can therefore override the fallback; inspect `services/networkConfig.ts` when diagnosing connectivity. An explicit `EXPO_PUBLIC_BACKEND_ORIGIN` overrides them, so check local environment files when requests hit the wrong host. Use the origin without `/api` or `/ws`. Physical devices and a backend on the other developer's laptop require a reachable LAN/development URL instead; `localhost` always refers to the client's own environment. Keep such overrides local and verify both HTTP and WebSocket connectivity.

## Cross-platform acceptance

For shared mobile behavior, dependency/config changes, and API changes consumed by the app, both developers test the same app revision against the agreed backend revision before calling the work validated on both platforms. If backend revisions differ, document the difference. Native-only changes require the affected platform check and a review for impact on the other platform.

The minimum manual check for an affected flow includes login, loading equipment, the changed interaction, and live status/WebSocket behavior when relevant. Verify permission/error behavior for camera, QR, or network changes. Record OS, simulator/emulator model and OS version, app/backend revisions, commands, and results. Keep platform checks marked pending until the other developer supplies evidence; no one needs to reproduce the other host OS locally.

Avoid case-only import/path mismatches, absolute personal paths, shell-specific commands in shared npm scripts, and platform-specific modules imported unconditionally by shared code. Use existing platform file suffixes or guards for iOS/Android-specific behavior. Review platform-specific native dependency support before adding packages.

## Checks before handoff

Run checks from the corresponding repository and include exact commands and outcomes in the PR:

| Repository | Checks | Start locally |
| --- | --- | --- |
| backend | `mvn clean verify` on JDK 21 | `mvn spring-boot:run` after loading local environment |
| app | `npm run lint`, `npx tsc --noEmit`, and affected native flows | macOS: `npm run ios`; Windows: `npm run android` |
| admin | `npm run build` plus relevant existing tests | `npm start` |

These are the agreed commands, not a claim that all currently pass. Inspect backend test profiles before running the full suite: tests without the isolated `test` profile may require database environment variables. Use an isolated development database and JDK 21; record actual baseline failures rather than assuming historical failures still apply. `-DskipTests` may help diagnose/build locally; it is not a passing test result. A build alone does not validate device behavior, live providers, or deployment.

For UI/API/WebSocket changes, exercise the affected flow against your development backend. Record platform, backend revision, client revision, and observed result. Mark checks that were not run.

## Changes spanning repositories

Agree on request/response fields, status codes, auth requirements, WebSocket payloads, and compatibility before implementation. Keep examples free of private data. Link the backend and frontend PRs and specify the revisions that work together. Prefer additive API changes so each repository can be merged independently; document ordering when that is impossible. For schema changes, document migration and rollback implications and coordinate the target database before applying them.

## Review and handoff

The other developer reviews each PR. Keep unrelated refactors out. Resolve failures or explicitly record baseline failures; do not silently remove tests or weaken checks to obtain a green build. Before merge, verify the checks against the final branch revision.

Use this handoff template:

- Task / owner:
- Repositories / branches / revisions:
- Behavior changed:
- API / schema / dependency / environment changes:
- Checks run and outcomes:
- Host OS / simulator or emulator / OS version:
- iOS check (Thanmay): passed / failed / pending, with evidence:
- Android check (Abel): passed / failed / pending, with evidence:
- Manual reproduction steps:
- Known failures or checks not run:
- Related PRs / merge order:

## Commit evidence and local handoff

Every commit message must include a `Manual test:` section in its body with the shortest reproducible steps, expected result, and required local account, environment, or provider prerequisites. If no manual test is appropriate, explain why and record the automated validation instead. Keep the subject concise; a PR description does not replace commit-level evidence.

When pushing a new commit to an existing PR, update its description if scope, behavior, validation, rollout, or review guidance changes. Trivial corrections that change none of these do not require a description edit.

At the end of an implementation task, restart each affected local service from the changed branch, confirm its health endpoint or page is reachable, and provide its URL plus focused manual-test steps. For backend use `GET http://localhost:8080/api/auth/test` (adjust for a configured port); for admin use `http://localhost:4200`. For app changes restart Metro and launch the changed native app; report the simulator/emulator/device and backend origin. A Metro response alone does not prove native UI works. Record unavailable platforms/providers as pending. Documentation-only edits do not require service restarts; validate document consistency and links instead.

## Fresh-laptop checklist

1. Clone the required repository and read its root guidance. Install Git and the runtime/toolchain listed above; inspect local version files and package metadata before selecting frontend Node/npm versions.
2. Install locked dependencies. Configure local environment and any provider keys from checked-in templates/configuration documentation; never copy secrets into Git, logs, or responses. Native maps, Google sign-in, and media providers require their own configured credentials; mark unconfigured integrations pending.
3. For backend, use your own development database and load environment variables before `mvn spring-boot:run`. For a disposable H2 preview on macOS/Linux, the tracked `bash scripts/run-local-standalone.sh` uses test dependencies/profile without loading `.env`; set `JAVA_HOME` to JDK 21. Its database is in memory and preview accounts/history disappear on restart. Do not assume personal preview scripts or existing accounts are part of a fresh clone. Windows can use the development database setup above; Bash scripts require a suitable Bash environment.
4. Start the backend when exercising API flows. Configure the app origin locally in `.env.local` (`EXPO_PUBLIC_BACKEND_ORIGIN=http://localhost:8080` for iOS Simulator, `http://10.0.2.2:8080` for the standard Android Emulator); restart Metro after environment changes. Use a reachable LAN origin for physical devices. Never put secrets in `EXPO_PUBLIC_*` variables.
5. Admin reads `src/environments/environment.ts` in development and `environment.prod.ts` in production, selected by `angular.json`. Inspect both API and WebSocket origins; do not assume a cloud provider from old notes. Local admin needs a local development account with an accepted admin role; register/provision accounts against your development database and verify actual role checks rather than assuming seeded credentials.
6. Run the relevant checks, confirm the local endpoint/page and affected flow, and record compatible companion revisions. A clean build is not proof of authentication, provider configuration, WebSocket connectivity, deployment, or real-gym effectiveness. If `PROJECT_COMPLETION_STATUS.md` exists in a separate workspace it is optional context, not a clone prerequisite or deployment evidence.

## Keeping agent instructions aligned

Maintain identical copies of this workflow in backend, app, and admin because they are separate Git repositories. When changing the team policy, update all three in linked PRs. Both `AGENTS.md` and `CLAUDE.md` must point to this file. Keep essential policy in tracked repository files; a parent workspace `AGENTS.md` is only an optional overview. When a companion checkout is unavailable, record the policy update needed there in the handoff instead of assuming it was synchronized. Treat old roadmap sections as context, not authorization to add features. Report conflicting instructions before making a scope-changing decision.

## Remaining automation work

1. Make all backend context tests use the isolated test profile and verify the full suite on JDK 21.
2. Add a pinned Maven wrapper and a runtime version check.
3. Validate and pin Node/npm per frontend.
4. Add CI in each repository using the same commands above; then enable PR review/check requirements in repository settings.
5. Add a shared API contract and a small cross-repository smoke test for login, equipment status, and WebSocket updates.

These items are pending; this document does not configure CI, repository protections, runtimes, or database isolation automatically.
