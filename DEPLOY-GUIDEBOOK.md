# Deploy the Guest Guidebook

Step-by-step instructions to publish changes to the digital guidebook (`frontend/property-site/guidebook/`) — no AI assistant required. Run everything in **PowerShell**.

## What you're deploying

| Thing | Value |
|---|---|
| Live URL | `https://www.staytheoverhang.com/guidebook/` |
| S3 bucket | `altus-retreats-frontend-dev-817760095908` (same bucket as the property site — guidebook is just a subfolder, `/guidebook/`) |
| CloudFront distribution ID | `EP3TSR36W3F7N` (same as the property site) |
| Source folder | `C:\STRProjects\STRDirectBookingPlatform\frontend\property-site\guidebook\` |

The guidebook is plain HTML/CSS/JS — no build step needed.

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

**3. Fix content-types for the JS and CSS files** (S3 sometimes guesses these wrong, which can break styling or scripts in the browser):
```powershell
aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\css\guidebook.css s3://altus-retreats-frontend-dev-817760095908/guidebook/css/guidebook.css --content-type "text/css" --metadata-directive REPLACE --profile altus
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
