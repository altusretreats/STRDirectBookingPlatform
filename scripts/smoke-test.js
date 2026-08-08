#!/usr/bin/env node
/**
 * smoke-test.js — Run against live sites after every deploy.
 *
 * Usage:
 *   node scripts/smoke-test.js           # tests dev environment (default)
 *   node scripts/smoke-test.js prod      # tests prod environment
 *
 * Pass / fail exit code — safe to use in CI.
 */

const ENV = process.argv[2] || 'dev';

const CONFIG = {
  dev: {
    api:      'https://teh1cl4b6a.execute-api.us-east-1.amazonaws.com/dev',
    hub:      'https://www.altusretreats.net',
    property: 'https://www.staytheoverhang.com',
    admin:    'https://admin.altusretreats.net',
  },
  prod: {
    api:      process.env.PROD_API_URL || 'PROD_API_URL_NOT_SET',
    hub:      'https://www.altusretreats.net',
    property: 'https://www.staytheoverhang.com',
    admin:    'https://admin.altusretreats.net',
  },
};

const { api, hub, property, admin } = CONFIG[ENV] || CONFIG.dev;

// ── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ status: 'PASS', name });
    passed++;
  } catch (err) {
    results.push({ status: 'FAIL', name, error: err.message });
    failed++;
  }
}

async function get(url, opts = {}) {
  const res = await fetch(url, { redirect: 'follow', ...opts });
  return res;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\n🧪  Smoke tests — ${ENV.toUpperCase()} environment\n`);

  // ── Hub site ──────────────────────────────────────────────────────────────
  await test('Hub coming soon (altusretreats.net) → 200', async () => {
    const res = await get(hub);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Hub coming soon contains brand copy', async () => {
    const res = await get(hub);
    const text = await res.text();
    assert(text.includes('Altus Retreats'), 'Missing "Altus Retreats" in page');
    assert(text.includes('support@altusretreats.net'), 'Still using hello@ instead of support@');
  });

  await test('Hub future site (hub.html) → 200', async () => {
    const res = await get(`${hub}/hub.html`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ── Property site ─────────────────────────────────────────────────────────
  await test('Overhang coming soon (staytheoverhang.com) → 200', async () => {
    const res = await get(property);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Overhang coming soon contains correct email', async () => {
    const res = await get(property);
    const text = await res.text();
    assert(!text.includes('hello@altusretreats.net'), 'Still using hello@ on coming soon page');
  });

  await test('Booking site preview (preview.html) → 200', async () => {
    const res = await get(`${property}/preview.html`);
    assert(res.status === 200, `Expected 200, got ${res.status} — did you upload preview.html?`);
  });

  await test('Guidebook → 200', async () => {
    const res = await get(`${property}/guidebook/`);
    assert(res.status === 200, `Expected 200, got ${res.status} — CloudFront function may still be propagating`);
  });

  await test('Guidebook contains correct title', async () => {
    const res = await get(`${property}/guidebook/`);
    const text = await res.text();
    assert(text.includes('Guidebook') || text.includes('guidebook'), 'Guidebook page missing expected content');
  });

  // ── Admin panel ───────────────────────────────────────────────────────────
  await test('Admin panel (admin.altusretreats.net) → 200', async () => {
    const res = await get(admin);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ── API: public endpoints ─────────────────────────────────────────────────
  await test('API health — GET /properties/kentucky → 200', async () => {
    const res = await get(`${api}/properties/kentucky`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.property, 'Response missing "property" key');
    assert(
      data.property.PK === 'PROPERTY#kentucky' || data.property.propertyId === 'kentucky' || data.property.name,
      'Response property object looks wrong'
    );
  });

  await test('API — property has name and pricing', async () => {
    const res = await get(`${api}/properties/kentucky`);
    const data = await res.json();
    const p = data.property;
    assert(p.name, 'Property has no name');
    assert(p.pricing?.nightlyRate, 'Property has no nightly rate');
  });

  await test('API — GET /properties/kentucky/availability → 200', async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const res = await get(`${api}/properties/kentucky/availability?start_date=${today}&end_date=${future}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    // Response shape: { propertyId, start_date, end_date, calendar: { days: [...] } }
    assert(data.calendar, 'Availability response missing "calendar" key');
    assert(Array.isArray(data.calendar.days), 'Availability response missing "days" array');
  });

  await test('API — POST /waitlist accepts valid email', async () => {
    const res = await fetch(`${api}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smoke-test@altusretreats.net', source: 'smoke-test' }),
    });
    assert(res.status === 200 || res.status === 201, `Expected 2xx, got ${res.status}`);
  });

  await test('API — non-existent property returns 404', async () => {
    const res = await get(`${api}/properties/does-not-exist`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // ── Brand consistency checks ──────────────────────────────────────────────
  await test('No hello@ email on hub site', async () => {
    const res = await get(hub);
    const text = await res.text();
    assert(!text.includes('hello@altusretreats.net'), 'Found stale hello@ on hub site');
  });

  await test('No old brand color #2D4A3E on hub site', async () => {
    const res = await get(hub);
    const text = await res.text();
    assert(!text.includes('#2D4A3E') && !text.includes('#2d4a3e'),
      'Found old brand color #2D4A3E on hub site — should be #2D3A2E');
  });

  // ── Print results ─────────────────────────────────────────────────────────
  console.log('─'.repeat(60));
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon}  ${r.name}`);
    if (r.error) console.log(`    └─ ${r.error}`);
  }
  console.log('─'.repeat(60));
  console.log(`\n  ${passed} passed  |  ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Smoke test runner crashed:', err);
  process.exit(1);
});
