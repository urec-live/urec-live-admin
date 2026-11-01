# Optional-gym compatibility handoff

Branch: `feature/standalone-optional-gym` (matching backend and member app branches).

The live monitor now sends the current admin access token on every STOMP connection/reconnection. It uses the browser SockJS bundle, avoiding the Node `global` dependency in browser tests. Its existing `/topic/machines` subscription remains available to admin principals after gym scoping is activated on the backend.

Validation: `npm run build` passed with existing bundle/style/CommonJS warnings. `npm test -- --watch=false --browsers=ChromeHeadless` passed 143 tests. The local dashboard was restarted on http://localhost:4200 and its page returns HTTP 200. A real staff-account live-monitor browser flow remains unverified; protocol authorization and token refresh are covered by backend behavior and the service test.

Manual test: with the matching backend running and a local admin account, log into http://localhost:4200, open Live Monitor, then check a machine in/out from a member connected to UREC. Expect the monitor status to update. An independent member must connect from Settings before accessing gym equipment. No deployment performed. Delivery is tracked in [ClickUp task 86bcw3kbr](https://app.clickup.com/t/86bcw3kbr).
