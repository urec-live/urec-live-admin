# Testing: Equipment Issue Reporting (admin dashboard)

This branch adds:
- the **Equipment Issues** page (`/equipment-issues`), with one panel per reported machine and a status toggle per report (New · Acknowledged · Repairing · Resolved) plus "Set all open reports to"
- a sidebar badge counting reports awaiting review
- new event types on the Activity page and in the dashboard feed

The full walkthrough across backend, admin and app is in `urec-live-backend/EQUIPMENT_ISSUES_TESTING.md`.

## Automated tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

You should see `TOTAL: 32 SUCCESS`. The run needs Chrome. The backend isn't needed: HTTP is faked.

Until this branch, `ng test` couldn't run at all, because the CLI-generated `app.component.spec.ts` expected a `title` property and a "Hello" heading that `AppComponent` never had, so it failed to compile. That spec now checks that the app renders its router outlet.

| Spec | What it covers |
|---|---|
| `equipment-issues.component.spec.ts` (16) | Stat cards; one panel per machine with worst severity and report count; reporter and description shown; machines with new reports start open; search and severity filters, including the "no matches" state; empty state; "Show resolved" reload; clicking a status toggle saves and refreshes the counts; a failed save puts the toggle back and shows an error (per report and per machine); the header updates when the last open report is resolved; "set all" and its rollback; 30-second auto-refresh and turning it off |
| `equipment-issue.service.spec.ts` (6) | URLs, the `includeResolved` parameter and PUT bodies; the shared summary signal (and that it's left alone on failure) |
| `sidebar.component.spec.ts` (4) | The Equipment Issues link; the badge shows the count of reports awaiting review and hides at 0; polls every 60s and keeps polling after a failure |
| `activity.component.spec.ts` (2), `dashboard-home.component.spec.ts` (2) | The new event types' labels, colours, filter options and dashboard icon |
| `app.component.spec.ts` (2) | The repaired starter spec |

The production build also checks the strict templates and the component style budget:

```bash
npx ng build
```

## Manual checks (backend on localhost:8080, `npx ng serve`, logged in as an admin)

1. The sidebar shows **Equipment Issues** with a red badge once a member has filed a report. It refreshes every minute and right after you change a status.
2. The page shows four stat cards and one panel per machine. Not-working machines are listed first, and panels with new reports open automatically.
3. Change a report's toggle: a snackbar confirms the change, the counts and badge update, and the change is still there after a reload.
4. **Set all open reports to → Repairing** updates every open report on that machine.
5. Resolve the last open report on a machine: its header changes to "All resolved", and the machine drops off after the next refresh (30s auto-refresh, or the refresh button). **Show resolved** brings it back.
6. Stop the backend and change a status: "Failed to update status" appears and the toggle goes back.
7. On the Activity page, filter by **Issue Reported** and **Issue Updated**.
