# Deploy the Property Site (Front End)

Last verified: 2026-08-13, including the branded attraction map and compact property marker.

The redesign is currently served from the root:

- Live URL: `https://www.staytheoverhang.com/`
- S3 bucket: `altus-retreats-frontend-dev-817760095908`
- CloudFront distribution: `EP3TSR36W3F7N`
- Source: `C:\STRProjects\STRDirectBookingPlatform\frontend\property-site\`

The bare `staytheoverhang.com` domain still points to GoDaddy. Always verify with `www`.

## Publish the full property site

Run from the repository root:

```powershell
$googleSecret = aws secretsmanager get-secret-value --secret-id altus-retreats/dev/google --query SecretString --output text --profile altus | ConvertFrom-Json
@"
window.ALTUS_MAPS_CONFIG = Object.freeze({
  apiKey: '$($googleSecret.mapsBrowserApiKey)',
  mapId: '$($googleSecret.mapsMapId)',
  markerLogoUrl: '/img/logo-the-overhang-map-icon.png',
});
"@ | Set-Content -Encoding utf8 frontend\property-site\js\maps-config.js
aws s3 sync frontend\property-site\ s3://altus-retreats-frontend-dev-817760095908/ --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --profile altus
```

Do not add `--delete`; the bucket contains a rollback backup under `backups/`.
`js/maps-config.js` is intentionally gitignored. The deployed browser key is publicly visible by design, so keep its Google Cloud website-referrer and Maps JavaScript API restrictions in place.

## Publish only the redesigned root and its shared assets

Use this for focused styling releases:

```powershell
aws s3 cp frontend\property-site\index.html s3://altus-retreats-frontend-dev-817760095908/index.html --content-type "text/html" --cache-control "no-cache, max-age=0, must-revalidate" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\css\main.css s3://altus-retreats-frontend-dev-817760095908/css/main.css --content-type "text/css" --cache-control "no-cache, max-age=0, must-revalidate" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\js\app.js s3://altus-retreats-frontend-dev-817760095908/js/app.js --content-type "application/javascript" --cache-control "no-cache, max-age=0, must-revalidate" --metadata-directive REPLACE --profile altus
aws s3 cp frontend\property-site\js\maps-config.js s3://altus-retreats-frontend-dev-817760095908/js/maps-config.js --content-type "application/javascript" --cache-control "no-cache, max-age=0, must-revalidate" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/" "/index.html" "/css/main.css" "/js/app.js" "/js/maps-config.js" --profile altus
```

Wait for the invalidation to complete, then hard-refresh `https://www.staytheoverhang.com/`.

`index.html` references `css/main.css` and `js/app.js` with version query strings. Increment both relevant version values when those assets change so returning visitors do not retain stale CSS or JavaScript after a release.

## Widget and mobile release check

After publishing a property-page change, verify at approximately `390px` wide:

- Book Now stays on `index.html` and scrolls to the embedded Hospitable widget.
- The widget lands below the sticky header and the full booking panel is visible.
- `#booking-iframe` is 320px wide when space permits and centered within its wrapper.
- The wrapper has no drop shadow and no iframe-edge artifacts appear at the bottom corners.
- The same Book Now action still scrolls to the widget on desktop.

## Roll back to Coming Soon

The source remains at `frontend\overhang-coming-soon\index.html`. The exact root page replaced on 2026-08-11 is also stored at:

`s3://altus-retreats-frontend-dev-817760095908/backups/index-coming-soon-before-redesign-2026-08-11.html`

Restore the source version with:

```powershell
aws s3 cp frontend\overhang-coming-soon\index.html s3://altus-retreats-frontend-dev-817760095908/index.html --content-type "text/html" --metadata-directive REPLACE --profile altus
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/" "/index.html" --profile altus
```

## Search visibility

The deployed redesign currently includes `noindex,nofollow` while live widget testing is underway. Remove that meta tag only when the public launch is intentional.
