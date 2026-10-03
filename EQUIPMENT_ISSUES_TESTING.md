# Testing: Equipment Issue Reporting (admin dashboard)

This branch adds:
- the **Equipment Issues** page (`/equipment-issues`), with one panel per reported machine, a status toggle per report (New · Acknowledged · Repairing · Resolved) plus "Set all open reports to"
- an **Out of order** switch per machine, which blocks member check-ins
- a sidebar badge counting reports awaiting review
- new event types on the Activity page and in the dashboard feed

The Equipment page's status dropdown, the floor-map editor and the live monitor also understand the new **Out of Order** status.

The full walkthrough across backend, admin and app is in `urec-live-backend/EQUIPMENT_ISSUES_TESTING.md`.

## Automated tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

You should see `TOTAL: 44 SUCCESS`. The run needs Chrome. The backend isn't needed: HTTP is faked.

Until this branch, `ng test` couldn't run at all, because the CLI-generated `app.component.spec.ts` expected a `title` property and a "Hello" heading that `AppComponent` never had, so it failed to compile. That spec now checks that the app renders its router outlet.

| Spec | What it covers |
|---|---|
| `equipment-issues.component.spec.ts` (23) | Stat cards, including "N out of order"; one panel per machine with worst severity and report count; reporter and description shown; machines with new reports start open; search and severity filters; empty state; "Show resolved"; status toggles save, refresh the counts and roll back on failure (per report and per machine); "set all"; 30-second auto-refresh. **Out of order:** header chip and switch state; the switch saves and updates the chip; a failed save puts the switch back; resolving the last open report shows the machine back in service (single and "set all"); a machine with other open reports stays out of order |
| `equipment-issue.service.spec.ts` (7) | URLs, the `includeResolved` parameter and PUT bodies, including the out-of-order switch; the shared summary signal (and that it's left alone on failure) |
| `sidebar.component.spec.ts` (4) | The Equipment Issues link; the badge shows the count of reports awaiting review and hides at 0; polls every 60s and keeps polling after a failure |
| `equipment-list.component.spec.ts` (2) | "Out of Order" filter option and grey status chip |
| `activity.component.spec.ts` (3), `dashboard-home.component.spec.ts` (3) | Labels, colours, filter options and dashboard icons for the issue events and for Out of Order / Back in Service |
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
5. Turn on **Out of order** for a machine:
   - The panel header shows an **Out of order** chip.
   - "Machines affected" shows "1 out of order".
   - The member app greys the machine out immediately.
   - Turn the switch off, and the machine is back in service.
6. Resolve the last open report on an out-of-order machine: the snackbar says it's back in service and the chip disappears. With "Show resolved" off, the machine drops off after the next refresh (30s auto-refresh, or the refresh button).
7. On the Equipment page, edit a machine with no reports and set its status to **Out of Order**. It appears with a grey chip and can be filtered by that status.
8. Stop the backend, then change a status or flip the switch: an error snackbar appears and the toggle or switch goes back.
9. On the Activity page, filter by **Issue Reported**, **Issue Updated**, **Out of Order** and **Back in Service**.

## Known issue (predates this branch)
The **Live Monitor** page (`/live-monitor`, commented out of the sidebar) most likely crashes on load in production. Its bundle pulls in `sockjs-client`, which references Node's `global`, and browsers don't define it. Its new Out of Order styling is in place but can't be exercised until that's fixed. A one-line fix is to define `window.global = window` before the app loads, for example in `index.html`.
