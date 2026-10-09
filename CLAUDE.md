# CLAUDE.md — UREC Live Admin Dashboard

## Project Overview

UREC Live is a gym management and fitness tracking platform. This repo is the **admin dashboard** — an Angular web application used by gym staff and rec center directors to manage equipment, exercises, users, and monitor live gym activity.

**Business purpose:** The admin dashboard is what turns UREC Live from "a fitness app" into "a gym management platform" — it's what we sell to gym owners.

**Current stage:** Core dashboard is built. Equipment CRUD, live analytics, and usage charts are functional. Some secondary screens (Users, Activity log, Live Monitor) exist but may need polish.

---

## Business Context

- **Solo founder** (CS student) building a B2B SaaS product
- **Target users**: Rec center staff, gym managers, facility directors
- **What they care about**: Reducing equipment complaints, tracking utilization, justifying new equipment purchases
- **This dashboard must look professional** — it's the first thing a potential gym client sees in a demo

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Angular 17+ with standalone components |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + Angular Material |
| Charts | ng2-charts (Chart.js wrapper) |
| Real-time | @stomp/rx-stomp (RxJS-native STOMP WebSocket) |
| QR Codes | angularx-qrcode |
| HTTP | Angular HttpClient with HttpInterceptor for JWT |
| Routing | Angular Router with lazy-loaded routes |
| Deployment | Vercel (`vercel.json` configured) |

### Backend Connection

- **Auth**: POST `/api/auth/login` → JWT → stored in localStorage
- **Admin endpoints**: All under `/api/admin/**` — ADMIN role required
- **WebSocket**: STOMP over SockJS at `/ws`, subscribe to `/topic/machines`
- **Environment config**: `src/environments/environment.ts` (dev) / `environment.prod.ts` (prod)
  - Both currently set to `http://172.20.1.229:8080` — update when network changes

---

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── auth.service.ts          # Login, token management, hasAdminRole()
│   │   │   ├── equipment.service.ts     # CRUD on /api/admin/equipment
│   │   │   ├── exercise.service.ts      # CRUD + link/unlink on /api/admin/exercises
│   │   │   ├── analytics.service.ts     # Live snapshot, usage, peak hours, user stats
│   │   │   ├── user.service.ts          # /api/admin/users endpoints
│   │   │   └── websocket.service.ts     # RxStomp client, /topic/machines observable
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── jwt.interceptor.ts       # Auto-attach Bearer token, handle 401 refresh
│   │   └── models/
│   │       ├── auth.model.ts
│   │       ├── equipment.model.ts       # Equipment, CreateEquipmentRequest, EquipmentStatus
│   │       ├── exercise.model.ts
│   │       ├── analytics.model.ts       # LiveSnapshot, UsageStats, PeakHours, ActivityLogEntry
│   │       └── user.model.ts
│   ├── features/
│   │   ├── auth/login/                  # Login page (public route)
│   │   ├── dashboard/
│   │   │   ├── dashboard-home/          # Summary cards + charts + activity feed
│   │   │   └── live-monitor/            # Real-time machine status grid
│   │   ├── equipment/
│   │   │   ├── equipment-list/          # Paginated table + CRUD dialogs + QR print
│   │   │   └── equipment-form/          # Create/edit dialog component
│   │   ├── exercises/                   # Exercise management
│   │   ├── users/                       # User management + role assignment
│   │   └── activity/                    # Activity log view
│   ├── shared/
│   │   ├── components/
│   │   │   ├── sidebar/                 # Collapsible nav sidebar
│   │   │   ├── topbar/
│   │   │   ├── shell/                   # Main layout wrapper
│   │   │   ├── qr-dialog/               # QR code display + download
│   │   │   └── confirm-dialog/          # Reusable confirmation dialog
│   │   └── pipes/
│   ├── app.routes.ts
│   └── app.config.ts
├── environments/
│   ├── environment.ts       # dev: apiUrl, wsUrl (currently 172.20.1.229)
│   └── environment.prod.ts  # prod: same IP — needs real domain before deploy
└── styles.scss
```

---

## Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | LoginComponent | Public |
| `/dashboard` | DashboardHomeComponent | Default after login |
| `/equipment` | EquipmentListComponent | Full CRUD |
| `/equipment-issues` | EquipmentIssuesComponent | Member-reported machine problems; per-report status toggles |
| `/exercises` | ExercisesComponent | CRUD + equipment linking |
| `/users` | UsersComponent | List + role management |
| `/activity` | ActivityComponent | Activity feed |
| `/live-monitor` | LiveMonitorComponent | Real-time machine grid |

All routes except `/login` are wrapped in `ShellComponent` and protected by `AuthGuard`.

---

## What's Complete

### Dashboard Home (`/dashboard`)
- 4 summary stat cards: total machines, occupied, available, active users
- Bar chart: top 10 equipment by usage (week/month toggle)
- Bar chart: peak hours by time of day (week/month toggle)
- Recent activity feed (last 5 events)
- Auto-refreshes snapshot every 30 seconds

### Equipment Management (`/equipment`)
- Angular Material data table with pagination, column sorting
- Search filter (by name/code) + status filter dropdown
- Create, edit, delete equipment (dialogs)
- QR code generation and display per machine
- Bulk QR printing from multi-select

### Equipment Issues (`/equipment-issues`)
- One expansion panel per machine with member reports (not-working first); per-report status toggle (New · Acknowledged · Repairing · Resolved) plus "Set all open reports to"
- Stat cards, search/severity filters, "Show resolved", 30s auto-refresh
- `EquipmentIssueStore` (root, started/stopped by the shell for the signed-in session) polls every 10 s — open reports plus `loadSummary()`. Polling, not WebSocket (sockjs-client crashes in the browser). The first load (including resolved reports, to learn the highest id) is a silent baseline; later reports get a toast with **View** and are emitted on `arrivals$`, which the Issues page and the Dashboard's Recent Activity reload on. No chime and no tab title — those belong to help requests
- `EquipmentIssueService.summary` signal (kept current by the store) feeds the page, the sidebar badge (reports awaiting review) and the Dashboard's "N out of order" line under Total Machines
- The sidebar has a fixed width (`!w-72` = 18rem in the shell) so the badge can't widen it over the page; 18rem plus the badge's `!ml-2` (in place of MDC's 28px trailing gap) keeps "Equipment Issues" uncut next to a 3-digit count. `shell-sidebar-layout.spec.ts` measures this in Chrome
- "Set all open reports to …" always asks first, and so does resolving a single report (`ConfirmDialogComponent`, "Are you sure?"); other single-report changes save straight away
- Failed saves and cancelled confirmations reset the toggle explicitly via its `MatButtonToggleGroup` ref — the `[value]` binding alone can't undo a click when nothing changed in between
- Per-machine "Out of order" switch (`PUT /api/admin/equipment-issues/equipment/{id}/out-of-order`) blocks member check-ins; resolving a machine's last open report puts it back in service (server rule, mirrored locally for single-report changes)
- Members can withdraw their own open report as filed by mistake. It's then RESOLVED with `withdrawnAt` set: shown with a "Withdrawn by member" chip in place of the status toggle, and the server refuses status changes (409). A 409 on a single report, or a 404 on "set all" (nothing open left), shows why and reloads the list. Withdrawing never changes the machine's status
- `EquipmentStatus` includes `'Out of Order'` (Equipment page dropdown/filter, live monitor and floor-map editor colour it grey)

### Auth
- Login page with admin role validation (rejects non-ADMIN accounts)
- JWT stored in localStorage, attached to all requests via interceptor
- Auto-refresh on 401, redirect to login on refresh failure

### WebSocket
- RxStomp service connects on dashboard init
- Subscribes to `/topic/machines`, exposes `BehaviorSubject<MachineStatus[]>`
- Auto-reconnects on disconnect (5 attempts, exponential backoff)
- Disconnects on logout

---

## Coding Conventions

- **Standalone components** everywhere (no NgModules for feature components)
- **Reactive forms** for all forms (`FormGroup`, `FormControl`, `Validators`)
- **Services** handle all HTTP calls — components never call `HttpClient` directly
- **RxJS best practices**: `async` pipe in templates, `takeUntilDestroyed()` for subscriptions
- **Lazy loading**: feature routes use `loadComponent` / `loadChildren`
- **No `any` types** — all API responses typed in `core/models/`
- **Naming**: `equipment-list.component.ts`, `equipment.service.ts`
- **Tailwind vs Material**: Material injects its component styles after the global stylesheet, so a Tailwind class loses to a Material rule of the same specificity (e.g. `.mat-drawer { width: var(--mat-sidenav-container-width) }`, which is `auto` in indigo-pink). Use the `!` modifier, as in `!w-72` or `!py-4`

---

## What Still Needs Work

### Polish & Verification
- **ExercisesComponent** — Exercise CRUD exists in service layer; verify UI is fully connected
- **UsersComponent** — Service exists (`user.service.ts`); verify list + role change UI works end-to-end
- **ActivityComponent** — Analytics service has `getActivityLog()`; verify paginated table display
- **LiveMonitorComponent** — WebSocket service ready; verify live grid uses it properly

### Environment Configuration
- Both `environment.ts` and `environment.prod.ts` have hardcoded device IP `172.20.1.229`
- Before production deploy: set `environment.prod.ts` to the real backend domain

### Design Polish
- Sidebar collapse animation
- Subtle status-change animations in live monitor
- Ensure mobile-responsive layout for tablet use by staff

---

## Testing

```bash
npx ng test --watch=false --browsers=ChromeHeadless   # Karma + Jasmine
```

- Fake services with `jasmine.createSpyObj`; pass signals as spy properties (e.g. `{ summary: signal(null) }`)
- `MatSnackBarModule` provides its own `MatSnackBar`, so stub it with `TestBed.overrideProvider`, not `providers`
- Keep component styles small (`anyComponentStyle` budget: 6kb warning / 10kb error) — prefer Tailwind utilities
- Karma loads the app's global styles (Material theme + Tailwind), so layout bugs can be tested by measuring rendered elements (`getBoundingClientRect`, `scrollWidth`); see `shell-sidebar-layout.spec.ts`. Roboto isn't loaded in tests, but the fallback font measures within a pixel for the sidebar labels
- Specs can't import `WebsocketService` (or `LiveMonitorComponent`): `sockjs-client` references Node's `global`, which isn't defined in the browser. The same bare `global` ships in the production Live Monitor bundle, so that page likely crashes on load until `window.global = window` is defined

## How to Run

```bash
# Requires: Node 18+, Angular CLI 17+
npm install
ng serve
# Opens at http://localhost:4200

# Build for production
ng build --configuration production
```

Spring Boot backend must be running for API calls and WebSocket.

---

## Design Guidelines

- **Professional and clean** — B2B product, not a consumer app
- Data tables should feel enterprise (sortable, filterable, paginated)
- Live monitor should feel "alive" — subtle animations on status changes
- Charts: simple and glanceable (gym manager has 30 seconds)
- Mobile-responsive for tablet use by staff

---

## Roadmap

- **Phase 1 (NOW)**: Core dashboard mostly complete — polish remaining screens
- **Phase 2**: Advanced analytics, push notification management, exercise GIF uploads
- **Phase 3**: Multi-tenant support (each gym gets their own branded dashboard), billing
- **Phase 4**: White-label theming, API keys for gym integrations
