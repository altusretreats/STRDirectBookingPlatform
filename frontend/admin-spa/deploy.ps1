# Deploy the admin SPA: build, sync to S3, fix JS content-types, invalidate CloudFront.
# This machine's registry maps .js -> text/plain, so `aws s3 sync` always guesses the
# wrong Content-Type for module scripts unless it's corrected explicitly every deploy.
# See DEPLOY-ADMIN.md for the full manual procedure this script automates.

$ErrorActionPreference = "Stop"

$Bucket = "altus-retreats-admin-dev-817760095908"
$DistributionId = "E6XS2Y3HPS1YG"
$Profile = "altus"

Write-Host "Building admin SPA..."
npm run build

Write-Host "Syncing dist/ to s3://$Bucket ..."
aws s3 sync dist/ "s3://$Bucket/" --delete --profile $Profile

Write-Host "Fixing Content-Type on JS assets..."
Get-ChildItem dist\assets\*.js | ForEach-Object {
  aws s3 cp $_.FullName "s3://$Bucket/assets/$($_.Name)" `
    --content-type "application/javascript" `
    --metadata-directive REPLACE `
    --profile $Profile
}

Write-Host "Fixing Content-Type on font assets..."
Get-ChildItem dist\assets\*.woff2 -ErrorAction SilentlyContinue | ForEach-Object {
  aws s3 cp $_.FullName "s3://$Bucket/assets/$($_.Name)" `
    --content-type "font/woff2" `
    --metadata-directive REPLACE `
    --profile $Profile
}

Write-Host "Invalidating CloudFront ($DistributionId)..."
aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" --profile $Profile

Write-Host ""
Write-Host "Done. Hard-refresh https://admin.altusretreats.net (Ctrl+Shift+R) and verify."
