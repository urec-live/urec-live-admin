# Testing: "Call staff" help requests (admin dashboard)

This branch adds:
- the **Help Requests** page (`/help-requests`):
  - stat cards for New, On the way and Too busy
  - the open queue, longest waiting first. Each card shows the machine, code, status, member, exercise, floor, a ticking "Waiting N min" and who is on the way.
  - **On the way**, **Too busy** and **Done helping** buttons
  - a **Recently closed** list with each request's outcome and time to first response
  - a **Sound** switch
- alerts on **every** page when a member calls staff: a toast with **View**, a two-tone chime, the waiting count in the tab title ("(2) …") and an amber sidebar badge. The badge counts members still waiting for someone: new requests plus Too busy.
- `HELP_REQUESTED`, `HELP_STATUS_CHANGED` and `HELP_CLOSED` on the Activity page

How it fits together:
- `HelpRequestStore` (`core/services/help-request-store.service.ts`) polls `GET /api/admin/help-requests` every 5 seconds. The shell starts it when you sign in and stops it when you sign out. It doesn't use the WebSocket, because `sockjs-client` crashes in the browser (`global` is undefined).
- The first load after sign-in is a silent baseline. Only requests that arrive after it ring.
- `ChimeService` synthesises the chime with Web Audio, so there's no sound file. Browsers block audio until the page has had a click or keypress, so the first interaction unlocks it. Muting is remembered in `localStorage`.

The full walkthrough across backend, admin and app is in `urec-live-backend/HELP_REQUESTS_TESTING.md`.

## Automated tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

You should see `TOTAL: 69 SUCCESS`. The run needs Chrome. The backend isn't needed: HTTP is faked.

| Spec | What it covers |
|---|---|
| `help-requests.component.spec.ts` (25) | Queue order; each card's details, and the details left out when missing; "*staff* is on the way"; stat counts; live updates from the store; spinner, then the empty state; "Waiting N min" ticking; the three buttons call the store with the right status; a request's buttons are disabled while it saves (others stay usable) and re-enabled after a failure; error snackbars, including the 409/404 "already closed or changed" message and its refresh; Recently closed (outcome labels, time to first response, empty state, load error, reload after Done helping only while it's shown); the Sound switch; `formatDuration` |
| `help-request-store.service.spec.ts` (15) | Silent first load; polls every 5 s; one toast and one chime per new request, grouped when several arrive; the toast's **View** opens the page; keeps polling after a failed request; the waiting count and tab title; status changes update in place and Done helping removes the request; refresh; starts only once; `stop()` resets everything; signing in again is a fresh baseline |
| `chime.service.spec.ts` (12) | Plays a high note then a lower one, through a fake `AudioContext`; creates the context once; stays silent when muted, and remembers that across reloads; does nothing without Web Audio, or if creating the context throws; resumes a suspended context; unlocks on the first click or keypress, then stops listening; can be disarmed |
| `help-request.service.spec.ts` (5) | URLs, methods, the `limit` parameter and the PUT body |
| `sidebar-help-badge.spec.ts` (5) | The Help Requests link sits right after Dashboard; the badge appears only above 0, on that link only, with a singular or plural label |
| `shell-help-requests.spec.ts` (2) | The shell starts the store, stops it on destroy, and passes the waiting count to the sidebar |
| `activity-help-events.spec.ts` (3) | Filter options, labels and colours for the three help events |
| `app.component.spec.ts` (2) | The repaired starter spec |

**Mutation-checked:** 19 temporary breaks each make at least one spec fail. They cover queue order, the status sent, the refresh after a 409, the saving state, history loading, the test chime, the waiting and response times, the hour formatting, the silent first load, repeat announcements, polling after errors, the tab title, muting, the unlock listener, the badge at 0, stopping the store, and the Activity filter.

The production build also checks the strict templates and the component style budget:

```bash
npx ng build
```

## Manual checks (backend on localhost:8080, `npx ng serve`, logged in as `urecadmin`)

1. Click anywhere on the page once, so the browser allows sound. Then have a member press **Call staff** in the app. Within about 5 seconds you get a toast "New help request · *machine* (*code*)", the chime, "(1)" in the tab title and an amber **1** on **Help Requests** in the sidebar. This works on any page.
2. Click **View** on the toast, or **Help Requests** in the sidebar. The request's card shows the machine, code, "Request received", the member, exercise, floor and "Waiting less than a minute", which ticks up over time.
3. **On the way**: a snackbar, then "urecadmin is on the way". The badge and tab title drop to 0. The member's app updates within about 5 seconds.
4. **Too busy**: the badge counts the request again.
5. **Done helping**: the card disappears. Open **Recently closed** to see it as "Done helping" with the time to the first response.
6. Have the member close a request themselves (**I received help** or **Cancel**). The card disappears within about 5 seconds, and Recently closed shows "Member got help" or "Cancelled by member".
7. With a request open here that the member has just cancelled, click a button before the page refreshes. You get "This request was already closed or changed", and the queue refreshes.
8. Switch **Sound** off: new requests still toast, but silently, and this survives a reload. Switching it back on plays the chime once.
9. Stop the backend and click a button: "Failed to update the request", and the buttons are usable again.
10. On the Activity page, filter by **Help Requested**, **Help Response** and **Help Closed**.

## Known gaps
- The Dashboard page's recent-activity feed shows help events with its generic "logout" icon. The `equipment-issue-reports` branch rewrites that icon logic, so a help icon will be added when the branches are merged.
- The page relies on polling, so updates can take up to about 5 seconds. See the WebSocket note above.
