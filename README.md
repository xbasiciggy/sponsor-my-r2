# R2 Sponsor Studio

Egg-white sponsorship website with Rivian R2 photorealistic drag rotation, logo previews, an independent WebGL placement model, 40 curated placements, custom sizing, and a private organizer dashboard.

## Quick local preview

Requires Node.js 22.13+ with built-in SQLite support (tested on Node 26.12).

```sh
npm run preview
```

Open http://127.0.0.1:8788. This runs the actual application API with a local SQLite database and file-backed private logo storage. No dependency install or Cloudflare account is needed for this preview. The organizer page is `/admin.html`; the **local-only development token** is `local-preview-token-change-before-deploy`. Set the `ADMIN_TOKEN` environment variable to override it. This development default is never used by the Cloudflare Functions.

Preview data lives in ignored `.local-data/`, separate from production. The server listens only on localhost. To change ports, set `PORT`. Run `npm test` for the validation suite.

## Features and pricing

| Tier | Count | One-time price | Total |
|---|---:|---:|---:|
| Hero | 8 | $5,000 | $40,000 |
| Premium | 10 | $2,000 | $20,000 |
| Standard | 12 | $1,000 | $12,000 |
| Micro | 10 | $300 | $3,000 |
| **Total** | **40** | | **$75,000** |

Custom estimates use `max($300, round up to $50 ($150 + width_cm × height_cm × $0.95))`. The server recomputes every price and validates dimensions. Custom placements reserve the same physical panel space as curated placements, so they can make multiple fixed options unavailable. The $75,000 total is for the fixed catalog; custom substitutions can change the potential total. The goal remains $75,000.

Paid amounts alone count toward progress. The UI caps the progress bar at 100%, while the amount and percentage can report overfunding. The vehicle/tax/wrap split is an organizer budget, not an official Rivian quote.

## Viewer and image provenance

The primary viewer uses Rivian’s publicly served 360-degree R2 render sequence (Standard / 19A / EXP-ESV). An independently written viewer supports dragging, touch, keyboard arrows, zoom, clickable placements and perspective logo previews. It uses the same **image-based rotation technique**, not Rivian’s JavaScript or an official downloadable CAD/GLB model. All 73 source frames are included; frames 1–72 form the rotation loop. The frame cache is bounded and images are loaded as needed.

Source page: https://rivian.com/r2

Source image pattern: `https://media.rivian.com/image/upload/f_webp,q_85,w_1600/v4/gold-iris/visualizer/360/standard/19A/EXP-ESV/00001`

Rivian retains rights to the vehicle render imagery and marks. Public availability does not grant a redistribution license; this package does not grant one. Confirm the organizer’s rights/permission to publish these assets for the campaign before public release, or replace them with licensed renders while retaining the viewer. Attribution is included on the page. This is an independent project, with no claimed Rivian endorsement.

The secondary **Placement model** is an original WebGL visualization for free rotation, tilt and top views. Its proportions use Rivian’s official published length 185.9 in, wheelbase 115.6 in, height 66.9 in, mirror-folded width 78.1 in, and 32-inch tire diameter (reference checked October 15, 2026). Its panel surfaces and camera alignment are approximations. Photo-view overlays are approximate projections, not official surface coordinates. Width/height are planning estimates; installer measurements, legal visibility requirements, glass/roof suitability, sensors, panel seams and final artwork must be reviewed before payment and production.

## Cloudflare Pages deployment

The repository root must contain both `public/` and `functions/`. Uploading only the HTML files or using Pages dashboard drag-and-drop will not deploy the application API.

1. Install tooling and sign in:

   ```sh
   npm ci
   npx wrangler login
   ```

2. Create storage resources:

   ```sh
   npx wrangler d1 create r2-sponsors
   npx wrangler r2 bucket create r2-sponsor-logos
   ```

   Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with the returned database ID. Change the bucket name there if your chosen name differs. Keep the R2 bucket private: no public development URL or custom domain is needed.

3. Initialize the production schema:

   ```sh
   npx wrangler d1 execute r2-sponsors --remote --file=schema.sql
   ```

4. Create a Pages project, deploy the files and configure the secret:

   ```sh
   npx wrangler pages project create r2-sponsor-studio --production-branch=main
   npx wrangler pages secret put ADMIN_TOKEN --project-name=r2-sponsor-studio
   npx wrangler pages deploy public --project-name=r2-sponsor-studio --branch=main
   ```

   At the secret prompt, use a unique random token of at least 32 characters. Never commit it. If your account requires an initial deployment before adding a secret, deploy once, add the secret, and deploy again. The admin API denies access until a sufficiently long secret is configured. Static admin HTML is public; application records and logos require the secret for every request.

5. Open the returned Pages URL. Verify `/api/status` returns a JSON object. Submit a test application, sign in at `/admin.html`, confirm the logo download, and reject the test to release its placement. Local checks cannot verify your production account bindings, so repeat this smoke test after deployment.

For a Cloudflare-runtime local test, set a `.dev.vars` file with a private `ADMIN_TOKEN` and run:

```sh
npx wrangler d1 execute r2-sponsors --local --file=schema.sql
npm run dev
```

The Cloudflare local database is separate from the dependency-free preview database. D1 and R2 bindings are declared in `wrangler.toml`.

Official deployment references: https://developers.cloudflare.com/pages/functions/bindings/ and https://developers.cloudflare.com/pages/functions/wrangler-configuration/

## GitHub workflow

Create an empty repository in your GitHub account and commit the contents of this folder (keep `public/`, `functions/`, schema, configuration and package files at repository root). `.gitignore` excludes secrets, dependencies and local test data.

For Cloudflare Pages Git integration: connect that repository, select framework **None**, leave the build command empty, use output directory **public**, and set the root directory to the repository root. Configure the D1 ID, private R2 binding, schema and ADMIN_TOKEN as above. Redeploy after configuring bindings or secrets. Prefer production deployments from `main`. Before enabling branch previews, provision separate preview storage and secret bindings so previews do not access production application data.

## Application and admin behavior

- Submissions require company, valid email and explicit consent; a logo is optional.
- PNG/JPEG/WebP inputs up to 5 MB are decoded locally, resized to at most 1024 px and re-encoded as PNG. The API accepts only PNG payloads under 1 MB and validates the header/dimensions.
- Logos are stored privately in R2; applicant names, emails, notes and logo identifiers are never in the public status response.
- Pending, approved and paid applications reserve their rectangle. Reservations last until the organizer rejects them; there is no automatic expiry.
- D1 triggers prevent overlapping reservations atomically, including concurrent submissions and rejected applications being reopened. Rejection releases the area; it retains the record for review.
- Authentication uses an in-memory organizer bearer token; it is not saved in browser storage. Sign out or close the page to clear access. Use HTTPS in production.
- Admin records externally confirmed payments; there is no payment processor or automatic refund workflow. Campaign duration, driving region, installation date, cancellation/refund conditions and invoicing are agreed directly with each sponsor before payment.
- This version has no automatic email delivery. Review the dashboard regularly and contact applicants manually. The application success screen provides a reference ID.
- API writes require same-origin requests. A honeypot and payload limits are included. Configure account-level request throttling for public campaigns with significant traffic.
- To fulfill a removal request, use Cloudflare’s D1 console to delete the identified record and remove its corresponding private R2 object. Back up records before operational changes. Do not publish database exports.

## Verification

`npm test` verifies catalog counts, exact funding math, geometric bounds, all 40 placements coexisting, server price authority, custom input validation, privacy, admin authentication, atomic conflict prevention, rejection/reopening and paid-progress accounting. Tests use the real SQL schema and real request handler with SQLite storage.

`npx wrangler pages functions build` verifies the Cloudflare Worker bundle. Manual browser checks include desktop, tablet and phone layout, logo upload, photo preview, custom sizing, view controls, application submission, reservation disabling, admin status changes and sign-out. See `VERIFICATION.md`.

## Files

- `public/`: buildless website, viewer, original WebGL model and render assets.
- `functions/api/[[path]].js`: production Pages Functions API.
- `schema.sql`: D1 schema and atomic geometry triggers.
- `wrangler.toml`: production bindings, with your database ID to configure.
- `scripts/local-server.mjs`: local SQLite/R2 adapter for account-free preview.
- `tests/studio.test.mjs`: behavior and accounting checks.

This package is prepared for deployment; it has not created a GitHub repository or deployed a Cloudflare project in your account.
