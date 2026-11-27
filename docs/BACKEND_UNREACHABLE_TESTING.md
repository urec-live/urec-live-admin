# Testing: "Can't reach UREC Live" notice (admin dashboard)

Branch `minor-fixes-and-speed-ups`. It's the same branch name as in `urec-live-app`, where the mobile app has the matching notice. In this repo it only adds this notice, and the backend doesn't change.

When the dashboard can't reach the backend, a dark card appears at the top of the screen, on every page and the login page too:

> **Can't reach UREC Live**
> Check your internet connection, then try again. If your connection is fine, the server may be down for a moment. If it keeps happening, reload the page.
> [Try again]  [✕]

**When it shows**
- Every request goes through `HttpClient`. `backendStatusInterceptor` reports each answer and failure to `BackendStatusService`, so nothing extra is sent to check.
- It's registered after the JWT interceptor, so the original request, the token refresh and the retry are each reported.
- A request with no answer at all (status 0) means the server can't be reached. The cause can be no internet, the server being down, or a failed CORS check.
- A 502, 503 or 504 means Railway's proxy answered that the backend behind it is down. Then the card says **UREC Live isn't responding** and suggests trying again in a minute. In the browser, Railway's own error page often has no CORS headers, so an outage usually reads as "no answer". That's why the first wording mentions the server too.
- Any other answer, error codes included, means the server is reachable.
- A slow request that fails after a newer one was answered (e.g. a poll that hung) is ignored. Requests are numbered as they start, so changing the computer's clock doesn't affect this.

**How long it stays.** It's temporary, and it doesn't flicker on a patchy connection:
- It goes away on its own after 10 seconds, or with **✕**. Help requests and equipment issues poll every few seconds, and those repeated failures don't keep it up longer. Neither does a change of wording.
- Once it has gone, failures in the next 30 seconds don't bring it back, even if some requests get answers in between. A failure after that shows it again. If the computer's clock is set back, the quiet time ends instead of stretching.
- If requests get answers while it's up, it turns green and says **Connected again** for 3 seconds. If they fail again during those 3 seconds, the green card just goes; it doesn't flip back.
- It sits above Material dialogs, so it shows while you're editing a machine too.

**Try again** asks the server (`GET /api/auth/test`).
- While it waits, the button reads **Checking…** and can't be clicked again. The card stays up until the check is done.
- If the server answers, the card says Connected again. If not, or after 10 seconds with no answer, it says **Still can't reach UREC Live** and stays another 10 seconds.
- Closing the card cancels the check.

**Login.** With no answer, the login page's toast said "Cannot reach the server", and a 502/503/504 said "An unexpected error occurred". Both now use the notice's wording, for example "Can't reach UREC Live right now. Check your internet connection, then try again." A wrong password still shows "Incorrect username or password" under the form.

**Logged out by a dropped connection.** When a request got a 401 and the token refresh then couldn't reach the server, the admin used to be logged out. Now they stay signed in and see the card. A refresh the server refuses still logs them out.

**Not covered.** The STOMP connection (Live Monitor) doesn't go through `HttpClient`, so it doesn't feed the notice.

## Automated tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

You should see `TOTAL: 189 SUCCESS`: the 142 from main plus 47 new. The backend is faked with `HttpTestingController`, so no server is needed.

| File | What it covers |
|---|---|
| `core/services/backend-status.service.spec.ts` (16) | **What counts:** no answer and a timed-out check are network problems; 502/503/504 mean the server is down; 400, 401, 403, 404, 409 and 500 are answers; other errors are ignored. **The status:** records the kind and time; an error answer clears it; subscribers hear only real changes; a request failing after a newer answer is ignored, judged by request order, so a clock set back doesn't hide failures |
| `core/interceptors/backend-status.interceptor.spec.ts` (6) | With the JWT interceptor, as `app.config.ts` registers them: no answer and a 502 report an outage; the next answer, even a 404, clears it; a slow request failing after a newer answer is ignored. **Token refresh:** if it can't reach the server, the admin stays signed in and the outage is reported; if the server refuses it, they're logged out as before |
| `shared/components/backend-notice/backend-unreachable-notice.component.spec.ts` (18) | **Showing:** nothing while requests are answered; the title, steps, **Try again** and `role="alert"`; the server-down wording for a 503; fixed above the page and above dialogs. **Timing:** gone after 10 s even while polls keep failing; a change of wording doesn't extend it; quiet for 30 s after going, then back; closed, it stays away for 30 s while answers and failures take turns; Connected again for 3 s, only if the card was up; failing again drops the green card rather than flipping back; a clock set back ends the quiet time. **Try again:** Checking…, a second click sends nothing, then Connected again; the card stays up past its 10 s while checking; still failing says so and keeps it up another 10 s; gives up after 10 s with no answer; an error answer counts as connected; closing the card cancels the check |
| `features/auth/login/login-unreachable.spec.ts` (6) | No answer and 502/503/504 give the notice's wording; a 401 still says the username or password is wrong; a 500 is still "an unexpected error" |
| `app.component.spec.ts` (+1) | The notice is on every page, the login page included |

**Mutation-checked.** Each of these 24 temporary breaks makes at least one of the specs above fail:
- the interceptor not reporting failures
- the interceptor not reporting answers
- a slow failure overriding a newer answer
- a 500 counting as the server being down
- a 502 counting as an answer
- a timed-out check not counting as unreachable
- an error answer not clearing the outage
- a refresh that can't reach the server logging the admin out
- repeat failures keeping the card up longer
- a change of failure kind keeping it up longer
- no quiet time after it goes
- a clock set back stretching the quiet time
- Connected again flipping back to the warning
- Connected again showing when the card wasn't up
- Connected again going too soon
- the card never going away on its own
- the card's time running out while Try again checks
- closing not cancelling a running check
- a failed check not saying so or restarting the time
- Try again having no timeout
- Try again staying clickable while checking
- the card not being fixed above the page
- the login page treating no answer as an unexpected error
- the notice not being on every page

## Manual checks

**Setup.** Switch the admin checkout to the branch, then run TERMINAL 1 (backend) and TERMINAL 2 (admin) from `commands.txt`, and sign in at http://localhost:4200.

```bash
cd /c/Users/abelv/portfolio/getmefit/urec-live-admin && git switch minor-fixes-and-speed-ups
```

**Server down**
1. Open the **Dashboard**. Stop the backend with Ctrl+C in TERMINAL 1. Within about 5 seconds (the next help-request poll), the dark **Can't reach UREC Live** card appears at the top with the steps and **Try again**.
2. Leave it alone: it's gone after about 10 seconds, and the polls keep failing without bringing it back for 30 seconds. Then it reappears.
3. Click **Try again**: it reads **Checking…**, then **Still can't reach UREC Live**.
4. Start the backend again (TERMINAL 1). While it boots, click **Try again** whenever the card is up; each failed check keeps it up another 10 seconds. Once the backend has started, the next click turns the card green with **Connected again**, and it goes after 3 seconds. If the card had already gone, that's expected: the next poll is answered, and nothing brings it back.
5. Stop the backend again and wait for the card. Close it with **✕**. It stays away for 30 seconds even though the polls keep failing. Start the backend again.

**Computer offline**

6. Wait 30 seconds after the last card. In Chrome DevTools, open **Network** and set throttling to **Offline**. The card appears within about 5 seconds. Set it back to **No throttling** and click **Try again**: **Connected again**. The help-request poll (every 5 seconds) may get there first and turn the card green on its own, or the card may have gone after its 10 seconds. Both are expected; to see Try again do it, click it once while still offline (it says **Still can't reach UREC Live** and stays another 10 seconds), then switch back online and click again.

**Above a dialog**

7. Open **Equipment** and click edit on a machine, so the dialog is open. Then stop the backend, and wait 30 seconds after the last card if there was one. The card shows above the dialog and can be clicked. Start the backend again.

**Login**

8. Log out and stop the backend. Wait 30 seconds after the last card; logging out doesn't reset that. Sign in with any username and password. The toast at the bottom says "Can't reach UREC Live right now. Check your internet connection, then try again.", and the card shows at the top.
9. Start the backend and sign in with a wrong password: "Incorrect username or password. Please try again." still shows under the form. Then sign in properly.
