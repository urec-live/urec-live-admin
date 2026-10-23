# UREC Live Admin Dashboard

Angular 17 staff dashboard for UREC Live. It manages equipment, exercises, users, floor plans, help requests, activity logs, analytics, and live equipment status.

## Before you start

Read `TEAM_WORKFLOW.md` and `CLAUDE.md`. The backend must be running for API, auth, and WebSocket flows.

```bash
npm ci
npm start
```

Open http://localhost:4200. Local browser sessions target `http://localhost:8080`; non-local and production builds use the Railway backend configured in `src/environments/environment*.ts`.

## Checks

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

A successful build is not proof that login roles, APIs, WebSockets, or the hosted deployment work. Exercise the affected flow against the agreed backend revision.

## Implemented routes

- `/dashboard` — live summary, usage/peak charts, and recent activity
- `/help-requests` — staff queue, responses, history, and alerts
- `/equipment` — equipment CRUD and QR printing
- `/exercises` — exercise CRUD and equipment linking
- `/users` — user creation, role changes, and deletion
- `/activity` — filtered activity log and summary
- `/live-monitor` — live machine state
- `/floor-map` — floor CRUD and equipment positioning

The backend also exposes equipment-issue administration APIs, but this checkout has no dashboard route/service for them.

## Deployment

`vercel.json` configures the SPA deployment. Confirm the current Vercel deployment and backend connectivity separately; repository configuration alone is not deployment proof.
