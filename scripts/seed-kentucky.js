#!/usr/bin/env node
/**
 * Seed script — writes the Kentucky property record + starter guidebook to DynamoDB.
 * Run: node scripts/seed-kentucky.js [--env dev|prod]
 *
 * Requires AWS credentials in env (via CLI profile or IAM role).
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const env   = process.argv.includes('--env') ? process.argv[process.argv.indexOf('--env') + 1] : 'dev';
const TABLE = `altus-retreats-${env}`;
const REGION = process.env.AWS_REGION || 'us-east-1';

console.log(`\n🌿  Seeding Kentucky property → table: ${TABLE} (${REGION})\n`);

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function put(item) {
  await client.send(new PutCommand({ TableName: TABLE, Item: item }));
  console.log(`  ✓  ${item.PK} / ${item.SK}`);
}

async function seed() {
  const now = new Date().toISOString();

  // ── Property metadata ────────────────────────────────────────
  await put({
    PK: 'PROPERTY#kentucky',
    SK: 'METADATA',
    GSI1PK: 'ENTITY_TYPE#PROPERTY',
    GSI1SK: 'PROPERTY#kentucky',
    entityType: 'PROPERTY',
    slug: 'kentucky',
    name: 'The Overhang',
    domain: 'staytheoverhang.com',
    hospitable: {
      // Set this to your Hospitable property UUID (found in app.hospitable.com/properties/{uuid})
      // then run "Sync" in the admin → Properties → The Overhang → Sync tab
      propertyId: '2331834',   // Hospitable property UUID (NOT Airbnb listing ID)
      platform:   'hospitable',
      cached:     null,        // populated by syncProperty Lambda
      lastSyncedAt: null,
    },
    // Admin-editable content overrides (populated via admin → Content tab)
    content: {
      heroHeadline: '',     // overrides hospitable.cached.name if set
      heroSubtitle: '',     // overrides hospitable.cached.summary if set
      aboutTitle:   '',
      aboutBody:    '',
      heroPhoto:    null,   // S3 URL of hero photo
    },
    // Admin-editable location overrides (merged with hospitable.cached.location)
    location: {
      neighborhood:    'Red River Gorge',
      neighborhoodDesc:'Nestled in the heart of the Red River Gorge Geological Area — a National Natural Landmark renowned for its ancient rock shelters, natural arches, and world-class climbing.',
      directions:      'From the Bert T. Combs Mountain Parkway, take exit 33 toward Campton. Follow KY-15 south for 8 miles, then turn left on KY-77. Continue 4 miles and follow the signs to the property.',
      gettingAround:   'A car is essential. The nearest town (Campton) is 12 miles away. Stanton has a grocery store 18 miles out.',
      pinLat:          37.7918,
      pinLng:          -83.6832,
      mapsEmbed:       null,
    },
    branding: {
      tagline:     'Your basecamp for all things Red River Gorge.',
      description: 'A two-bedroom luxury retreat nestled deep inside Daniel Boone National Forest — where world-class climbing crags, ancient arches, and hidden waterfalls are minutes from your front door.',
      primaryColor: '#2D3A2E',
      accentColor:  '#C9A84C',
      logoS3Key:    null,
    },
    address: {
      city:    'Stanton',
      state:   'KY',
      zip:     '40380',
      country: 'US',
    },
    pricing: {
      nightlyRate:  35000,   // cents — $350/night
      cleaningFee:  15000,   // cents — $150
      minNights:    2,
      maxNights:    14,
      checkInTime:  '15:00',
      checkOutTime: '11:00',
    },
    amenities: [
      'Hot Tub', 'Sauna', 'Cold Plunge', 'Fire Pit',
      'Full Kitchen', 'WiFi', 'Smart TV', 'EV Charger',
      'Trail Access', 'World-Class Climbing Nearby',
    ],
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  // ── Guidebook sections ───────────────────────────────────────
  const sections = [
    {
      id: 'welcome', order: 10, icon: '👋', title: 'Welcome',
      items: [
        { itemId: 'welcome-msg', type: 'text', label: 'Welcome message', order: 10,
          content: 'Welcome to The Overhang! We\'re so glad you\'re here. You\'re steps away from some of the best climbing, hiking, and scenery in the country. This guidebook has everything you need for an unforgettable stay.' },
      ],
    },
    {
      id: 'checkin', order: 20, icon: '🔑', title: 'Check-In',
      items: [
        { itemId: 'checkin-time',  type: 'text', label: 'Check-in time',  order: 10, content: 'Check-in is at 3:00 PM.' },
        { itemId: 'checkin-code',  type: 'text', label: 'Door code',       order: 20, content: 'REPLACE_ME — code will be sent 24 hours before arrival.' },
        { itemId: 'checkin-video', type: 'video', label: 'Video walkthrough', order: 30, content: null },
      ],
    },
    {
      id: 'checkout', order: 30, icon: '🚪', title: 'Check-Out',
      items: [
        { itemId: 'checkout-time',  type: 'text', label: 'Check-out time', order: 10, content: 'Please check out by 11:00 AM.' },
        { itemId: 'checkout-tasks', type: 'text', label: 'Before you go',  order: 20,
          content: 'Please start the dishwasher, take out trash bags to the bin outside, and leave keys on the kitchen counter.' },
      ],
    },
    {
      id: 'wifi', order: 40, icon: '📶', title: 'WiFi & Tech',
      items: [
        { itemId: 'wifi-network',  type: 'text', label: 'Network name', order: 10, content: 'REPLACE_ME' },
        { itemId: 'wifi-password', type: 'text', label: 'Password',     order: 20, content: 'REPLACE_ME' },
        { itemId: 'wifi-tv',       type: 'text', label: 'Smart TV',     order: 30, content: 'Netflix, Hulu, and Disney+ are logged in. Apple TV remote is on the media console.' },
      ],
    },
    {
      id: 'house-rules', order: 50, icon: '📋', title: 'House Rules',
      items: [
        { itemId: 'rules-list', type: 'text', label: 'Rules', order: 10,
          content: '• No smoking indoors\n• No parties or events\n• Pets welcome with prior approval\n• Quiet hours 10 PM – 8 AM\n• Maximum 10 guests' },
      ],
    },
    {
      id: 'hot-tub', order: 60, icon: '♨️', title: 'Hot Tub',
      items: [
        { itemId: 'hottub-how', type: 'text', label: 'How to use', order: 10,
          content: 'The hot tub is heated to 102°F. Use the control panel on the side to adjust temperature or jets. Please shower before use and keep the cover on when not in use.' },
      ],
    },
    {
      id: 'local-recs', order: 70, icon: '🗺️', title: 'Local Recommendations',
      items: [
        { itemId: 'recs-dining',  type: 'text', label: 'Dining',    order: 10, content: 'REPLACE_ME — add your favorite local restaurants' },
        { itemId: 'recs-outdoor', type: 'text', label: 'Outdoors',  order: 20, content: 'REPLACE_ME — hiking trails, lakes, state parks nearby' },
        { itemId: 'recs-shops',   type: 'text', label: 'Shopping',  order: 30, content: 'REPLACE_ME — nearest grocery store, hardware store, etc.' },
      ],
    },
    {
      id: 'emergency', order: 80, icon: '🚨', title: 'Emergency Contacts',
      items: [
        { itemId: 'emergency-police', type: 'text', label: 'Emergency', order: 10, content: '911' },
        { itemId: 'emergency-host',   type: 'text', label: 'Host',      order: 20, content: 'REPLACE_ME — your phone number' },
        { itemId: 'emergency-nearest-er', type: 'text', label: 'Nearest ER', order: 30, content: 'REPLACE_ME' },
      ],
    },
  ];

  for (const section of sections) {
    const orderPadded = String(section.order).padStart(3, '0');
    await put({
      PK: 'PROPERTY#kentucky',
      SK: `GUIDEBOOK#SECTION#${orderPadded}#${section.id}`,
      entityType: 'GUIDEBOOK_SECTION',
      sectionId: section.id,
      propertyId: 'kentucky',
      order: section.order,
      title: section.title,
      icon: section.icon,
      items: section.items,
      published: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log('\n✅  Seed complete!\n');
  console.log('Next steps:');
  console.log('  1. Go to admin → Properties → The Overhang → Sync tab, click "Sync from Hospitable"');
  console.log('  2. Replace REPLACE_ME values in guidebook sections via the admin panel');
  console.log('  3. Upload hero photo via admin → Media tab\n');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
