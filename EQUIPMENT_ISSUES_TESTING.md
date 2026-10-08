# Testing: Equipment Issue Reporting (admin dashboard)

This branch adds:
- the **Equipment Issues** page (`/equipment-issues`), with one panel per reported machine, a status toggle per report (New · Acknowledged · Repairing · Resolved) plus "Set all open reports to"
- an **Out of order** switch per machine, which blocks member check-ins
- **live alerts**: `EquipmentIssueStore` (started by the shell) checks every 10 s while you're signed in
  - A new report shows a toast with **View** on any page, without a refresh.
  - The sidebar badge, the stat cards, the Dashboard's Recent Activity and its "N out of order" line all update.
  - There's no chime; that stays reserved for help requests.
- **"Are you sure?" dialogs** before "Set all open reports to …" and before resolving, for a single report or all at once
- new event types on the Activity page and in the dashboard feed

The Equipment page's status dropdown, the floor-map editor and the live monitor also understand the new **Out of Order** status.

The full walkthrough across backend, admin and app is in `urec-live-backend/EQUIPMENT_ISSUES_TESTING.md`.

## Automated tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

You should see `TOTAL: 62 SUCCESS`. The run needs Chrome. The backend isn't needed: HTTP is faked.

Until this branch, `ng test` couldn't run at all, because the CLI-generated `app.component.spec.ts` expected a `title` property and a "Hello" heading that `AppComponent` never had, so it failed to compile. That spec now checks that the app renders its router outlet.

| Spec | What it covers |
|---|---|
| `equipment-issues.component.spec.ts` (31) | Stat cards, including "N out of order"; one panel per machine with worst severity and report count; reporter and description shown; machines with new reports start open; search and severity filters; empty state; "Show resolved"; status toggles save, refresh the counts and roll back on failure; 30-second auto-refresh. **Confirmations:** "set all" asks with the report count and target status; Cancel sends nothing and puts the toggle back; resolving a single report asks; other single-report changes don't; the dialog says when resolving puts an out-of-order machine back in service. **Live:** a newly filed report reloads the list straight away. **Out of order:** the switch, its chip, rollback, and back in service after resolving |
| `equipment-issue-store.service.spec.ts` (7) | The first load is a silent baseline (including resolved reports); a new report gets a toast naming the machine and severity, and View opens the page; several arrivals are counted in one toast; a reopened report isn't announced; the summary refreshes every poll; a failed poll is retried; `start()` runs once and `stop()` stops |
| `dashboard-home.component.spec.ts` (5) | A quiet "N out of order" line under Total Machines (greyed at 0); Recent Activity reloads when a new issue arrives; the activity-feed icons |
| `shell-equipment-issues.spec.ts` (1) | The shell starts the store at sign-in and stops it at sign-out |
| `equipment-issue.service.spec.ts` (7) | URLs, the `includeResolved` parameter and PUT bodies, including the out-of-order switch; the shared summary signal (and that it's left alone on failure) |
| `sidebar.component.spec.ts` (4) | The Equipment Issues link; the badge shows the count of reports awaiting review, hides at 0, and updates as soon as the counts change |
| `equipment-list.component.spec.ts` (2) | "Out of Order" filter option and grey status chip |
| `activity.component.spec.ts` (3) | Labels, colours and filter options for the issue events and for Out of Order / Back in Service |
| `app.component.spec.ts` (2) | The repaired starter spec |

The production build also checks the strict templates and the component style budget:

```bash
npx ng build
```

## Manual checks (backend on localhost:8080, `npx ng serve`, logged in as an admin)

1. **Live alerts.** Stay on the **Dashboard** and file a report from the member app. Within about 10 seconds, without refreshing:
   - A toast appears: "New equipment issue · Leg Press (LP01) · Not working". **View** opens Equipment Issues.
   - The sidebar badge goes up.
   - Recent Activity shows "Issue Reported".
   - Try it from another page too (for example Users); the toast appears there as well.
2. The Dashboard's **Total Machines** card has a small "N out of order" line, greyed when it's 0. Marking a machine out of order (step 7) changes it within about 10 seconds.
3. Equipment Issues shows four stat cards and one panel per machine. Not-working machines are listed first, and panels with new reports open automatically. With the page open, a newly filed report appears straight away.
4. Change a report to **Acknowledged** or **Repairing**: no dialog. A snackbar confirms, the counts update, and the change is still there after a reload.
5. **Set all open reports to → Repairing**:
   - An "Are you sure?" dialog says "This sets all N open reports on … to Repairing."
   - **Cancel** leaves everything as it was, including the toggle.
   - **Yes, set all to Repairing** updates every open report on that machine.
6. **Resolve** a single report, and separately use **Set all → Resolved**:
   - Each asks first. Resolving the last open report on an out-of-order machine adds "… goes back in service."
   - Cancel changes nothing; confirming resolves the report(s).
7. Turn on **Out of order** for a machine:
   - The panel header shows an **Out of order** chip, and "Machines affected" shows "1 out of order".
   - The member app greys the machine out immediately.
   - Turn the switch off, and the machine is back in service.
8. On the Equipment page, edit a machine with no reports and set its status to **Out of Order**. It appears with a grey chip and can be filtered by that status.
9. Stop the backend, then change a status or flip the switch: an error snackbar appears and the toggle or switch goes back.
10. On the Activity page, filter by **Issue Reported**, **Issue Updated**, **Out of Order** and **Back in Service**.

## Known issue (predates this branch)
The **Live Monitor** page (`/live-monitor`, commented out of the sidebar) most likely crashes on load in production. Its bundle pulls in `sockjs-client`, which references Node's `global`, and browsers don't define it. That's also why the live alerts poll instead of using the WebSocket. Its new Out of Order styling is in place but can't be exercised until that's fixed. A one-line fix is to define `window.global = window` before the app loads, for example in `index.html`.
