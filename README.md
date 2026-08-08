# Altus Retreats — STR Direct Booking Platform

Multi-property direct booking site, digital guidebook, and admin system for Altus Retreats LLC.
Hub: **altusretreats.net**

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

```bash
# Build
sam build --template infrastructure/template.yaml

# Deploy dev
sam deploy --config-env dev

# Deploy prod
sam deploy --config-env prod

# Deploy admin SPA to S3
aws s3 sync frontend/admin-spa/dist s3://<AdminSPABucketName> --delete
aws cloudfront create-invalidation --distribution-id <AdminSPADistributionId> --paths "/*"

# Deploy property site to S3
aws s3 sync frontend/property-site s3://<FrontendBucketName>/kentucky --delete
aws cloudfront create-invalidation --distribution-id <PropertySiteDistributionId> --paths "/*"
```

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
