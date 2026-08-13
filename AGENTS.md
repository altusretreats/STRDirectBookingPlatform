# Altus Retreats — Codex Instructions

## Keep this file updated
**Update AGENTS.md whenever the stack, architecture, secrets, or key decisions change — then commit it.**
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
- **Admin SPA:** React + Vite (hash routing `#/properties/{id}/{tab}`, `#/hub/{tab}`); jsPDF is lazy-loaded for client-side, searchable guidebook knowledge exports

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
| getGuidebook | GET /properties/{id}/guidebook | Public. Returns sanitized guest guidebook sections |
| getGuidebook | GET /properties/{id}/guidebook/agent-context | Public Markdown feed. Returns explicitly agent-available guest content + `aiContext`; never `hostNotes` |
| getReviews | GET /properties/{id}/reviews | Public. Returns published admin-managed reviews; no third-party channel imports |
| adminProperties | GET+POST+PUT /admin/properties | CRUD for property records |
| syncProperty | POST /admin/properties/{id}/sync | Fetches Hospitable listing → stores in hospitable.cached on METADATA |
| adminGuidebook | GET+PUT+DELETE /admin/properties/{id}/guidebook/{sectionId} | Guidebook section CRUD |
| adminHub | GET+PUT /admin/hub | Hub site content |
| adminMedia | POST /admin/media/sign | Presigned S3 PUT URLs for media upload |
| adminPlaceLookup | POST /admin/properties/{id}/places/lookup | Google Places API v2 lookup → distance calc |
| adminBookings | GET /admin/properties/{id}/bookings | List bookings |
| adminReviews | GET /admin/properties/{id}/reviews; PUT+DELETE /admin/properties/{id}/reviews/{reviewId} | Property-scoped manual review CRUD; drafts remain private |
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
# Fix MIME types for the entry point and lazy-loaded chunks
Get-ChildItem dist\assets\*.js | ForEach-Object { aws s3 cp $_.FullName "s3://altus-retreats-admin-dev-817760095908/assets/$($_.Name)" --content-type "application/javascript" --metadata-directive REPLACE --profile altus }
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --profile altus

# Property site / guidebook
# The redesign is now the live root index.html. Do not re-pin Coming Soon after syncing.
# Avoid --delete so the S3 rollback backup under backups/ is preserved.
aws s3 sync frontend\property-site\ s3://altus-retreats-frontend-dev-817760095908/ --profile altus
aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\css\guidebook.css s3://altus-retreats-frontend-dev-817760095908/guidebook/css/guidebook.css --content-type "text/css" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --profile altus
```

## DNS / domain routing (IMPORTANT — caused confusion before)
- **`www.staytheoverhang.com`** → CloudFront distribution `EP3TSR36W3F7N` (`d2mbuzsam5af3c.cloudfront.net`) → frontend S3 bucket. **This is the real site.** Use `www` when verifying deploys.
- **`staytheoverhang.com` (bare root)** → still points to a **GoDaddy Website Builder** page (`76.223.105.230`), NOT CloudFront. Changes to S3/CloudFront do NOT appear at bare root until root DNS is repointed to CloudFront (GoDaddy DNS / Route 53 ALIAS — a manual registrar task).
- The distribution has aliases for both `staytheoverhang.com` and `www.staytheoverhang.com`, so it's ready — only the root DNS record needs to change.
- **When testing "why don't I see my change":** (1) test `www.staytheoverhang.com`, not bare root; (2) the root page versions `css/main.css` and `js/app.js` with query strings. Increment those versions whenever either asset changes, then invalidate CloudFront. A hard refresh remains useful during testing.

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
- Branded AI guide context: `https://www.staytheoverhang.com/guidebook/agent-context.md` routes through the property CloudFront distribution to the live API with caching disabled. `PropertySitePropertyId` scopes that distribution's API origin.

## Secrets Manager convention
- Hospitable PAT: `altus-retreats/{env}/hospitable` → `{ "default": "<PAT>", "kentucky": "<PAT>" }`
- Google Places API: `altus-retreats/{env}/google` → `{ "placesApiKey": "AIza..." }`
- (Stripe removed — Hospitable handles payments)

## DynamoDB conventions
- All money in **cents** (integers)
- `ttl` attribute on FAILED bookings and cache entries (Unix timestamp)
- Guidebook section SK: `GUIDEBOOK#SECTION#{order_padded}#{sectionId}` — zero-padded order for correct lexicographic sort
- Manually managed review SK: `REVIEW#MANUAL#{reviewId}`. Records include reviewer name, exact review text, 1–5 rating, optional stay date/source label, `featured`, and `published`.
- Property METADATA record holds `hospitable.cached` (full synced listing), `content` (admin overrides), `location` (admin overrides), `branding`

## Data architecture — key decisions
- **Hospitable is source of truth** for all listing content (name, photos, amenities, house rules, description, location). Admin overrides are merged on top via `stripEmpty()` so blank fields never clobber Hospitable data.
- **Seed script is minimal** — only creates the structural record with slug, name, domain, Hospitable property ID, and empty content/location. Never seed content.
- **syncProperty** stores the full Hospitable listing under `property.hospitable.cached` and `lastSyncedAt`. Run from admin → Sync tab or daily at 2am EST via EventBridge.
- **Guidebook place items** (`type: 'place'`) store Google Places v2 data under `item.place`. `aiContext` is hidden from guests and available only through the curated agent feed; `hostNotes` remains admin-only.
- **Reviews are independent records, not listing content.** The admin Reviews tab manages authentic guest feedback. The public reviews endpoint returns only published admin-managed records and sorts featured reviews first. Third-party channel reviews are intentionally not imported, and Hospitable sync never overwrites reviews.

## Guidebook — place items
Place items in a recommendations section (`sectionType: 'recommendations'`) render as a card grid grouped by category (Restaurants / Attractions / Activities / Shopping). Clicking a card opens a detail modal with Directions button (uses lat/lng coordinates for reliable Google Maps routing).

## Guidebook — guest UI and AI context boundary
- The guest guide at `frontend/property-site/guidebook/` is one responsive application with two information hierarchies: a rich journey overview on desktop/tablet and a calm intent-first home on mobile. Both use the same published section data.
- Sections are grouped client-side into Arriving / At the house / Explore / Checking out, so adding a property remains a data operation. Existing text, image, video, map, link, copyable code, search, and Google Place item types remain supported.
- Guest-facing navigation, section, search, and place-fallback icons use one restrained deep-blue outline system; admin-authored emoji icons are intentionally mapped to semantic outline icons in the guest UI for visual consistency.
- `GET /properties/{id}/guidebook` is guest-facing and must never return `aiContext`, `hostNotes`, DynamoDB keys, or other internal fields. It returns a sanitized guest projection of published sections only.
- `GET /properties/{id}/guidebook/agent-context` is a public, machine-readable Markdown feed containing sections enabled by `aiPublished`, their guest content, place facts, and section/item `aiContext`. It never includes `hostNotes` or DynamoDB metadata.
- Admin guidebook saves preserve section-level `sectionType`, `aiContext`, and `aiPublished`, as well as item-level fields. "Visible to guests" (`published`) and "Available to AI agents" (`aiPublished`) are independent controls. During migration, records without `aiPublished` inherit `published` until explicitly saved.
- Guidebook sections support a first-class `welcome` section type with a dedicated, label-free Welcome Message editor. The first published guest text item in that section supplies the complete guide hero message. `property.content.guidebookHeroPhoto` is the dedicated guide hero image override, falling back to property hero media and then Hospitable photos.
- The guest search uses a lightweight synonym layer for common intent terms (for example, food/eat/dining/restaurants, Wi-Fi/internet, and check-in/arrival) while searching the same guidebook content.
- The guest guide is a public, non-sensitive house manual and deliberately contains no booking CTA, return-to-property-site link, direct-booking promotion, discount, or review solicitation. This reduces OTA off-platform risk but does not make the `staytheoverhang.com` URL itself risk-free when shared through Airbnb or Vrbo messaging.
- The guidebook does not expose Wi-Fi credentials, door codes, personal contact details, or reservation-specific information. Wi-Fi is provided by in-house QR codes/the secure guest portal, and door access is delivered through the reservation email or booking channel.
- Guidebook Help is informational rather than an embedded messaging channel. Every **Need help?**, **Help**, or **Contact instructions** entry point opens a responsive dialog directing the guest to reply to the original booking message in the app or email used to reserve the stay. This keeps communication attached to the reservation; there is currently no HostBuddy widget or custom guest-to-host messaging integration.
- The admin Guidebook tab can generate a searchable, text-based PDF for Hospitable's Knowledge Hub. Generation is entirely client-side from the currently saved section data, includes only sections enabled by `aiPublished` (with the same `published` migration fallback as the agent feed), includes guest content/place facts/`aiContext`, and excludes `hostNotes` by construction. The stable filename is `{propertyId}-hospitable-ai-knowledge.pdf`. Save section edits before downloading.

## Property site — page structure
- **`index.html`** — The live property home page at `www.staytheoverhang.com/`. It currently retains `<meta name="robots" content="noindex,nofollow">` while the root deployment is being tested with the Hospitable widget.
- **`frontend/overhang-coming-soon/index.html`** — Recoverable Coming Soon source only; it is no longer the bucket root. The exact pre-redesign root was also backed up in S3 at `backups/index-coming-soon-before-redesign-2026-08-11.html`.
- **`index.html` (the redesign)** — Full-viewport framed hero and dynamic photo slider transitioning into a normal-scrolling editorial property page with the sticky Hospitable booking widget. The compact nav is Overview / Amenities / Reviews / Location plus Book Now.
- **Hospitable widget integration** — The generated `#booking-iframe` is kept at Hospitable's native 320px canvas width and centered inside `.site__widget-inner`. The local wrapper owns the border/radius, deliberately has no shadow, clips the widget's final 6px to hide Hospitable's iframe-edge shadow artifacts, and never reaches into or alters widget functionality. Book Now scrolls to this on-page widget at every viewport size with sticky-header clearance.
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
  - `heroLandingStatement` — optional editorial sentence shown at the bottom of the hero; defaults to the local slow-mornings/memorable-nights copy. This replaces the visible landing amenity pills in the current redesign.
  - `heroSliderPhotos` — array of S3 URLs for custom hero background images; takes priority over heroPhoto and Hospitable photos in the slider
  - `guidebookHeroPhoto` — dedicated guest-guide hero image; falls back to property hero media and Hospitable photos
  - `overviewKicker`, `overviewTitle`, `amenitiesTitle` — editorial property overview and amenities headings
  - `experienceKicker`, `experienceTitle`, `experiencePrimaryTitle`, `experiencePrimaryBody`, `experienceSecondaryTitle`, `experienceSecondaryBody` — homepage experience section copy
  - `reviewsKicker`, `reviewsTitle`, `locationKicker`, `locationTitle`, `promiseKicker`, `promiseTitle`, `promiseIntro` — homepage reviews, location, and Altus-standard supporting copy
  - `aboutShow`, `aboutTitle`, `aboutBody` — about section
  - `houseRulesOverride`, `houseRules` — rules override
  - `customSections[]` — extra content sections
  - `overrides{}` — lock flags to prevent sync from overwriting fields

## Properties (future)
- **The Lazy Palm** — Bradenton FL, coastal/tropical, family-friendly, pool. Domain: staythelazypalm.com (registered, no infrastructure yet). Adding a property is a data operation only — no code changes needed.

## Current state (as of 2026-08-12)
- Admin panel fully functional at admin.altusretreats.net (PropertySettings, ContentEditor, Guidebook, Sync, Waitlist tabs)
- Admin SPA facelift deployed 2026-08-12: responsive Deep Blue/Canyon Red/Mist workspace styling aligned with the property guide, expanded editors for every editorial homepage section, content saves that preserve media and other tab-owned fields, a first-class Welcome guidebook section type, and a dedicated guidebook hero image uploader.
- Property-scoped review management added 2026-08-12: the admin Reviews tab supports draft/published reviews, featured placement, reviewer name, rating, stay date, source label, and exact review text. Published reviews feed the existing homepage review wall; featured reviews display first.
- Four layout-testing reviews are stored for `kentucky` as unpublished drafts (`demo-layout-1` through `demo-layout-4`). They are clearly labeled `Demo content - do not publish`, exercise featured and standard card layouts, and must not be presented as authentic guest testimonials. The live public reviews feed remains empty until a real review is deliberately published.
- Property site redesign is deployed as the root `index.html` at `www.staytheoverhang.com/` for live Hospitable widget testing (latest frontend deployment and CloudFront verification completed 2026-08-12). The page remains noindex during testing.
- The property page uses a wide editorial layout with a Blue + Canyon Red palette (`#1D3557`, `#D1614D`, `#FBFDFF`), full-width responsive photo gallery, centered content + Hospitable widget rail, logo/title lockup, dynamic property facts, conditional two-king-bedroom callout, experience photography, BOLT-inspired dynamic review wall, and scroll-rise reveals. The compact guest-oriented navigation is Overview / Amenities / Reviews / Location, with ordered scroll-position tracking for reliable active states in both directions. The photo gallery has a persistent mobile-safe View All entry point, a masonry-style editorial index, and a deep-blue immersive lightbox with keyboard, thumbnail, and swipe navigation. Hospitable amenities are grouped client-side into scannable category cards, with the complete dynamic list available in a categorized, instantly searchable modal. The closing "Altus standard" section uses four specific numbered commitments (honest listing, arrival preparation, real support, and direct-booking value) instead of decorative icons. The landing retains its framed photo-slider layout with layered contrast, a glass navigation rail, Canyon Red Book Now button, animated Explore cue, and a restrained scroll-linked hero parallax/fade into a compact deep-blue property header. A subtle lower-left back-to-landing button appears only after the gallery has passed. Book Now scrolls to the centered on-page Hospitable widget on desktop and mobile; at 390px the complete widget lands below the sticky header and remains fully visible. Reduced-motion preferences are honored, and all existing API/widget hooks remain intact.
- `getReviews` Lambda (`GET /properties/{propertyId}/reviews`) is SAM-deployed and live.
- MediaBucket allows public `s3:GetObject` on `properties/*` only (added 2026-08-11) — uploaded photos (hero slider, etc.) are embedded as direct S3 URLs in property content and need to be publicly readable. ACLs stay blocked; access is via bucket policy only.
- The Overhang logo is live at `frontend/property-site/img/logo-the-overhang.png`, wired into `index.html`'s nav (`.nav__logo-img`) and the property-title lockup. The property-title treatment removes rounding and renders the transparent mark in black. `book.html` still uses the old text-based logo — not yet updated to match.
- Bare-root `staytheoverhang.com` still on GoDaddy Website Builder — root DNS repoint to CloudFront is pending (see DNS / domain routing section).
- Guidebook live and data-driven
- Public AI guidebook context feed and independent per-section AI availability control are deployed and live. The feed is public by design, so private access details must not be enabled for it, and `hostNotes` are excluded by construction.
- The branded agent-feed URL is `https://www.staytheoverhang.com/guidebook/agent-context.md`; CloudFront proxies it dynamically to API Gateway, so admin content changes require no frontend deployment.
- Guidebook guest frontend redesigned as a responsive stay companion: desktop/tablet provides a rich journey overview and quick-essential rail, while mobile uses an intent-first home with focused drill-down screens. The public API strips AI/private fields, and admin saves now retain section-level AI context and section type.
- Guidebook contact guidance was deployed 2026-08-12: the desktop footer displays the booking-message instruction directly, and all desktop/mobile Help controls open the same accessible dialog. Guests are told to reply through the app or email used for their reservation; no contact data or reservation identifiers are exposed.
- Admin Guidebook PDF export added 2026-08-12: **Download AI knowledge PDF** produces a branded, searchable document for manual upload to Hospitable's Knowledge Hub. It is generated on demand in the browser with no backend storage and excludes private host notes and non-AI sections.
- The hub Coming Soon page remains live; The Overhang Coming Soon page is retained as a rollback source but is not currently the public root.
- Hub site built as hub.html (ready to swap in when The Lazy Palm launches)
- SES verified: support@altusretreats.net
- Hospitable widget installed on index.html and book.html; `data-site-uuid` may need updating once Direct channel fully configured

## Key pending items
- Root domain `staytheoverhang.com` still needs DNS repoint off GoDaddy (see DNS / domain routing section)
- AI concierge chat/agent integration (the public Markdown context feed and inclusion controls are complete)
- The Lazy Palm: full property setup when ready to launch

## Imported Claude Cowork project instructions
