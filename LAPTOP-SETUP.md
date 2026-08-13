# Altus Retreats — Laptop Development Setup

Use this checklist to make a Windows laptop capable of safely developing, testing, and deploying the Altus Retreats platform. It is written so Codex can work through it with David from this task. Do not paste credentials, secret values, recovery codes, or private keys into this file, Git, or chat.

## Definition of done

The laptop is ready when all of the following are true:

- Codex/ChatGPT is signed into the same OpenAI account and this task is visible.
- The repository is cloned, on the intended branch, clean, and current with GitHub.
- Git, Node.js 22, npm, AWS CLI v2, and AWS SAM CLI work in PowerShell.
- The AWS profile `altus` resolves to account `817760095908` in `us-east-1`.
- Root, backend, and admin dependencies install reproducibly with `npm ci`.
- Backend tests, the admin production build, SAM build, and the smoke test pass.
- The ignored property-map browser configuration can be regenerated from Secrets Manager.
- A small branch can be created and committed locally. Do not perform a production or dev deployment merely to prove the laptop works.

## Phase 0 — Before leaving the desktop

These steps prevent machine-local work from being stranded on the desktop.

- [ ] In every active repository, inspect `git status`, including untracked files.
- [ ] Decide which local changes are real work, temporary output, or secrets. Never commit a secret just to move it to the laptop.
- [ ] Commit all work that should travel, then push every needed branch to GitHub.
- [ ] Confirm `git status --short` is empty or document every intentionally local file.
- [ ] Confirm this laptop-setup commit is pushed to `origin/main`.
- [ ] Confirm the GitHub account can sign in with its second factor and that recovery access is available while traveling.
- [ ] Confirm the OpenAI account used by this desktop can sign in on the laptop and that this task appears there.
- [ ] Make sure the AWS deployment identity is accessible. Prefer configuring the laptop from the credential source or IAM console; do not email or message a plaintext AWS secret to yourself.
- [ ] Record any intentionally machine-local tools or browser bookmarks that are useful, but do not copy `node_modules`, `.aws-sam`, or build output.

## Phase 1 — Install and sign in

Use official installers and allow each installer to add its command-line tools to `PATH` where offered.

- [ ] Install all Windows updates and reboot.
- [ ] Install Git for Windows. Git Credential Manager is the preferred HTTPS authentication path.
- [ ] Install Node.js **22.x LTS** (not an arbitrary newer major) and its bundled npm.
- [ ] Install AWS CLI v2.
- [ ] Install AWS SAM CLI. If `sam` is not added to `PATH`, this project supports `C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd`.
- [ ] Install Docker Desktop if local Lambda/container testing will be needed. Docker is useful but not required for ordinary static frontend work.
- [ ] Install a code editor if desired (VS Code is sufficient).
- [ ] Install the current ChatGPT/Codex desktop app from the official OpenAI download entry point at <https://developers.openai.com/> and sign into the same OpenAI account used on the desktop.
- [ ] Open this task in the app. Tell Codex: **“Continue the laptop setup in `LAPTOP-SETUP.md`; inspect first, check off only verified items, and do not deploy just to test setup.”**

Verify the command-line installations in a new PowerShell window:

```powershell
git --version
node --version
npm --version
aws --version
sam --version
docker --version
```

Expected: Node reports `v22.x`. Docker may be skipped if it was intentionally not installed.

## Phase 2 — Configure Git and clone

Set the real name and GitHub email that should appear on commits:

```powershell
git config --global user.name "David"
git config --global user.email "YOUR_GITHUB_EMAIL"
git config --global init.defaultBranch main
```

Choose a normal development directory. The old desktop path is not required; examples below use `C:\STRProjects` for consistency.

```powershell
New-Item -ItemType Directory -Force C:\STRProjects
Set-Location C:\STRProjects
git clone https://altusretreats@github.com/altusretreats/STRDirectBookingPlatform.git
Set-Location C:\STRProjects\STRDirectBookingPlatform
git status
git branch --show-current
git remote -v
git log -1 --oneline
```

Complete browser/device authentication if Git Credential Manager requests it. Expected branch: `main`. Expected remote repository: `altusretreats/STRDirectBookingPlatform`.

If Git reports **detected dubious ownership**, first verify that the resolved path really is this clone and is owned by the expected Windows user. Then run:

```powershell
git config --global --add safe.directory C:/STRProjects/STRDirectBookingPlatform
```

Do not add a broad parent directory or wildcard as safe.

## Phase 3 — Configure AWS securely

The project uses the named profile `altus`; do not rely on the unnamed `default` profile.

If an IAM access key is the current approved authentication method:

```powershell
aws configure --profile altus
```

Enter the credential only at the local AWS prompt. Set:

- Default region: `us-east-1`
- Default output: `json`

If the existing credential is unavailable, create or rotate it through the authorized AWS IAM workflow. Do not retrieve secrets from Git files, task messages, shell history, screenshots, or another insecure copy.

Verify identity before running any command that changes AWS:

```powershell
aws sts get-caller-identity --profile altus
aws configure get region --profile altus
aws cloudformation describe-stacks --stack-name altus-retreats-dev --region us-east-1 --profile altus --query "Stacks[0].StackStatus" --output text
aws secretsmanager describe-secret --secret-id altus-retreats/dev/google --region us-east-1 --profile altus --query "Name" --output text
```

Expected AWS account: `817760095908`; expected region: `us-east-1`. Stop before any deployment if the account differs.

## Phase 4 — Install project dependencies

Use `npm ci` because lockfiles are committed. Do not copy `node_modules` from the desktop.

```powershell
Set-Location C:\STRProjects\STRDirectBookingPlatform
npm ci

Set-Location C:\STRProjects\STRDirectBookingPlatform\backend
npm ci

Set-Location C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
npm ci
```

Individual Lambda and shared-layer dependencies are resolved by SAM during `sam build`; do not manually rewrite their lockfiles as a setup step.

## Phase 5 — Restore machine-local configuration

Most runtime configuration is committed or stored in AWS. The important ignored local file is:

`frontend/property-site/js/maps-config.js`

Regenerate it from Secrets Manager; never hand-copy the secret object into Git. From the repository root:

```powershell
$googleSecret = aws secretsmanager get-secret-value --secret-id altus-retreats/dev/google --query SecretString --output text --profile altus | ConvertFrom-Json
@"
window.ALTUS_MAPS_CONFIG = Object.freeze({
  apiKey: '$($googleSecret.mapsBrowserApiKey)',
  mapId: '$($googleSecret.mapsMapId)',
  markerLogoUrl: '/img/logo-the-overhang-map-icon.png',
});
"@ | Set-Content -Encoding utf8 frontend\property-site\js\maps-config.js
```

Then verify it exists and remains ignored:

```powershell
Test-Path frontend\property-site\js\maps-config.js
git check-ignore frontend\property-site\js\maps-config.js
git status --short
```

The admin SPA's deployed Cognito/API identifiers are public client configuration and are already committed in `frontend/admin-spa/.env`. Use `.env.local` only for a deliberate machine-specific override; it is ignored by Git.

## Phase 6 — Verify without deploying

Run these from a clean clone before making code changes:

```powershell
Set-Location C:\STRProjects\STRDirectBookingPlatform\backend
npm test

Set-Location C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
npm run build

Set-Location C:\STRProjects\STRDirectBookingPlatform
sam build --template infrastructure/template.yaml
node scripts\smoke-test.js
```

If `sam` is not on `PATH`, use:

```powershell
& "C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd" build --template infrastructure/template.yaml
```

The smoke test reads live public endpoints. It should not mutate or deploy infrastructure.

Optional local admin UI check:

```powershell
Set-Location C:\STRProjects\STRDirectBookingPlatform\frontend\admin-spa
npm run dev
```

Open the localhost URL printed by Vite, then stop the server with `Ctrl+C`. Admin authentication uses the existing Cognito user; do not create a duplicate admin user just for laptop setup.

## Phase 7 — Prove the local Git workflow

Do not test by committing directly on `main`.

```powershell
Set-Location C:\STRProjects\STRDirectBookingPlatform
git switch -c codex/laptop-setup-check
git status
git commit --allow-empty -m "chore: verify laptop Git workflow"
git switch main
git branch -d codex/laptop-setup-check
git status --short
```

The empty commit tests local author configuration and commit creation without changing a project file; deleting its temporary branch removes it from normal history. No remote branch or deployment is required for this check. The final status should be clean except for explicitly documented ignored/local files.

## Phase 8 — Final handoff to Codex

Ask Codex on the laptop to report a compact readiness table containing:

- Git branch, remote, and clean/dirty state
- Node/npm/AWS/SAM versions
- AWS account and region (never credential values)
- Dependency-install result
- Backend test result
- Admin build result
- SAM build result
- Smoke-test result
- Whether `maps-config.js` exists and is ignored
- Any item intentionally skipped, especially Docker

Only after that report passes should normal development resume. Before every future AWS change, follow `DEV-COMMANDS.md` and the relevant `DEPLOY-*.md` guide. In particular, run `sam deploy --config-env dev` from `infrastructure\`, verify property-site changes at `www.staytheoverhang.com`, and never expose Secrets Manager values in logs or chat.

## Troubleshooting quick reference

- **`git` cannot authenticate:** use Git Credential Manager/browser sign-in for the GitHub account with access to `altusretreats/STRDirectBookingPlatform`; do not embed a token in the remote URL.
- **Wrong Git author:** fix `user.name` and `user.email` before committing.
- **Wrong Node major:** install/select Node 22, reopen PowerShell, and rerun `node --version` before `npm ci`.
- **`sam` not found:** call `C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd` directly.
- **AWS access denied:** first confirm `aws sts get-caller-identity --profile altus`; do not work around a wrong account/profile by removing `--profile altus`.
- **Admin build lacks local values:** compare the tracked `.env` with `.env.example`; do not invent Cognito identifiers.
- **Map falls back to an iframe:** regenerate the ignored `maps-config.js` and verify the Google secret contains all three expected fields without printing their values.
- **A deployed change is missing:** test the `www` property URL, not the bare domain; update asset query versions when required; follow the deployment guide and CloudFront invalidation steps.
