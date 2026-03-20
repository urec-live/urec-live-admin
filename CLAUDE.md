# CLAUDE.md — UREC Live Admin Dashboard

## Project Overview

UREC Live is a gym management and fitness tracking platform. This repo is the **admin dashboard** — a web application used by gym staff and rec center directors to manage equipment, exercises, users, and monitor live gym activity.

**This is the #1 MVP blocker.** The admin dashboard is what turns UREC Live from "a fitness app" into "a gym management platform" — it's what we sell to gym owners.

---

## Business Context

- **Solo founder** (CS student) building a B2B SaaS product
- **Target users of this dashboard**: Rec center staff, gym managers, facility directors
- **What they care about**: Reducing equipment complaints, tracking utilization, justifying new equipment purchases
- **This dashboard must look professional** — it's the first thing a potential gym client sees in a demo

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Angular 17+ with standalone components |
| Language | TypeScript (strict mode) |
| UI Library | Angular Material (or PrimeNG) |
| Styling | Tailwind CSS + Angular Material theming |
| Charts | ng2-charts (Chart.js wrapper) or ngx-echarts |
| Real-time | @stomp/rx-stomp (RxJS-native STOMP WebSocket client) |
| QR Codes | angularx-qrcode |
| HTTP | Angular HttpClient with HttpInterceptor for JWT |
| Routing | Angular Router with lazy-loaded feature modules |
| Deployment | Vercel, Netlify, or Firebase Hosting |

### Backend Connection

The dashboard consumes the Spring Boot REST API at `urec-live-backend`.

- **Auth**: POST `/api/auth/login` → JWT token → stored in localStorage
- **Admin endpoints**: All under `/api/admin/**` — secured with ADMIN role
- **WebSocket**: STOMP over SockJS at `/ws` endpoint, subscribe to `/topic/machines`
- **Environment config**: API base URL set via `environment.ts` / `environment.prod.ts`

---

## Project Structure

```
src/
├── app/
│   ├── core/                    # Singleton services, guards, interceptors
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── equipment.service.ts
│   │   │   ├── exercise.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── websocket.service.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── jwt.interceptor.ts
│   │   └── models/              # TypeScript interfaces/types
│   │       ├── equipment.model.ts
│   │       ├── exercise.model.ts
│   │       ├── user.model.ts
│   │       └── session.model.ts
│   ├── features/                # Lazy-loaded feature modules
│   │   ├── auth/
│   │   │   └── login/
│   │   ├── dashboard/
│   │   │   ├── dashboard-home/
│   │   │   └── live-monitor/
│   │   ├── equipment/
│   │   │   ├── equipment-list/
│   │   │   └── equipment-form/
│   │   ├── exercises/
│   │   ├── users/
│   │   └── activity/
│   ├── shared/                  # Shared components, pipes, directives
│   │   ├── components/
│   │   │   ├── sidebar/
│   │   │   ├── topbar/
│   │   │   └── confirm-dialog/
│   │   └── pipes/
│   ├── app.component.ts
│   ├── app.routes.ts
│   └── app.config.ts
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── styles.scss
```

---

## Key Implementation Details

### Authentication Flow

1. Login page sends POST `/api/auth/login` with email/password
2. Backend returns `{ accessToken, refreshToken, user: { id, email, roles } }`
3. Verify user has ADMIN role — reject if not
4. Store tokens in localStorage
5. `JwtInterceptor` attaches `Authorization: Bearer <token>` to all API requests
6. On 401 response, attempt token refresh via POST `/api/auth/refresh`
7. If refresh fails, redirect to login
8. `AuthGuard` on all routes except `/login`

### WebSocket Integration

```typescript
// Use @stomp/rx-stomp for RxJS-native STOMP
// WebSocketService should:
// - Connect on dashboard init
// - Subscribe to /topic/machines
// - Expose an Observable<MachineStatus[]> via BehaviorSubject
// - Auto-reconnect on disconnect (max 5 attempts, exponential backoff)
// - Unsubscribe and disconnect on logout
```

### API Endpoints This Dashboard Consumes

**Equipment Management:**
- `GET /api/admin/equipment` — List all (paginated)
- `POST /api/admin/equipment` — Create
- `PUT /api/admin/equipment/{id}` — Update
- `DELETE /api/admin/equipment/{id}` — Delete
- `POST /api/admin/equipment/{id}/qr` — Generate QR code

**Exercise Management:**
- `GET /api/admin/exercises` — List all
- `POST /api/admin/exercises` — Create
- `PUT /api/admin/exercises/{id}` — Update
- `DELETE /api/admin/exercises/{id}` — Delete

**Analytics:**
- `GET /api/admin/analytics/live` — Current gym snapshot
- `GET /api/admin/analytics/usage?period=week|month` — Equipment utilization
- `GET /api/admin/analytics/peak-hours?period=week|month` — Peak hours
- `GET /api/admin/analytics/users?period=week|month` — User stats
- `GET /api/admin/activity-log?page=0&size=20` — Activity feed

**Users:**
- `GET /api/admin/users` — List users (paginated)
- `PUT /api/admin/users/{id}/role` — Change role

---

## Coding Conventions

- **Standalone components** everywhere (no NgModules for feature components)
- **Reactive forms** for all forms (FormGroup, FormControl, Validators)
- **Services** handle all HTTP calls — components never call HttpClient directly
- **RxJS best practices**: Use `async` pipe in templates, `takeUntilDestroyed()` for subscriptions, avoid manual subscribes where possible
- **Lazy loading**: Each feature area is lazy-loaded via `loadComponent` or `loadChildren` in routes
- **Type everything**: No `any` types. Create interfaces in `core/models/` for all API responses
- **Error handling**: Global error interceptor + MatSnackBar for user-facing errors
- **Naming**: Components: `equipment-list.component.ts`, Services: `equipment.service.ts`

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

Make sure the Spring Boot backend is running for API calls and WebSocket.

---

## Design Guidelines

- **Professional and clean** — this is a B2B product, not a consumer app
- Use Angular Material's default indigo-pink or a custom dark theme
- Sidebar should be collapsible
- Data tables should feel like enterprise software (sortable, filterable, paginated)
- Live monitor should feel "alive" — subtle animations on status changes
- Charts should be simple and glanceable — the gym manager has 30 seconds, not 30 minutes
- Mobile-responsive (gym staff may check on a tablet)

---

## Roadmap Context

- **Now (Phase 1)**: Build the core dashboard — equipment CRUD, live monitor, basic analytics
- **Phase 2**: Advanced analytics (trends, predictions), exercise management UI, user management
- **Phase 3**: Multi-tenant support (each gym gets their own branded dashboard), billing integration
- **Phase 4**: White-label theming, API keys for gym integrations