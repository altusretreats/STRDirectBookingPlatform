# Altus Retreats — STR Direct Booking Platform

Multi-property direct booking site, digital guidebook, and admin system for Altus Retreats LLC.
Hub: **altusretreats.net**

---

## Live URLs & AWS Resources (dev)

| Site | URL | CloudFront ID | S3 Bucket |
|------|-----|---------------|-----------|
| Hub (coming soon) | https://www.altusretreats.net | `E1X6NMJ8MCF7HR` | `altus-retreats-hub-dev-817760095908` |
| Hub (full future site preview) | https://www.altusretreats.net/hub.html | `E1X6NMJ8MCF7HR` | same bucket |
| The Overhang (coming soon) | https://www.staytheoverhang.com | `EP3TSR36W3F7N` | `altus-retreats-frontend-dev-817760095908` |
| The Overhang — Booking site preview | https://www.staytheoverhang.com/preview.html | `EP3TSR36W3F7N` | same bucket |
| The Overhang — Guidebook | https://www.staytheoverhang.com/guidebook/ | `EP3TSR36W3F7N` | same bucket |
| Admin panel | https://admin.altusretreats.net | `E6XS2Y3HPS1YG` | `altus-retreats-admin-dev-817760095908` |
| API | https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev | — | — |

| Resource | Value |
|----------|-------|
| DynamoDB table | `altus-retreats-dev` |
| Cognito User Pool | `us-east-1_eMVB4AFGD` |
| Cognito Client ID | `3l3km5lsgnqcitv295ltb5bq86` |
| SES verified address | `support@altusretreats.net` |
| AWS Account | `817760095908` |
| Region | `us-east-1` |

### ACM Certificates
| Domain | ARN |
|--------|-----|
| altusretreats.net | `arn:aws:acm:us-east-1:817760095908:certificate/8706f7a7-0149-4b42-b9ed-cdc8c7644573` |
| staytheoverhang.com | `arn:aws:acm:us-east-1:817760095908:certificate/f5ddb05c-69c5-43cc-95af-9445a788ac22` |
| admin.altusretreats.net | `arn:aws:acm:us-east-1:817760095908:certificate/11d974d7-4aa6-42d7-bcf0-4a9ae09bfd08` |

### Domains (GoDaddy)
- `altusretreats.net` — hub + admin subdomain
- `staytheoverhang.com` — The Overhang property site
- `staythelazypalm.com` — The Lazy Palm (registered, no infrastructure yet)

---

## Project structure

```
infrastructure/        AWS SAM template + samconfig
backend/
  functions/           Lambda handlers (one dir each)
  layers/shared/       Shared utilities (DynamoDB, Secrets, Hospitable, logging)
frontend/
  property-site/       Vanilla JS booking site (per-property)
  admin-spa/           React admin panel (Vite)
  hub-site/            altusretreats.net aggregate view (coming soon)
docs/                  Architecture decisions
scripts/               Seed data + deploy helpers
```

---

## Prerequisites

Install these once on your machine:

| Tool | Install |
|------|---------|
| Node.js 20 | https://nodejs.org |
| AWS CLI v2 | https://aws.amazon.com/cli/ |
| AWS SAM CLI | https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html |
| Docker (for SAM local) | https://www.docker.com/products/docker-desktop |

---

## AWS Setup (first time only)

You'll need to do these steps once before the first deploy. Claude Code can handle
everything after this — just run `sam deploy`.

### 1. Create an AWS account
If you don't have one: https://aws.amazon.com/free/

### 2. Create an IAM user for deployments

In the AWS Console → IAM → Users → Create user:
- Name: `altus-retreats-deploy`
- Attach policies: `AdministratorAccess` (you can tighten this later)
- Create access key → **save the Access Key ID and Secret**

### 3. Configure AWS CLI

```bash
aws configure
# AWS Access Key ID:     <paste from step 2>
# AWS Secret Access Key: <paste from step 2>
# Default region:        us-east-1
# Default output:        json
```

Verify it works:
```bash
aws sts get-caller-identity
```

### 4. Register your domain (Route 53)

In AWS Console → Route 53 → Registered domains → Register domain.
Register `altusretreats.net` (and any property domains you want).

Once registered, Route 53 automatically creates a Hosted Zone.
Note the **Hosted Zone ID** — you'll need it when adding DNS records.

### 5. Request ACM certificate

AWS Console → Certificate Manager (make sure you're in **us-east-1**) → Request certificate:
- Domain names:
  - `altusretreats.net`
  - `*.altusretreats.net` (wildcard covers admin, hub, future properties)
  - *(Optional)* any standalone property domains
- Validation: DNS
- Click the certificate → "Create records in Route 53" button → confirm

Wait ~5 minutes for status to show **Issued**.

Copy the Certificate ARN — looks like: `arn:aws:acm:us-east-1:123456789:certificate/abc-def...`

### 6. First deploy

```bash
cd infrastructure

# Dev
sam build --template template.yaml
sam deploy --config-env dev

# When prompted for parameters, enter:
#   Environment:   dev
#   DomainName:    altusretreats.net
```

SAM will output:
- `ApiUrl` — your API Gateway endpoint
- `UserPoolId` and `UserPoolClientId` — needed for admin login
- `PropertySiteUrl` — CloudFront URL (before custom domain)
- `AdminSPAUrl` — CloudFront URL for admin panel

### 7. Update secrets

After deploy, put real values in Secrets Manager:

```bash
# Stripe (get keys from dashboard.stripe.com)
aws secretsmanager update-secret \
  --secret-id altus-retreats/dev/stripe \
  --secret-string '{"secretKey":"sk_test_...","webhookSecret":"whsec_..."}'

# Hospitable PAT (once you generate it at hospitable.com)
aws secretsmanager update-secret \
  --secret-id altus-retreats/dev/hospitable \
  --secret-string '{"kentucky":"<your-PAT>"}'
```

### 8. Create admin user

```bash
# Replace with your email
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId from deploy output> \
  --username "your@email.com" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username "your@email.com" \
  --password "YourSecurePass123!" \
  --permanent
```

### 9. Seed Kentucky property data

```bash
cd scripts
node seed-kentucky.js --env dev
```

### 10. Wire up custom domain (after cert is issued)

Uncomment the `Aliases` and `ViewerCertificate` blocks in `infrastructure/template.yaml`,
fill in the cert ARN, then:

```bash
sam deploy --config-env dev
```

Then add a Route 53 CNAME:
- Name: `kentucky.altusretreats.net`
- Value: the CloudFront distribution domain from the deploy output

---

## Local development

### Backend (SAM local)

```bash
# Start local API (requires Docker)
cd infrastructure
sam build --template template.yaml
sam local start-api --env-vars ../backend/env.local.json --port 3001
```

Create `backend/env.local.json`:
```json
{
  "Parameters": {
    "TABLE_NAME": "altus-retreats-dev",
    "ENVIRONMENT": "local"
  }
}
```

The Hospitable client **automatically uses mock data** when no real PAT is configured,
so you can develop the full booking flow locally without any external API credentials.

### Frontend (property site)

```bash
# Just open index.html in a browser, or use any static server:
cd frontend/property-site
npx serve .
# Visit http://localhost:3000
```

Update `js/config.js` to point at your local SAM API:
```js
apiBase: 'http://localhost:3001'
```

### Admin SPA

```bash
cd frontend/admin-spa
npm install
cp .env.example .env.local
# Fill in .env.local with your dev Cognito pool IDs + API URL
npm run dev
# Visit http://localhost:3000
```

---

## Deploy commands

```powershell
# 1 — Backend (run first)
sam build --template infrastructure/template.yaml
cd infrastructure
sam deploy --config-env dev
cd ..

# 2 — Admin SPA
cd frontend\admin-spa
$env:VITE_API_BASE="https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev"
$env:VITE_COGNITO_USER_POOL_ID="us-east-1_eMVB4AFGD"
$env:VITE_COGNITO_CLIENT_ID="3l3km5lsgnqcitv295ltb5bq86"
npm run build
aws s3 sync dist s3://altus-retreats-admin-dev-817760095908 --delete --region us-east-1
aws s3 cp dist s3://altus-retreats-admin-dev-817760095908 --recursive --exclude "*.html" --exclude "*.css" --exclude "*.ico" --content-type "application/javascript" --metadata-directive REPLACE --region us-east-1
aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --region us-east-1
cd ..\..

# 3 — Property site + hub (re-pin coming soon + upload preview)
aws s3 sync frontend\property-site s3://altus-retreats-frontend-dev-817760095908 --delete --region us-east-1
aws s3 cp frontend\overhang-coming-soon\index.html s3://altus-retreats-frontend-dev-817760095908/index.html --region us-east-1
aws s3 cp frontend\property-site\index.html s3://altus-retreats-frontend-dev-817760095908/preview.html --region us-east-1
aws cloudfront create-invalidation --distribution-id EP3TSR36W3F7N --paths "/*" --region us-east-1
aws s3 sync frontend\hub-site s3://altus-retreats-hub-dev-817760095908 --delete --region us-east-1
aws cloudfront create-invalidation --distribution-id E1X6NMJ8MCF7HR --paths "/*" --region us-east-1

# 4 — Smoke test (after CloudFront propagates ~2 min)
node scripts/smoke-test.js
```

All three deploy steps can run in parallel in separate PowerShell windows.

---

## Stripe webhook setup

After first deploy, register the webhook endpoint in Stripe Dashboard:

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `<ApiUrl>/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`)
5. Update Secrets Manager:
   ```bash
   aws secretsmanager update-secret \
     --secret-id altus-retreats/dev/stripe \
     --secret-string '{"secretKey":"sk_test_...","webhookSecret":"whsec_<signing-secret>"}'
   ```

---

## Adding a second property (future)

1. Add a property record to DynamoDB (or use the admin panel)
2. Update `altus-retreats/{env}/hospitable` secret with the new property's PAT
3. Deploy a second CloudFront distribution with the property's domain
4. Run seed data for the new property's guidebook

No code changes needed. The architecture is multi-property from day one.

---

## Key pending items

- [ ] Hospitable PAT — generate at hospitable.com, add to Secrets Manager
- [ ] Logo/branding — expected ~2026-08-09
- [ ] Property domain — register + configure Route 53 + ACM
- [ ] Real Stripe keys — switch from test to live when ready to accept payments
- [ ] Guidebook content — fill in REPLACE_ME values via admin panel

---

## Email setup (SES)

Guest emails (booking confirmation + pre-arrival) use Amazon SES. Before emails will send:

### 1. Verify your sending domain (prod) or email address (dev)

**Dev/staging — verify a single address for testing:**
```bash
aws ses verify-email-identity --email-address support@altusretreats.net
```
Check your inbox and click the verification link.

**Prod — verify the full domain (recommended):**
```bash
aws ses verify-domain-identity --domain altusretreats.net
```
AWS gives you DKIM + verification TXT/CNAME records to add in Route 53.

### 2. Request SES production access (prod only)

New AWS accounts start in SES sandbox (can only send to verified addresses). Submit a production access request in the AWS console:
- **Service Quota** → `ses` → "Sending in Production"
- Describe your use case: transactional booking confirmations for short-term rental guests

Approval typically takes 24–48 hours.

### 3. Deploy

Email Lambdas are deployed automatically with `sam deploy`. No extra steps needed.

### 4. Test

Book a reservation using Stripe's test card `4242 4242 4242 4242`. The confirmation email fires automatically after payment. Pre-arrival emails are scheduled for 48hrs before check-in.

---

## CI/CD (GitHub Actions)

The `.github/workflows/ci.yml` pipeline runs automatically:

| Trigger | Jobs |
|---------|------|
| Push to `main` | Tests → SAM build → Deploy to dev |
| Tag `v*` (e.g., `v1.0.0`) | Tests → SAM build → Deploy to prod (requires manual approval) |
| Pull request | Tests + SAM build only (no deploy) |

### Required GitHub secrets

**Dev secrets** (in the `dev` environment):
| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user key with deploy permissions |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret |

**Prod secrets** (in the `prod` environment):
| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID_PROD` | Separate prod IAM user |
| `AWS_SECRET_ACCESS_KEY_PROD` | Corresponding secret |

Add secrets in: GitHub repo → Settings → Secrets and variables → Actions

### Deploy to prod

```bash
git tag v1.0.0 && git push origin v1.0.0
```

GitHub will run tests + build, then pause for manual approval (configure required reviewers in Settings → Environments → prod).

---

## Deploy scripts

```bash
# Backend + frontends in one shot
./scripts/deploy.sh dev
./scripts/deploy.sh prod

# Frontends only (faster for UI-only changes)
./scripts/deploy-frontend.sh dev
```
