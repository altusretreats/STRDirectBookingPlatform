# Dev Environment — Quick Reference

## Smoke Tests (run after every deploy)
```powershell
cd C:\STRProjects\STRDirectBookingPlatform
node scripts/smoke-test.js        # dev
node scripts/smoke-test.js prod   # prod
```
Tests: all site URLs return 200, API returns property data, availability works, waitlist accepts email, no stale hello@ or old brand colors.

---

## AWS Resources (dev)

| Resource | Value |
|----------|-------|
| API URL | `https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev` |
| DynamoDB Table | `altus-retreats-dev` |
| Hub Bucket | `altus-retreats-hub-dev-817760095908` |
| Hub CloudFront | `E1X6NMJ8MCF7HR` → https://www.altusretreats.net |
| Property Bucket | `altus-retreats-frontend-dev-817760095908` |
| Property CloudFront | `EP3TSR36W3F7N` → https://www.staytheoverhang.com |
| Admin Bucket | `altus-retreats-admin-dev-817760095908` |
| Admin CloudFront | `E6XS2Y3HPS1YG` → https://admin.altusretreats.net |
| Media Bucket | `altus-retreats-media-dev-817760095908` |
| Cognito User Pool | `us-east-1_eMVB4AFGD` |
| Cognito Client ID | `3l3km5lsgnqcitv295ltb5bq86` |

---

## Deploy Commands

### Full deploy (backend + frontend)
```powershell
cd C:\STRProjects\STRDirectBookingPlatform
sam build --template infrastructure/template.yaml
cd infrastructure
sam deploy --config-env dev
```

### Sync property site to S3
```powershell
# Sync all property site files
aws s3 sync C:\STRProjects\STRDirectBookingPlatform\frontend\property-site s3://altus-retreats-frontend-dev-817760095908 --delete --region us-east-1

# Re-pin coming soon as the root (sync overwrites it with the booking site)
aws s3 cp C:\STRProjects\STRDirectBookingPlatform\frontend\overhang-coming-soon\index.html s3://altus-retreats-frontend-dev-817760095908/index.html --region us-east-1

# Keep a preview URL so you can bypass the coming soon
aws s3 cp C:\STRProjects\STRDirectBookingPlatform\frontend\property-site\index.html s3://altus-retreats-frontend-dev-817760095908/preview.html --region us-east-1

aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --region us-east-1
```

Preview URLs (bypass coming soon):
- Booking site: https://www.staytheoverhang.com/preview.html
- Guidebook:    https://www.staytheoverhang.com/guidebook/
- Hub full site: https://www.altusretreats.net/hub.html

### Build + deploy admin SPA
```powershell
cd C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
$env:VITE_API_BASE="https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev"
$env:VITE_COGNITO_USER_POOL_ID="us-east-1_eMVB4AFGD"
$env:VITE_COGNITO_CLIENT_ID="3l3km5lsgnqcitv295ltb5bq86"
npm run build
aws s3 sync dist s3://altus-retreats-admin-dev-817760095908 --delete --region us-east-1
aws s3 cp dist s3://altus-retreats-admin-dev-817760095908 --recursive --exclude "*.html" --exclude "*.css" --exclude "*.ico" --content-type "application/javascript" --metadata-directive REPLACE --region us-east-1
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --region us-east-1
```

### Invalidate CloudFront cache (after syncing)
```powershell
# Get distribution IDs
aws cloudformation describe-stack-resources --stack-name altus-retreats-dev --region us-east-1 --query "StackResources[?ResourceType=='AWS::CloudFront::Distribution'].[LogicalResourceId,PhysicalResourceId]" --output table
```

---

## Secrets

### Update Hospitable PAT (when you have it)
```powershell
aws secretsmanager update-secret --secret-id altus-retreats/dev/hospitable --secret-string '{"default":"YOUR_PAT_HERE"}' --region us-east-1
```

### Update Stripe keys
```powershell
aws secretsmanager update-secret --secret-id altus-retreats/dev/stripe --secret-string '{"secretKey":"sk_test_...","webhookSecret":"whsec_..."}' --region us-east-1
```

---

## Seed / Admin

### Re-run Kentucky seed
```powershell
cd C:\STRProjects\STRDirectBookingPlatform
node scripts/seed-kentucky.js --env dev
```

### Create admin Cognito user
```powershell
aws cognito-idp admin-create-user --user-pool-id <UserPoolId> --username your@email.com --temporary-password TempPass123! --region us-east-1
```
