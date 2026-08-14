# Deploy the Guest Guidebook

Last reviewed: 2026-08-12. The property-site widget release did not change this guidebook deployment workflow.

Step-by-step instructions to publish changes to the digital guidebook (`frontend/property-site/guidebook/`) — no AI assistant required. Run everything in **PowerShell**.

## What you're deploying

| Thing | Value |
|---|---|
| Live URL | `https://www.staytheoverhang.com/guidebook/` |
| S3 bucket | `altus-retreats-frontend-dev-817760095908` (same bucket as the property site — guidebook is just a subfolder, `/guidebook/`) |
| CloudFront distribution ID | `EP3TSR36W3F7N` (same as the property site) |
| Source folder | `C:\STRProjects\STRDirectBookingPlatform\frontend\property-site\guidebook\` |

The guidebook is plain HTML/CSS/JS — no frontend build step is needed. Its desktop and mobile layouts are one responsive application backed by the public guidebook API.

## Prerequisites (one-time setup)

**AWS CLI installed and configured** — see [DEPLOY-FRONTEND.md](DEPLOY-FRONTEND.md) prerequisites (same setup, same `altus` profile).

## Steps

**1. Open PowerShell and go to the project folder:**
```powershell
cd C:\STRProjects\STRDirectBookingPlatform
```

**2. Sync just the guidebook folder to its S3 path:**
```powershell
aws s3 sync frontend\property-site\guidebook\ s3://altus-retreats-frontend-dev-817760095908/guidebook/ --delete --profile altus
```

**3. Set content types and disable stale browser caching** (S3 sometimes guesses these incorrectly, and the guidebook filenames are not versioned):
```powershell
aws s3 cp frontend\property-site\guidebook\index.html s3://altus-retreats-frontend-dev-817760095908/guidebook/index.html --content-type "text/html" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\css\guidebook.css s3://altus-retreats-frontend-dev-817760095908/guidebook/css/guidebook.css --content-type "text/css" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
```

**4. Clear CloudFront's cache:**
```powershell
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/guidebook/*" --profile altus
```
Wait 1–3 minutes, or check status with the `Id` it prints:
```powershell
aws cloudfront get-invalidation --distribution-id EP3TSR36W3F7N --id <paste-the-Id-here> --profile altus --query 'Invalidation.Status' --output text
```

**5. Check it live.** Open https://www.staytheoverhang.com/guidebook/ and **hard-refresh** (`Ctrl+Shift+R`) to confirm your change is there.

## Notes / gotchas

- **Only invalidate `/guidebook/*`**, not `/*` — no need to clear the cache for the rest of the property site when you've only touched guidebook files. (If you *did* also change other property-site files, see [DEPLOY-FRONTEND.md](DEPLOY-FRONTEND.md) instead, which covers `/*`.)
- If you only changed one file, you can skip the full sync and push just that file — e.g. for a JS-only change:
  ```powershell
  aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
  aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/guidebook/*" --profile altus
  ```
- The guidebook is data-driven — most content changes (place recommendations, sections, house rules) are made through the **admin panel** (Guidebook tab), not by editing these files. Only edit these files for actual code/design changes.
- The desktop overview and mobile intent-first experience are two responsive layouts of the same guidebook. Do not create a separate mobile page or a second content source.
- Guest section icons are mapped to the outline icon system in `guidebook.js`; emoji saved by the admin are not rendered directly to guests.
- Sections and individual recommendations may be tagged for Hikers, Climbers, Off-roaders, Golfers, Families, and Nightlife. The guest Explore view derives its available filter chips from published data, so unused audiences stay hidden. A section-level tag exposes the complete section under that filter; item-level tags filter a mixed recommendations section.
- The `guide` item type supports limited Markdown paragraphs, bullets, and HTTPS links for content such as packing lists. Affiliate recommendations require a visible plain-language commission disclosure adjacent to the links. For Amazon Associates, register the guidebook website in the Associates account and clearly display Amazon's required associate-identification statement on the guide. Do not publish prices or Amazon product imagery unless they are supplied through a compliant, maintained Amazon integration.
- Contact controls do not send messages from the guidebook. The desktop footer shows the instruction directly, and desktop/mobile Help controls open a dialog directing guests back to the original booking message in their booking app or email. Keep this wording channel-neutral so it works for Airbnb, Vrbo, and direct reservations.
- Do not add Wi-Fi credentials, door codes, personal contact information, or reservation-specific data to the public guide. Wi-Fi is supplied inside the property/secure portal; door access is delivered through the reservation channel.

## When backend guidebook fields change

If a change also touches `backend/functions/getGuidebook/` or `backend/functions/adminGuidebook/`, deploy the SAM stack before publishing the frontend:

The public guest endpoint is `/properties/{propertyId}/guidebook`. The separate public AI endpoint is `/properties/{propertyId}/guidebook/agent-context` and returns Markdown. The property-domain URL `/guidebook/agent-context.md` is a no-cache CloudFront proxy to that API response, so admin changes remain immediate. Section inclusion is managed with **Available to AI agents** in the admin Guidebook editor; do not put private access details in agent-enabled sections, and keep operational notes in `hostNotes`.

```powershell
cd C:\STRProjects\STRDirectBookingPlatform
sam build --template infrastructure/template.yaml
cd infrastructure
sam deploy --config-env dev --no-confirm-changeset
cd ..
```

The public endpoint is guest-facing and must not contain `aiContext`, `hostNotes`, DynamoDB keys, or internal metadata. After a backend deployment, verify the boundary:

```powershell
$response = Invoke-RestMethod -Uri "https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev/properties/kentucky/guidebook"
$json = $response | ConvertTo-Json -Depth 20 -Compress
if ($json -match 'aiContext|hostNotes|PROPERTY#|GUIDEBOOK#SECTION') {
  throw "Public guidebook API contains private or internal fields"
}
```

After frontend contact-flow changes, verify both layouts: at desktop width the footer must show the booking-message instruction, and at mobile width the **Help** tab must open the same contact-instructions dialog. Confirm that the page does not display a host phone number, email address, door code, or Wi-Fi password.
