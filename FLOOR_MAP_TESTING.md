# Floor map editor

Use the isolated four-floor backend demo and accounts documented in the neighboring `app/EQUIPMENT_MAP_TESTING.md`. Start this app with `npm start -- --host 127.0.0.1 --port 4200`, then open http://localhost:4200/floor-map as `mapadmin`.

Rooms & places edits the floor's version-1 layout. Create a rectangle/polygon, name it, set its type, drag/resize or edit vertex coordinates, then Save layout. Equipment positions uses the same layout beneath machine markers and saves through the existing positions endpoint. Save each mode separately. Confirming navigation discards unsaved changes; Cancel retains them. Browser reload/close prompts for unsaved drafts.

The backend must support `PUT /api/admin/floor-plans/{id}/layout`; deploy its additive JSONB migration first. The editor remains scoped to UREC. Ground is floorNumber 0.

Validation: `npm run build` passed; four focused ChromeHeadless tests passed with `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/floor-map/floor-layout-editor.component.spec.ts`. Browser inspection verified persisted room-label changes and unsaved floor-switch protection. Native member-app gesture checks are separate.
