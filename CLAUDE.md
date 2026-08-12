# Altus Retreats — Claude Instructions

## Keep this file updated
**Update CLAUDE.md whenever the stack, architecture, secrets, or key decisions change — then commit it.**
This file is the primary context source when starting a new session on any machine.

## Project
Multi-property STR direct booking platform + digital guidebook for Altus Retreats LLC.
Hub domain: altusretreats.net
Visual system: [`STYLE-GUIDE.md`](STYLE-GUIDE.md)

## You have full autonomy on this project
Run any bash command needed. Install packages. Deploy. Don't ask for permission on individual steps — complete the full task and report back when done.

## Stack
- **Runtime:** Node.js 22.x (arm64 Lambda)
- **IaC:** AWS SAM (`infrastructure/template.yaml`)
- **Database:** DynamoDB single-table (`altus-retreats-{env}`) — see `docs/dynamo-table-design.md`
- **Auth:** AWS Cognito (admin only; guest endpoints are public)
- **Secrets:** AWS Secrets Manager — never hardcode keys
- **Payments:** Hospitable is merchant of record — their widget handles checkout. No Stripe.
- **Calendar sync:** Hospitable API (sync via `syncProperty` Lambda)
- **Frontend:** Static S3 + CloudFront (no SSR)
- **Admin SPA:** React + Vite (hash routing `#/properties/{id}/{tab}`, `#/hub/{tab}`)

## Multi-property — non-negotiable
Every function, query, and data record is scoped by `propertyId`. Never hardcode a property. Adding a new property is a data operation only.

## Properties
- **kentucky** — The Overhang, staytheoverhang.com, Hospitable property UUID: c62c4391-eca2-48c2-8bfe-d0193f6890dc

## Project structure
```
infrastructure/   SAM template + samconfig.toml
backend/
  functions/      One directory per Lambda handler
  layers/shared/  Shared utilities (DynamoDB client, Secrets Manager helper, Hospitable client)
frontend/
  property-site/  Per-property booking site (vanilla JS)
    guidebook/    Guest digital guidebook (separate page)
  admin-spa/      Admin panel (React + Vite)
  hub-site/       altusretreats.net aggregate view
docs/             Architecture and design decisions
scripts/          Seed scripts (minimal — Hospitable is source of truth for content)
```

## Lambda functions
| Function | Route | Notes |
|---|---|---|
| getProperty | GET /properties/{id} | Public. Reads METADATA record, merges admin overrides over hospitable.cached |
| getAvailability | GET /properties/{id}/availability | Public. Proxies Hospitable calendar |
| getGuidebook | GET /properties/{id}/guidebook | Public. Returns guidebook sections |
| adminProperties | GET+POST+PUT /admin/properties | CRUD for property records |
| syncProperty | POST /admin/properties/{id}/sync | Fetches Hospitable listing → stores in hospitable.cached on METADATA |
| adminGuidebook | GET+PUT+DELETE /admin/properties/{id}/guidebook/{sectionId} | Guidebook section CRUD |
| adminHub | GET+PUT /admin/hub | Hub site content |
| adminMedia | POST /admin/media/sign | Presigned S3 PUT URLs for media upload |
| adminPlaceLookup | POST /admin/properties/{id}/places/lookup | Google Places API v2 lookup → distance calc |
| adminBookings | GET /admin/properties/{id}/bookings | List bookings |
| waitlist | POST /waitlist, GET /admin/waitlist | Waitlist capture |

## AWS Profile
All AWS CLI and SAM commands use the named profile `altus` (region: `us-east-1`).
Set up once with: `aws configure --profile altus`
SAM profile is set in `samconfig.toml` under `[dev.deploy.parameters] profile = "altus"`.

## Deploy commands (PowerShell on Windows)
See also [`DEV-COMMANDS.md`](DEV-COMMANDS.md) for the full quick-reference (resource IDs, admin SPA build, secrets, seed scripts), or these self-contained step-by-step guides (no AI assistant needed): [`DEPLOY-FRONTEND.md`](DEPLOY-FRONTEND.md) (property site), [`DEPLOY-ADMIN.md`](DEPLOY-ADMIN.md) (admin panel), [`DEPLOY-GUIDEBOOK.md`](DEPLOY-GUIDEBOOK.md) (guest guidebook).

`sam`/`aws` may not be on PATH in every shell — if `sam` isn't found, the CLI is at `C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd` (call that directly, NOT the `runtime\Scripts\sam.exe` — that one fails silently).

**`sam deploy --config-env dev` MUST be run from `infrastructure/`** — that's where `samconfig.toml` lives (stack name, profile, `disable_rollback = true`). Running it from the repo root silently skips that config and falls back to SAM's auto-managed bucket/defaults, which can diverge from the real deployed stack.

```powershell
# Backend
sam build --template infrastructure/template.yaml
cd infrastructure
sam deploy --config-env dev
cd ..

# Admin SPA
cd frontend\admin-spa
npm run build
aws s3 sync dist/ s3://altus-retreats-admin-dev-817760095908/ --delete --profile altus
# Fix MIME types (get exact filename from Get-Item dist\assets\index-*.js first)
aws s3 cp dist\assets\index-XXXX.js s3://altus-retreats-admin-dev-817760095908/assets/index-XXXX.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --profile altus

# Property site / guidebook
# NOTE: property-site/ contains preview.html (redesign), NOT index.html.
# The bucket's index.html is the Coming Soon page (from overhang-coming-soon/).
# --delete will remove index.html unless you re-deploy coming-soon right after (do both):
aws s3 sync frontend\property-site\ s3://altus-retreats-frontend-dev-817760095908/ --delete --profile altus
aws s3 cp frontend\overhang-coming-soon\index.html s3://altus-retreats-frontend-dev-817760095908/index.html --content-type "text/html" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\css\guidebook.css s3://altus-retreats-frontend-dev-817760095908/guidebook/css/guidebook.css --content-type "text/css" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --profile altus
```

## DNS / domain routing (IMPORTANT — caused confusion before)
- **`www.staytheoverhang.com`** → CloudFront distribution `EP3TSR36W3F7N` (`d2mbuzsam5af3c.cloudfront.net`) → frontend S3 bucket. **This is the real site.** Use `www` when verifying deploys.
- **`staytheoverhang.com` (bare root)** → still points to a **GoDaddy Website Builder** page (`76.223.105.230`), NOT CloudFront. Changes to S3/CloudFront do NOT appear at bare root until root DNS is repointed to CloudFront (GoDaddy DNS / Route 53 ALIAS — a manual registrar task).
- The distribution has aliases for both `staytheoverhang.com` and `www.staytheoverhang.com`, so it's ready — only the root DNS record needs to change.
- **When testing "why don't I see my change":** (1) test `www.staytheoverhang.com`, not bare root; (2) hard-refresh — assets (`css/main.css`, `js/app.js`) are referenced without cache-busting version strings, so browsers hold stale copies even after a CloudFront invalidation.

## CloudFront distribution IDs
- Admin SPA: `E6XS2Y3HPS1YG` (admin.altusretreats.net)
- Property site: `EP3TSR36W3F7N` (staytheoverhang.com)
- Hub site: `E1X6NMJ8MCF7HR` (altusretreats.net)

## S3 buckets
- Admin: `altus-retreats-admin-dev-817760095908`
- Property/guidebook: `altus-retreats-frontend-dev-817760095908`
- Hub: `altus-retreats-hub-dev-817760095908`
- Media: `altus-retreats-media-dev-817760095908`

## API Gateway
- Dev endpoint: `https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev`

## Secrets Manager convention
- Hospitable PAT: `altus-retreats/{env}/hospitable` → `{ "default": "<PAT>", "kentucky": "<PAT>" }`
- Google Places API: `altus-retreats/{env}/google` → `{ "placesApiKey": "AIza..." }`
- (Stripe removed — Hospitable handles payments)

## DynamoDB conventions
- All money in **cents** (integers)
- `ttl` attribute on FAILED bookings and cache entries (Unix timestamp)
- Guidebook section SK: `GUIDEBOOK#SECTION#{order_padded}#{sectionId}` — zero-padded order for correct lexicographic sort
- Property METADATA record holds `hospitable.cached` (full synced listing), `content` (admin overrides), `location` (admin overrides), `branding`

## Data architecture — key decisions
- **Hospitable is source of truth** for all listing content (name, photos, amenities, house rules, description, location). Admin overrides are merged on top via `stripEmpty()` so blank fields never clobber Hospitable data.
- **Seed script is minimal** — only creates the structural record with slug, name, domain, Hospitable property ID, and empty content/location. Never seed content.
- **syncProperty** stores the full Hospitable listing under `property.hospitable.cached` and `lastSyncedAt`. Run from admin → Sync tab or daily at 2am EST via EventBridge.
- **Guidebook place items** (`type: 'place'`) store Google Places v2 data under `item.place`. `aiContext` and `hostNotes` fields on every item/section are hidden from guests and reserved for future AI concierge.

## Guidebook — place items
Place items in a recommendations section (`sectionType: 'recommendations'`) render as a card grid grouped by category (Restaurants / Attractions / Activities / Shopping). Clicking a card opens a detail modal with Directions button (uses lat/lng coordinates for reliable Google Maps routing).

## Guidebook — guest UI and AI context boundary
- The guest guide at `frontend/property-site/guidebook/` is one responsive application with two information hierarchies: a rich journey overview on desktop/tablet and a calm intent-first home on mobile. Both use the same published section data.
- Sections are grouped client-side into Arriving / At the house / Explore / Checking out. Existing text, image, video, map, link, copyable code, search, and Google Place item types remain supported.
- Guest-facing navigation, section, search, and place-fallback icons use one restrained deep-blue outline system; admin-authored emoji are mapped to semantic outline icons in the guest UI.
- `GET /properties/{id}/guidebook` must never return `aiContext`, `hostNotes`, DynamoDB keys, or internal fields. It returns a sanitized guest projection of published sections only.
- `aiContext` is intended for a separate future agent-readable context endpoint/page. `hostNotes` is private admin-only content and must never be returned to guests or AI agents.
- Admin guidebook saves preserve section-level `sectionType` and `aiContext`. "Visible to guests" (`published`) controls only the guest guide; a future AI feed needs its own inclusion control.

## Property site — page structure
- **`index.html`** — The **public Coming Soon page** (source: `frontend/overhang-coming-soon/index.html`, deployed to the frontend bucket root). This is what visitors see at staytheoverhang.com until launch.
- **`preview.html`** — The **future home page / redesign** (the file described below). Served at `www.staytheoverhang.com/preview.html`, carries `<meta name="robots" content="noindex,nofollow">` so it stays out of search. **At launch:** rename `preview.html` → `index.html` (overwrites the coming-soon) and it becomes the public site — all internal back-links (book.html, guidebook) already point to `index.html`, so they resolve correctly post-launch with no edits.
- **`preview.html` (the redesign)** — Full-viewport hero landing page. Background: full-viewport photo slider (Hospitable or `heroSliderPhotos`). A `frame-border` div (position:absolute, inset:70px, white border, border-radius:26px) acts as a decorative frame. Inside: 2-column snap-scroll layout — left (`frame-scroll`) has 4 sections (landing, property, reviews, location, promise), right (`frame-widget-col`) has the sticky Hospitable booking widget. Nav is 3-column grid (logo | centered links | Book Now). Hero headline (eyebrow + 3 title spans + subtitle) fades out as user scrolls into sections. Bottom bar: dots + amenity pills + rating.
- **Section structure in `frame-scroll`:** Each content section (reviews, location, promise) uses `frame-section > frame-section__wrap > frame-section__inner` (frosted glass panel). The property section uses `frame-section > frame-section__inner--property` (no wrap — full bleed photo grid).
- **`book.html`** — Booking page. Nav + hero strip (first photo) + 2-column layout: property details left (stats, about, amenities, house rules), Hospitable widget right (sticky). `css/book.css` + `js/book.js`.
- **`js/app.js`** — Fetches `/properties/{id}`, populates hero slides, pills, title blocks, frame sections (photos, description, amenities, reviews, location, promise).
- **Content fields** (all in `property.content`, admin-editable via ContentEditor):
  - `heroHeadline` — property name override
  - `heroSubtitle` — tagline / description override
  - `heroEyebrow` — eyebrow text above title (e.g. "Daniel Boone National Forest · Kentucky")
  - `heroTitleLine1` — white title line (e.g. "Your Kentucky")
  - `heroAccentWord` — gold accent word (e.g. "Escape")
  - `heroTitleSuffix` — faded suffix (e.g. "Awaits.")
  - `heroPhoto` — hero image URL override
  - `heroLandingPills` — array of up to 5 pill strings shown at bottom of hero (independent of amenities)
  - `heroSliderPhotos` — array of S3 URLs for custom hero background images; takes priority over heroPhoto and Hospitable photos in the slider
  - `aboutShow`, `aboutTitle`, `aboutBody` — about section
  - `houseRulesOverride`, `houseRules` — rules override
  - `customSections[]` — extra content sections
  - `overrides{}` — lock flags to prevent sync from overwriting fields

## Properties (future)
- **The Lazy Palm** — Bradenton FL, coastal/tropical, family-friendly, pool. Domain: staythelazypalm.com (registered, no infrastructure yet). Adding a property is a data operation only — no code changes needed.

## Current state (as of 2026-08-12)
- Admin panel fully functional at admin.altusretreats.net (PropertySettings, ContentEditor, Guidebook, Sync, Waitlist tabs)
- Property site redesign is deployed as the live root at `www.staytheoverhang.com/`. The page remains noindex while the Hospitable widget is being tested.
- `getReviews` Lambda (`GET /properties/{propertyId}/reviews`) is SAM-deployed and live.
- MediaBucket allows public `s3:GetObject` on `properties/*` only (added 2026-08-11) — uploaded photos (hero slider, etc.) are embedded as direct S3 URLs in property content and need to be publicly readable. ACLs stay blocked; access is via bucket policy only.
- The Overhang logo is live at `frontend/property-site/img/logo-the-overhang.jpg`, wired into `index.html`'s nav (`.nav__logo-img`). `book.html` still uses the old text-based logo — not yet updated to match.
- Bare-root `staytheoverhang.com` still on GoDaddy Website Builder — root DNS repoint to CloudFront is pending (see DNS / domain routing section).
- Guidebook guest frontend is live as a responsive stay companion: rich desktop overview, intent-first mobile home, focused journey screens, and a unified outline icon system. The public API strips AI/private fields, and admin saves retain section AI context and section type.
- The property-site coming-soon page remains as a rollback source; the hub coming-soon page remains live.
- Hub site built as hub.html (ready to swap in when The Lazy Palm launches)
- SES verified: support@altusretreats.net
- Hospitable widget installed on index.html and book.html; `data-site-uuid` may need updating once Direct channel fully configured

## Key pending items
- Root domain `staytheoverhang.com` still needs DNS repoint off GoDaddy (see DNS / domain routing section)
- AI concierge feature (uses `aiContext` fields already being collected)
- The Lazy Palm: full property setup when ready to launch
