# Altus Retreats — Dev Quick Reference

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
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --profile altus
```

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

```powershell
cd C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
npm run build
aws s3 sync dist/ s3://altus-retreats-admin-dev-817760095908/ --delete --profile altus
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --profile altus
```

If JavaScript is served with the wrong MIME type, re-upload the exact generated `dist\assets\index-*.js` file with `--content-type "application/javascript" --metadata-directive REPLACE`.

See [DEPLOY-ADMIN.md](DEPLOY-ADMIN.md) for the complete procedure.

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

Google Places:

```powershell
aws secretsmanager update-secret --secret-id altus-retreats/dev/google --secret-string '{"placesApiKey":"YOUR_KEY"}' --profile altus
```

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

For visual frontend changes, also verify at approximately `390px` and `1280px`, check keyboard operation, and confirm no horizontal overflow.
