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
