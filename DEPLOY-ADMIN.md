# Deploy the Admin Panel

Step-by-step instructions to publish changes to the admin SPA (`frontend/admin-spa/`) — no AI assistant required. Run everything in **PowerShell**.

## What you're deploying

| Thing | Value |
|---|---|
| Live URL | `https://admin.altusretreats.net` |
| S3 bucket | `altus-retreats-admin-dev-817760095908` |
| CloudFront distribution ID | `E6XS2Y3HPS1YG` |
| Source folder | `C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa\` |

This is a React + Vite app, so unlike the property site, it needs a **build step** before deploying.

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

**4. Find the exact built filenames** (Vite adds a random hash to each build, e.g. `index-a1b2c3d4.js`):
```powershell
Get-ChildItem dist\assets
```
Note the `.js` filename you see — you'll need it in step 6.

**5. Sync the build to S3:**
```powershell
aws s3 sync dist/ s3://altus-retreats-admin-dev-817760095908/ --delete --profile altus
```

**6. Fix the JS file's content-type** (S3 sometimes guesses wrong, which breaks the app in the browser). Replace `index-XXXX.js` below with the exact filename from step 4:
```powershell
aws s3 cp dist\assets\index-XXXX.js s3://altus-retreats-admin-dev-817760095908/assets/index-XXXX.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
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

- If the admin panel shows a blank white screen or console errors about MIME types after deploying, you likely skipped (or mistyped) step 6 — the JS file needs the correct `Content-Type` header or the browser refuses to run it.
- The environment variables in step 2 must be set **every new PowerShell window** — they don't save automatically. If `npm run build` fails or the deployed app can't reach the API, double check those three lines ran first.
- Full end-to-end, this is: `npm install` (once) → set env vars → `npm run build` → find hash → `s3 sync` → fix JS content-type → invalidate → hard-refresh and test.
