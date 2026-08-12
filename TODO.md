# Altus Retreats — TODO

Shared running list. Add items with priority (🔴 critical / 🟡 soon / 🟢 nice-to-have) and mark done with ✅.

---

## 🔴 Critical / Blocking

- [ ] **Root domain redirect (altusretreats.net)** — bare domain → GoDaddy Domain Forwarding → https://www.altusretreats.net (301)
  - GoDaddy → Domains → altusretreats.net → scroll to Forwarding → Add Forward
- [ ] **Root domain redirect (staytheoverhang.com)** — bare domain → GoDaddy Domain Forwarding → https://www.staytheoverhang.com (301)
  - GoDaddy → Domains → staytheoverhang.com → scroll to Forwarding → Add Forward

---

## 🟡 Soon

- [x] **Enter Hospitable property UUID** — done ✅
- [x] **Rebuild + redeploy admin SPA** — done ✅
  ```powershell
  cd frontend/admin-spa
  $env:VITE_API_BASE="https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev"
  $env:VITE_COGNITO_USER_POOL_ID="us-east-1_eMVB4AFGD"
  $env:VITE_COGNITO_CLIENT_ID="3l3km5lsgnqcitv295ltb5bq86"
  npm run build
  aws s3 sync dist s3://altus-retreats-admin-dev-817760095908 --delete --region us-east-1
  aws cloudfront create-invalidation --distribution-id E6XS2Y3HPS1YG --paths "/*" --region us-east-1
  ```
- [ ] **Re-seed Kentucky property** — updates DynamoDB with latest pricing/name/domain
  ```
  node scripts/seed-kentucky.js --env dev
  ```
- [x] **Fix guidebook AccessDenied** — guidebook is live through CloudFront at `/guidebook/` ✅
- [x] **Redesign responsive guidebook** — rich desktop overview, intent-first mobile home, focused journey screens, unified outline icons ✅
- [ ] **Mobile audit — all sites** — test at 375px width; check property site, guidebook, hub site, coming soon pages
- [ ] **Booking flow end-to-end test** — test the Hospitable Direct widget and confirmation flow
- [ ] **Verify PropertySettings save** — make sure `PUT /properties/{propertyId}` Lambda is deployed and wired in SAM template

---

## 🟢 Nice-to-Have / Future

- [ ] **Logo** — final brand logo pending ~Aug 9; replace placeholder on all sites once delivered
- [ ] **hub.html → index.html swap** — when The Lazy Palm launches, replace hub coming soon with full hub site
- [x] **www.staytheoverhang.com** — redesigned property site is live at the CloudFront-backed `www` domain ✅
- [ ] **The Lazy Palm** — set up DynamoDB property record + S3/CloudFront for staythelazypalm.com
- [ ] **Guidebook content** — add actual house manual sections for The Overhang via admin → Guidebook Editor
- [ ] **Guest confirmation email** — verify template renders correctly for a real booking
- [ ] **Pre-arrival email** — verify EventBridge Scheduler fires correctly 48h before check-in
- [ ] **AI guidebook context feed** — create a separate agent-readable endpoint/page containing guest content plus explicitly included `aiContext`; exclude `hostNotes` and add an AI-specific inclusion control in admin
- [ ] **Booking calendar** — test blocked-date display once real Hospitable listing ID is connected
- [ ] **SEO** — add og:image, structured data, sitemap.xml for staytheoverhang.com once it goes live
- [ ] **Analytics** — add simple event tracking (page views, waitlist signups, booking starts, booking completions)
- [ ] **Admin bookings view** — see all confirmed bookings, guest names, dates in the admin panel
- [ ] **Prod environment** — deploy to prod once dev is stable and fully tested

---

## Deploy Quick Reference

Use [DEV-COMMANDS.md](DEV-COMMANDS.md) for the current quick reference. Complete procedures are in [DEPLOY-FRONTEND.md](DEPLOY-FRONTEND.md), [DEPLOY-GUIDEBOOK.md](DEPLOY-GUIDEBOOK.md), and [DEPLOY-ADMIN.md](DEPLOY-ADMIN.md).
