# Altus Retreats — Dev Quick Reference

Last reviewed: 2026-08-12 after the property-site widget and mobile navigation deployment.

Current dev environment commands for Windows PowerShell. Use AWS profile `altus` in `us-east-1`.

## Live resources

| Resource | Value |
|---|---|
| API | `https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev` |
| DynamoDB | `altus-retreats-dev` |
| Property site | `https://www.staytheoverhang.com/` |
| Guest guide | `https://www.staytheoverhang.com/guidebook/` |
| Admin | `https://admin.altusretreats.net/` |
| Hub | `https://www.altusretreats.net/` |
| Property bucket | `altus-retreats-frontend-dev-817760095908` |
| Property CloudFront | `EP3TSR36W3F7N` |
| Admin bucket | `altus-retreats-admin-dev-817760095908` |
| Admin CloudFront | `E6XS2Y3HPS1YG` |
| Hub bucket | `altus-retreats-hub-dev-817760095908` |
| Hub CloudFront | `E1X6NMJ8MCF7HR` |
| Media bucket | `altus-retreats-media-dev-817760095908` |

The bare root `staytheoverhang.com` still points to GoDaddy. Verify property-site deployments at the `www` URL.

## Backend

Build from the repository root, then deploy from `infrastructure/` so SAM loads `samconfig.toml`:

```powershell
cd C:\STRProjects\STRDirectBookingPlatform
& "C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd" build --template infrastructure/template.yaml
cd infrastructure
& "C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd" deploy --config-env dev --no-confirm-changeset
cd ..
```

## Property site

The redesigned property page is the live root. Do not re-pin the retired coming-soon page. Avoid `--delete` so the S3 rollback backup under `backups/` remains intact.

```powershell
cd C:\STRProjects\STRDirectBookingPlatform
aws s3 sync frontend\property-site\ s3://altus-retreats-frontend-dev-817760095908/ --profile altus
aws s3 cp frontend\property-site\shop-your-stay\js\shop.js s3://altus-retreats-frontend-dev-817760095908/shop-your-stay/js/shop.js --content-type "application/javascript" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\shop-your-stay\css\shop.css s3://altus-retreats-frontend-dev-817760095908/shop-your-stay/css/shop.css --content-type "text/css" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\index.html s3://altus-retreats-frontend-dev-817760095908/index.html --content-type "text/html; charset=utf-8" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\css\main.css s3://altus-retreats-frontend-dev-817760095908/css/main.css --content-type "text/css; charset=utf-8" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\js\app.js s3://altus-retreats-frontend-dev-817760095908/js/app.js --content-type "application/javascript; charset=utf-8" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --profile altus
```

When `main.css` or `app.js` changes, increment its query-string version in `index.html` before publishing.

See [DEPLOY-FRONTEND.md](DEPLOY-FRONTEND.md) for the complete procedure.

## Guest guide only

```powershell
cd C:\STRProjects\STRDirectBookingPlatform
aws s3 sync frontend\property-site\guidebook\ s3://altus-retreats-frontend-dev-817760095908/guidebook/ --delete --profile altus
aws s3 cp frontend\property-site\guidebook\index.html s3://altus-retreats-frontend-dev-817760095908/guidebook/index.html --content-type "text/html" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\css\guidebook.css s3://altus-retreats-frontend-dev-817760095908/guidebook/css/guidebook.css --content-type "text/css" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\guidebook\js\guidebook.js s3://altus-retreats-frontend-dev-817760095908/guidebook/js/guidebook.js --content-type "application/javascript" --cache-control "no-cache" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/guidebook/*" --profile altus
```

See [DEPLOY-GUIDEBOOK.md](DEPLOY-GUIDEBOOK.md) for privacy verification and additional notes.

## Admin SPA

Always use the deploy script — this machine's registry maps `.js` to `text/plain`, so a plain `aws s3 sync` uploads every JS asset with the wrong Content-Type and breaks the app (blank screen / MIME error in console). The script builds, syncs, force-fixes every `.js` asset's Content-Type, and invalidates CloudFront in one step:

```powershell
cd C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
npm run deploy
```

Never run `aws s3 sync dist/ ...` directly for the admin SPA without the content-type fix step that follows it.

See [DEPLOY-ADMIN.md](DEPLOY-ADMIN.md) for the complete manual procedure the script automates.

## Hub

```powershell
cd C:\STRProjects\STRDirectBookingPlatform
aws s3 sync frontend\hub-site\ s3://altus-retreats-hub-dev-817760095908/ --profile altus
aws cloudfront create-invalidation --distribution-id E1X6NMJ8MCF7HR --paths "/*" --profile altus
```

## Secrets

Hospitable PAT:

```powershell
aws secretsmanager update-secret --secret-id altus-retreats/dev/hospitable --secret-string '{"default":"YOUR_PAT","kentucky":"YOUR_PAT"}' --profile altus
```

Google APIs (preserve all three fields when rotating either key):

```powershell
$googleSecret = [ordered]@{
  placesApiKey      = 'YOUR_SERVER_KEY'
  mapsBrowserApiKey = 'YOUR_WEBSITE_RESTRICTED_KEY'
  mapsMapId          = 'YOUR_MAP_ID'
} | ConvertTo-Json -Compress
$secretFile = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($secretFile, $googleSecret, [System.Text.UTF8Encoding]::new($false))
  aws secretsmanager update-secret --secret-id altus-retreats/dev/google --secret-string "file://$secretFile" --profile altus
} finally {
  Remove-Item -LiteralPath $secretFile -Force -ErrorAction SilentlyContinue
}
```

Keep the `file://` form above on Windows. Passing `$googleSecret` directly to `--secret-string` can strip JSON quotation marks and leave the secret unreadable by the Lambda.

Hospitable is the merchant of record and handles checkout. There are no Stripe secrets.

## Seed and admin

The seed is structural only; Hospitable is the source of truth for listing content.

```powershell
cd C:\STRProjects\STRDirectBookingPlatform
node scripts\seed-kentucky.js --env dev
```

Create an admin user:

```powershell
aws cognito-idp admin-create-user --user-pool-id us-east-1_eMVB4AFGD --username your@email.com --temporary-password TempPass123! --profile altus
```

## Verification

```powershell
cd C:\STRProjects\STRDirectBookingPlatform
node scripts\smoke-test.js
```

For visual frontend changes, also verify at approximately `390px` and `1280px`, check keyboard operation, and confirm no horizontal overflow. For property-site releases, confirm mobile Book Now scrolls to the on-page widget.
