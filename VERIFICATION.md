# Verification — October 15, 2026

- 7 automated behavior tests pass against the real request handler, SQLite schema and conflict triggers.
- Catalog: 40 placements; 8 Hero + 10 Premium + 12 Standard + 10 Micro; exact fixed total $75,000.
- All 40 rectangles fit their planning panels and can be reserved concurrently without mutual overlap.
- Server canonical prices resist client changes; custom bounds and nonfinite input are rejected.
- Concurrent fixed/custom conflicts return 409. Rejection releases space. Reopening a conflicting rejected application is blocked.
- Public status excludes contact information and artwork. Admin records and logo downloads require authentication.
- Private uploads persist; conflicting submissions remove unused uploaded objects.
- Marking all catalog applications paid yields $75,000; reversing paid status subtracts the amount.
- Cloudflare Pages Functions compiled successfully with Wrangler 4.151.0.
- Browser: desktop 1440 × 1000, tablet 768 × 1024, phone 390 × 844; no horizontal page overflow at these sizes.
- Photorealistic rotation verified by dragging; view presets, logo upload/preview (driver, passenger, front, rear and glass placements) and custom range inputs checked. Placement overlays checked against wheels, door cut lines and bumpers across the rotation.
- Browser submission persisted a synthetic test application and disabled the occupied placement. Admin authentication, paid/rejected changes and sign-out were verified. Test records and local storage are excluded from the ZIP.
- No browser console errors were observed in the tested flows.

Limits: production Cloudflare account bindings and public deployment were not exercised. This is a packaged implementation, not an already hosted production service. Browser QA used the local SQLite/file adapter; Worker code was separately compiled. Image sequence projection and physical panel sizing remain approximate and require installation review. Mobile layout was checked in a desktop browser viewport, not on physical devices. No payment processing or automated email delivery is configured.
