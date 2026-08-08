#!/usr/bin/env node
/**
 * Lists all Hospitable properties and their IDs using your stored PAT.
 * Run this to find the property UUID to paste into admin → Property Settings.
 *
 * Usage:
 *   node scripts/list-hospitable-properties.js
 */

async function main() {
  // Accept PAT as command-line arg: node list-hospitable-properties.js <PAT>
  // OR try to read from Secrets Manager via Python (avoids Windows UTF-16 issues)
  let pat = process.argv[2];

  if (!pat) {
    const { execSync } = require('child_process');
    try {
      const raw = execSync(
        `python3 -c "import subprocess,json; r=subprocess.run(['aws','secretsmanager','get-secret-value','--secret-id','altus-retreats/dev/hospitable','--region','us-east-1','--output','json'],capture_output=True); d=json.loads(r.stdout); print(d['SecretString'])"`,
        { encoding: 'utf-8' }
      ).trim();
      const secrets = JSON.parse(raw);
      pat = secrets.kentucky || secrets.default;
    } catch (err) {
      console.error('\nCould not auto-load PAT. Pass it directly:\n');
      console.error('  node scripts/list-hospitable-properties.js YOUR_PAT_HERE\n');
      process.exit(1);
    }
  }

  if (!pat || pat === 'MOCK' || pat === 'REPLACE_ME') {
    console.error('No valid PAT provided.');
    process.exit(1);
  }

  // Call Hospitable API
  console.log('\nFetching properties from Hospitable...\n');
  const res = await fetch('https://public.api.hospitable.com/v2/properties?includes=listings', {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Hospitable API error ${res.status}:`, text);
    process.exit(1);
  }

  const json = await res.json();
  const properties = json.data || json;

  if (!properties.length) {
    console.log('No properties found on this Hospitable account.');
    return;
  }

  console.log('─'.repeat(60));
  console.log('  Hospitable Properties');
  console.log('─'.repeat(60));
  for (const p of properties) {
    const listings = (p.listings?.data || p.listings || [])
      .map(l => `${l.platform || l.channel}: ${l.id}`)
      .join(', ') || 'no listings';
    console.log(`\n  Name:         ${p.name || p.title}`);
    console.log(`  Property UUID: ${p.id}   ← paste this into admin`);
    console.log(`  Listings:      ${listings}`);
  }
  console.log('\n' + '─'.repeat(60));
  console.log('\n  Copy the "Property UUID" above into:');
  console.log('  Admin → Property Settings → Hospitable Property ID\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
