# Deploy the Property Site (Front End)

Step-by-step instructions to publish changes to the property site (`frontend/property-site/`) — no AI assistant required. Run everything in **PowerShell**, from anywhere (the commands below use full paths).

## What you're deploying

| Thing | Value |
|---|---|
| Live redesign URL | `https://www.staytheoverhang.com/preview.html` |
| Live public URL | `https://www.staytheoverhang.com/` (Coming Soon page — different source folder) |
| S3 bucket | `altus-retreats-frontend-dev-817760095908` |
| CloudFront distribution ID | `EP3TSR36W3F7N` |
| Source folder | `C:\STRProjects\STRDirectBookingPlatform\frontend\property-site\` |

**Important:** the bucket's `index.html` is the **Coming Soon page** (from a *different* folder, `frontend\overhang-coming-soon\`), not the redesign. The redesign lives at `preview.html`. A plain sync of `property-site\` will overwrite `index.html` with the redesign by mistake unless you also re-push the coming-soon page — step 2 below handles that.

## Prerequisites (one-time setup)

1. **AWS CLI installed** — check with `aws --version` in PowerShell. If not found, install from https://aws.amazon.com/cli/.
2. **AWS profile configured** — check with `aws configure list --profile altus`. If missing, run `aws configure --profile altus` and enter your AWS access key, secret key, and region `us-east-1`. (Ask whoever manages the AWS account for these keys if you don't have them.)

## Steps

**1. Open PowerShell and go to the project folder:**
```powershell
cd C:\STRProjects\STRDirectBookingPlatform
```

**2. Sync the property site files to S3, then re-pin the Coming Soon page as the public `index.html`:**
```powershell
aws s3 sync frontend\property-site\ s3://altus-retreats-frontend-dev-817760095908/ --delete --profile altus
aws s3 cp frontend\overhang-coming-soon\index.html s3://altus-retreats-frontend-dev-817760095908/index.html --content-type "text/html" --metadata-directive REPLACE --profile altus
```

**3. Clear CloudFront's cache so the changes show up immediately:**
```powershell
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --profile altus
```
This takes 1–3 minutes to finish. You can check progress with the `Id` value it prints:
```powershell
aws cloudfront get-invalidation --distribution-id EP3TSR36W3F7N --id <paste-the-Id-here> --profile altus --query 'Invalidation.Status' --output text
```
Wait until it says `Completed`.

**4. Check it live.** Open in your browser (use `www`, not the bare domain — see note below):
- Redesign: https://www.staytheoverhang.com/preview.html
- Coming Soon: https://www.staytheoverhang.com/

**Hard-refresh** (`Ctrl+Shift+R`) or open in an Incognito window — your browser may cache the old CSS/JS otherwise.

## Notes / gotchas

- **Use `www.staytheoverhang.com`, not the bare `staytheoverhang.com`.** The bare domain still points at a GoDaddy Website Builder page, unrelated to this deploy — that's a separate DNS fix, not a deploy issue.
- If you only changed **one file** (e.g. just `css/main.css`), you can skip the full sync and push just that file — faster:
  ```powershell
  aws s3 cp frontend\property-site\css\main.css s3://altus-retreats-frontend-dev-817760095908/css/main.css --content-type "text/css" --metadata-directive REPLACE --profile altus
  aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/css/main.css" --profile altus
  ```
  Same pattern works for `js/app.js` (use `--content-type "application/javascript"`) or `preview.html` (use `--content-type "text/html"`).
- **At launch** (when it's time to go public): rename `preview.html` to `index.html` and redeploy — that makes the redesign the real public site. All internal links (book.html, guidebook) already point to `index.html`, so nothing else needs to change.
