# Two-person development workflow

Both developers and both coding agents follow this file. Tool-specific files add coding conventions; they do not define separate team workflows. Explicit task instructions control scope. Verify architecture claims against source: older feature lists and network instructions may be stale.

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

Run these commands from the mobile app repository root after `npm ci`:

macOS / iOS:

```sh
npx expo prebuild --platform ios --no-install
npm run ios
```

Windows PowerShell / Android:

```powershell
npx expo prebuild --platform android --no-install
npm run android
```

Install Xcode and its simulator runtimes on macOS. Install Android Studio, an Android SDK, and a working emulator on Windows. Use the JDK supported by the generated Android Gradle project; configure the Android toolchain separately from the backend's JDK 21 when necessary. Record `java -version`, `mvn -version`, and the Android build JVM when diagnosing Java failures.

The app ignores `/ios` and `/android` in Git: each developer generates their native project locally. An existing folder containing only build caches is not a complete native project. If `gradlew` or the root build files are missing, run the platform-specific prebuild above before using Gradle. Preserve custom native files before regenerating an incomplete project. Do not use `prebuild --clean` without reviewing/backing up local native changes.

For direct Gradle commands, start in the generated `android` directory:

- macOS/Linux shell: `./gradlew app:installDebug`
- Windows PowerShell: `.\gradlew.bat app:installDebug`

Usually use `npm run android` to build, install, and start Metro. If restricting `reactNativeArchitectures` manually, select the ABI of the target emulator (`x86_64` or `arm64-v8a`); do not copy the other developer's ABI blindly. Direct Gradle installation also needs Metro running via `npm start` for the development app.

Persist required native configuration through app configuration/config plugins or a versioned, repeatable integration script. Do not leave a feature implemented only in an ignored native directory, including custom watch targets. Record regeneration steps in its PR. Review `package.json` and lockfile changes after prebuild; keep dependency changes intentional.

## Local backend connections

Each developer runs their own backend with their own development database and environment:

| Client | Backend running on the same host |
| --- | --- |
| iOS Simulator on macOS | `http://localhost:8080` |
| Standard Android Studio Emulator on Windows | `http://10.0.2.2:8080` |
| Browser on either host | `http://localhost:8080` |

The mobile network resolver already handles the emulator defaults. An explicit `EXPO_PUBLIC_BACKEND_ORIGIN` overrides them, so check local environment files when requests hit the wrong host. Use the origin without `/api` or `/ws`. Physical devices and a backend on the other developer's laptop require a reachable LAN/development URL instead; `localhost` always refers to the client's own environment. Keep such overrides local and verify both HTTP and WebSocket connectivity.

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

These are the agreed commands, not a claim that all currently pass. Backend `contextLoads` currently lacks the test profile, and a Java 25 run encountered Mockito agent attachment errors. Make the baseline pass before treating it as a merge gate. `-DskipTests` may help diagnose/build locally; it is not a passing test result. A build alone does not validate device behavior, live providers, or deployment.

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

## Keeping agent instructions aligned

Maintain identical copies of this workflow in backend, app, and admin because they are separate Git repositories. When changing the team policy, update all three in linked PRs. Both `AGENTS.md` and `CLAUDE.md` must point to this file. Treat old roadmap sections as context, not authorization to add features. Report conflicting instructions before making a scope-changing decision.

## Remaining automation work

1. Make all backend context tests use the isolated test profile and verify the full suite on JDK 21.
2. Add a pinned Maven wrapper and a runtime version check.
3. Validate and pin Node/npm per frontend.
4. Add CI in each repository using the same commands above; then enable PR review/check requirements in repository settings.
5. Add a shared API contract and a small cross-repository smoke test for login, equipment status, and WebSocket updates.

These items are pending; this document does not configure CI, repository protections, runtimes, or database isolation automatically.
