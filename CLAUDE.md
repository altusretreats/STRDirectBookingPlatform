# Altus Retreats — Claude Instructions

## Keep this file updated
**Update CLAUDE.md whenever the stack, architecture, secrets, or key decisions change — then commit it.**
This file is the primary context source when starting a new session on any machine.

## Project
Multi-property STR direct booking platform + digital guidebook for Altus Retreats LLC.
Hub domain: altusretreats.net

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
```powershell
# Backend
sam build --template infrastructure/template.yaml
sam deploy --config-env dev

# Admin SPA
cd frontend\admin-spa
npm run build
aws s3 sync dist/ s3://altus-retreats-admin-dev-817760095908/ --delete --profile altus
# Fix MIME types (get exact filename from Get-Item dist\assets\index-*.js first)
aws s3 cp dist\assets\index-XXXX.js s3://altus-retreats-admin-dev-817760095908/assets/index-XXXX.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --profile altus

# Property site / guidebook
aws s3 sync frontend\property-site\ s3://altus-retreats-frontend-dev-817760095908/ --delete --profile altus
aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\css\guidebook.css s3://altus-retreats-frontend-dev-817760095908/guidebook/css/guidebook.css --content-type "text/css" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --profile altus
```

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

## Property site — page structure
- **`index.html`** — Full-viewport hero landing page. Background: full-viewport photo slider (Hospitable or `heroSliderPhotos`). A `frame-border` div (position:absolute, inset:70px, white border, border-radius:26px) acts as a decorative frame. Inside: 2-column snap-scroll layout — left (`frame-scroll`) has 4 sections (landing, property, reviews, location, promise), right (`frame-widget-col`) has the sticky Hospitable booking widget. Nav is 3-column grid (logo | centered links | Book Now). Hero headline (eyebrow + 3 title spans + subtitle) fades out as user scrolls into sections. Bottom bar: dots + amenity pills + rating.
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

## Current state (as of 2026-08-11)
- Admin panel fully functional at admin.altusretreats.net (PropertySettings, ContentEditor, Guidebook, Sync, Waitlist tabs)
- Property site redesigned: snap-scroll frame layout with Hospitable booking widget (committed, **not yet deployed to S3**)
- Guidebook live and data-driven
- Both coming soon pages live with working waitlist capture
- Hub site built as hub.html (ready to swap in when The Lazy Palm launches)
- SES verified: support@altusretreats.net
- Hospitable widget installed on index.html and book.html; `data-site-uuid` may need updating once Direct channel fully configured

## Key pending items
- Logo/branding for The Overhang (pending)
- Deploy property site to S3 (local changes not yet synced)
- AI concierge feature (uses `aiContext` fields already being collected)
- The Lazy Palm: full property setup when ready to launch
