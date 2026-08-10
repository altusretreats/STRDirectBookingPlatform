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

## Deploy commands (PowerShell on Windows)
```powershell
# Backend
sam build --template infrastructure/template.yaml
sam deploy --config-env dev

# Admin SPA
cd frontend\admin-spa
npm run build
aws s3 sync dist/ s3://altus-retreats-admin-dev-817760095908/ --delete
# Fix MIME types (get exact filename from Get-Item dist\assets\index-*.js first)
aws s3 cp dist\assets\index-XXXX.js s3://altus-retreats-admin-dev-817760095908/assets/index-XXXX.js --content-type "application/javascript" --metadata-directive REPLACE
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*"

# Property site / guidebook
aws s3 sync frontend\property-site\ s3://altus-retreats-frontend-dev-817760095908/ --delete
aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --metadata-directive REPLACE
aws s3 cp frontend\property-site\guidebook\css\guidebook.css s3://altus-retreats-frontend-dev-817760095908/guidebook/css/guidebook.css --content-type "text/css" --metadata-directive REPLACE
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*"
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
- **`index.html`** — Full-viewport hero landing page. Slides (Hospitable photos) fill the entire background. A decorative `frame-border` (position:absolute, inset:70px, 6.5px white border, border-radius:26px) sits on top as a frame. Nav is 3-column grid (logo | centered links | Book Now). Left-aligned headline with 3 spans (`.hero__title-main`, `.hero__title-accent`, `.hero__title-dim`). Bottom bar: dots | amenity pills | rating. Scrolls to about/amenities/location sections below.
- **`book.html`** — Booking page. Nav + hero strip (first photo) + 2-column layout: property details left (stats, about, amenities, house rules), Hospitable widget right (sticky). `css/book.css` + `js/book.js`.
- **`js/app.js`** — Fetches `/properties/{id}`, populates hero slides, pills, title blocks, below-fold sections.
- **Content fields** (all in `property.content`, admin-editable via ContentEditor):
  - `heroHeadline` — property name override
  - `heroSubtitle` — tagline / description override
  - `heroEyebrow` — eyebrow text above title (e.g. "Daniel Boone National Forest · Kentucky")
  - `heroTitleLine1` — white title line (e.g. "Your Kentucky")
  - `heroAccentWord` — gold accent word (e.g. "Escape")
  - `heroTitleSuffix` — faded suffix (e.g. "Awaits.")
  - `heroPhoto` — hero image URL override
  - `aboutShow`, `aboutTitle`, `aboutBody` — about section
  - `houseRulesOverride`, `houseRules` — rules override
  - `customSections[]` — extra content sections
  - `overrides{}` — lock flags to prevent sync from overwriting fields

## Key pending items
- Logo/branding pending
- AI concierge feature (uses `aiContext` fields already being collected)
- Hospitable widget `data-site-uuid` may need updating once Direct channel is fully configured
