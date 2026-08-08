# Altus Retreats — Claude Code Instructions

## Project
Multi-property STR direct booking platform + digital guidebook for Altus Retreats LLC.
Hub domain: altusretreats.net

## You have full autonomy on this project
Run any bash command needed. Install packages. Deploy. Don't ask for permission on individual steps — complete the full task and report back when done.

## Stack
- **Runtime:** Node.js 20 (arm64 Lambda)
- **IaC:** AWS SAM (`infrastructure/template.yaml`)
- **Database:** DynamoDB single-table (`altus-retreats-{env}`) — see `docs/dynamo-table-design.md`
- **Auth:** AWS Cognito (admin only; guest endpoints are public)
- **Secrets:** AWS Secrets Manager — never hardcode keys
- **Payments:** Stripe (not Hospitable's built-in)
- **Calendar sync:** Write reservation block to Hospitable API on `payment_intent.succeeded`
- **Frontend:** Static S3 + CloudFront (no SSR)

## Multi-property — non-negotiable
Every function, query, and data record is scoped by `propertyId`. Never hardcode a property. Adding a new property is a data operation only.

## Project structure
```
infrastructure/   SAM template + supporting CFN resources
backend/
  functions/      One directory per Lambda handler
  layers/shared/  Shared utilities (DynamoDB client, Secrets Manager helper, Hospitable client)
frontend/
  property-site/  Per-property booking site (vanilla JS or lightweight framework)
  admin-spa/      Admin panel (React)
  hub-site/       altusretreats.net aggregate view
docs/             Architecture and design decisions
```

## Deploy commands
```bash
# Build
sam build --template infrastructure/template.yaml

# Deploy dev
sam deploy --config-env dev

# Deploy prod
sam deploy --config-env prod
```

## Environment config
Use `samconfig.toml` for per-environment deploy parameters. Never commit real secrets — they live in Secrets Manager.

## Secrets Manager convention
- Hospitable PAT: `altus-retreats/{env}/hospitable` → `{ "kentucky": "<PAT>", "florida": "<PAT>" }`
- Stripe: `altus-retreats/{env}/stripe` → `{ "secretKey": "sk_...", "webhookSecret": "whsec_..." }`

## DynamoDB conventions
- All money in **cents** (integers)
- `ttl` attribute on FAILED bookings and cache entries (Unix timestamp)
- Guidebook section SK order: zero-padded integers (`010`, `020`) for correct lexicographic sort

## Key pending items
- Hospitable PAT not yet provided — mock responses until available
- Logo/branding pending ~2026-08-09 — no visual polish until then
