# Deploy the Admin Panel

Last reviewed: 2026-08-12. The property-site widget release did not change this admin deployment workflow.

Step-by-step instructions to publish changes to the admin SPA (`frontend/admin-spa/`) — no AI assistant required. Run everything in **PowerShell**.

## What you're deploying

| Thing | Value |
|---|---|
| Live URL | `https://admin.altusretreats.net` |
| S3 bucket | `altus-retreats-admin-dev-817760095908` |
| CloudFront distribution ID | `E6XS2Y3HPS1YG` |
| Source folder | `C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa\` |

This is a React + Vite app, so unlike the property site, it needs a **build step** before deploying.

## Fast path

```powershell
cd C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
npm run deploy
```

This runs `deploy.ps1`, which does steps 3–7 below (build, sync, JS content-type fix, CloudFront invalidation) in one go. Use the manual steps only if you need to debug a failure or don't have PowerShell.

## Prerequisites (one-time setup)

1. **AWS CLI installed and configured** — see [DEPLOY-FRONTEND.md](DEPLOY-FRONTEND.md) prerequisites (same setup, same `altus` profile).
2. **Node.js installed** — check with `node --version` (any recent LTS version works). Install from https://nodejs.org if missing.
3. **Dependencies installed** — one-time, from the admin-spa folder:
   ```powershell
   cd C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
   npm install
   ```

## Steps

**1. Go to the admin-spa folder:**
```powershell
cd C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
```

**2. Set the build environment variables (needed every time — these don't persist between PowerShell sessions):**
```powershell
$env:VITE_API_BASE="https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev"
$env:VITE_COGNITO_USER_POOL_ID="us-east-1_eMVB4AFGD"
$env:VITE_COGNITO_CLIENT_ID="3l3km5lsgnqcitv295ltb5bq86"
```

**3. Build it:**
```powershell
npm run build
```
This creates a `dist\` folder with the production build.

**4. Review the built filenames** (Vite adds random hashes and may create lazy-loaded chunks such as `guidebookPdf-XXXX.js`):
```powershell
Get-ChildItem dist\assets
```
All `.js` files in this folder are published in step 6.

**5. Sync the build to S3:**
```powershell
aws s3 sync dist/ s3://altus-retreats-admin-dev-817760095908/ --delete --profile altus
```

**6. Fix every JavaScript file's content type** (S3 sometimes guesses wrong, which breaks the app or a lazy-loaded feature in the browser):
```powershell
Get-ChildItem dist\assets\*.js | ForEach-Object {
  aws s3 cp $_.FullName "s3://altus-retreats-admin-dev-817760095908/assets/$($_.Name)" --content-type "application/javascript" --metadata-directive REPLACE --profile altus
}
```

**6b. Fix the self-hosted Material Symbols font's content type** (the same guessing problem affects `.woff2`; this asset is present since the 2026-08-14 Guidebook icon picker release):
```powershell
Get-ChildItem dist\assets\*.woff2 -ErrorAction SilentlyContinue | ForEach-Object {
  aws s3 cp $_.FullName "s3://altus-retreats-admin-dev-817760095908/assets/$($_.Name)" --content-type "font/woff2" --metadata-directive REPLACE --profile altus
}
```

**7. Clear CloudFront's cache:**
```powershell
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --profile altus
```
Wait 1–3 minutes, or check status with the `Id` it prints:
```powershell
aws cloudfront get-invalidation --distribution-id E6XS2Y3HPS1YG --id <paste-the-Id-here> --profile altus --query 'Invalidation.Status' --output text
```

**8. Check it live.** Open https://admin.altusretreats.net and **hard-refresh** (`Ctrl+Shift+R`) — log in and confirm the change you made is there.

## Notes / gotchas

- If the admin panel shows a blank white screen, or a feature such as PDF download fails with a module/MIME error, step 6 was likely skipped or mistyped. Every built JS chunk needs the correct `Content-Type` header.
- The Guidebook PDF is generated locally in the browser from saved sections marked **Available to AI agents**. It is not uploaded to S3 and requires no backend deployment. After an admin release touching this feature, download a PDF and confirm it contains selectable text and no `hostNotes` or non-AI sections.
- The environment variables in step 2 must be set **every new PowerShell window** — they don't save automatically. If `npm run build` fails or the deployed app can't reach the API, double check those three lines ran first.
- Full end-to-end, this is: `npm install` (once) → set env vars → `npm run build` → find hash → `s3 sync` → fix JS content-type → invalidate → hard-refresh and test.
