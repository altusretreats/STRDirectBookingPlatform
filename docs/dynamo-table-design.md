# DynamoDB Single-Table Design — Altus Retreats

Last reviewed: 2026-08-14. Shop Your Stay adds property-scoped category and product record types without changing the table key schema.

Table name: `altus-retreats-{env}`

## Key Schema

| Attribute | Type | Purpose |
|-----------|------|---------|
| PK | String (HASH) | Partition key |
| SK | String (RANGE) | Sort key |
| GSI1PK | String | GSI1 partition key |
| GSI1SK | String | GSI1 sort key |
| GSI2PK | String | GSI2 partition key |
| GSI2SK | String | GSI2 sort key |

---

## Entity Types

### 1. Property

Stores metadata for each rental property. One record per property.

| Key | Value | Example |
|-----|-------|---------|
| PK | `PROPERTY#{propertyId}` | `PROPERTY#kentucky` |
| SK | `METADATA` | `METADATA` |

**Attributes:**
```json
{
  "PK": "PROPERTY#kentucky",
  "SK": "METADATA",
  "entityType": "PROPERTY",
  "name": "Altus Kentucky Retreat",
  "slug": "kentucky",
  "domain": "kentuckyretreat.com",
  "hospitable": {
    "listingId": "abc123",
    "patSecretKey": "hospitable/prod/kentucky"  // Secrets Manager key reference
  },
  "branding": {
    "primaryColor": "#2D3A2E",
    "accentColor": "#C9A84C",
    "logoS3Key": "kentucky/logo.svg"
  },
  "address": {
    "city": "...",
    "state": "KY",
    "country": "US"
  },
  "active": true,
  "createdAt": "2026-08-07T00:00:00Z",
  "updatedAt": "2026-08-07T00:00:00Z"
}
```

**Access patterns:**
- Get property by ID → `PK=PROPERTY#kentucky, SK=METADATA`
- List all properties → scan for `entityType=PROPERTY` (low volume; acceptable)

---

### 2. Booking (legacy/internal record shape)

This is the existing internal booking record shape retained by the table and admin booking query. Hospitable Direct is now the merchant of record and handles checkout; new guest checkout must not depend on these legacy Stripe fields. A future Hospitable reservation sync may reuse the property/date access pattern while replacing the payment-specific attributes.

| Key | Value | Example |
|-----|-------|---------|
| PK | `BOOKING#{bookingId}` | `BOOKING#bk_01J4X...` |
| SK | `BOOKING#{bookingId}` | `BOOKING#bk_01J4X...` |
| GSI1PK | `PROPERTY#{propertyId}` | `PROPERTY#kentucky` |
| GSI1SK | `CHECKIN#{checkInDate}` | `CHECKIN#2026-09-15` |
| GSI2PK | Legacy payment lookup | `STRIPE#pi_3P...` |
| GSI2SK | `BOOKING#{bookingId}` | `BOOKING#bk_01J4X...` |

**Attributes:**
```json
{
  "PK": "BOOKING#bk_01J4X",
  "SK": "BOOKING#bk_01J4X",
  "GSI1PK": "PROPERTY#kentucky",
  "GSI1SK": "CHECKIN#2026-09-15",
  "GSI2PK": "STRIPE#pi_3P...",
  "GSI2SK": "BOOKING#bk_01J4X",
  "entityType": "BOOKING",
  "bookingId": "bk_01J4X",
  "propertyId": "kentucky",
  "status": "CONFIRMED",  // PENDING | CONFIRMED | CANCELLED | FAILED
  "guest": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+15551234567"
  },
  "checkIn": "2026-09-15",
  "checkOut": "2026-09-20",
  "nights": 5,
  "guests": { "adults": 2, "children": 1, "infants": 0 },
  "pricing": {
    "nightlyRate": 29500,    // cents
    "cleaningFee": 15000,
    "subtotal": 162500,
    "taxes": 13000,
    "total": 175500
  },
  "stripe": {
    "paymentIntentId": "pi_3P...",
    "chargeId": "ch_..."
  },
  "hospitable": {
    "reservationId": null    // set after webhook writes block to Hospitable
  },
  "createdAt": "2026-08-07T00:00:00Z",
  "updatedAt": "2026-08-07T00:00:00Z",
  "ttl": null               // set on FAILED bookings to auto-expire after 30 days
}
```

**Access patterns:**
- Get booking by ID → `PK=BOOKING#bk_01J4X, SK=BOOKING#bk_01J4X`
- List bookings for property, sorted by check-in → `GSI1: GSI1PK=PROPERTY#kentucky, GSI1SK begins_with CHECKIN#`
- Resolve a legacy payment record → `GSI2: GSI2PK=STRIPE#pi_3P...` (not used by the current Hospitable Direct checkout)

---

### 3. Guidebook Section

One record per section (e.g. Check-In, WiFi, House Rules, Local Recommendations).

| Key | Value | Example |
|-----|-------|---------|
| PK | `PROPERTY#{propertyId}` | `PROPERTY#kentucky` |
| SK | `GUIDEBOOK#SECTION#{order}#{sectionId}` | `GUIDEBOOK#SECTION#010#checkin` |

**Attributes:**
```json
{
  "PK": "PROPERTY#kentucky",
  "SK": "GUIDEBOOK#SECTION#010#checkin",
  "entityType": "GUIDEBOOK_SECTION",
  "sectionId": "checkin",
  "propertyId": "kentucky",
  "order": 10,
  "title": "Check-In",
  "icon": "key",
  "sectionType": "general",
  "audiences": ["hikers"],
  "published": true,
  "aiPublished": true,
  "aiContext": "Use this section for arrival and entry questions.",
  "items": [
    {
      "itemId": "checkin-code",
      "type": "text",          // text | guide | image | video | map | link
      "label": "Door Code",
      "content": "The code is 1234. Use the keypad on the front door.",
      "audiences": ["hikers", "families"],
      "aiContext": "Explain that each reservation receives a unique code.",
      "hostNotes": "Private operational note; never expose to guests or AI.",
      "order": 10
    },
    {
      "itemId": "checkin-video",
      "type": "video",
      "label": "Video walkthrough",
      "s3Key": "kentucky/guidebook/checkin-walkthrough.mp4",
      "order": 20
    }
  ],
  "createdAt": "2026-08-07T00:00:00Z",
  "updatedAt": "2026-08-07T00:00:00Z"
}
```

**Access patterns:**
- Get all guidebook sections for property (admin/internal view) → `PK=PROPERTY#kentucky, SK begins_with GUIDEBOOK#SECTION#` (returns in order)
- Get specific section → `PK=PROPERTY#kentucky, SK=GUIDEBOOK#SECTION#010#checkin`

**Visibility and projection rules:**
- `published: true` controls guest visibility only.
- `aiPublished: true` independently includes the section in the public agent Markdown feed. Legacy records without this attribute inherit `published` until their next explicit admin save.
- The public `GET /properties/{propertyId}/guidebook` handler filters to published sections and returns a guest-safe projection.
- `GET /properties/{propertyId}/guidebook/agent-context` returns agent-enabled guest content, place facts, and `aiContext` as Markdown.
- The guest projection excludes `aiContext`, `hostNotes`, `PK`, `SK`, `published`, and internal entity metadata.
- `aiContext` is returned only by the agent-readable feed when its section is enabled for AI agents.
- `hostNotes` is admin-only and must never be included in a guest or AI response.
- `sectionType: "recommendations"` identifies recommendation sections; `general` is the default.
- Optional `audiences` tags may be stored on a whole section or an individual item. Supported values are `hikers`, `climbers`, `offroaders`, `golfers`, `families`, and `nightlife`. The Explore UI shows only filters represented in published content. A tagged section appears in full; otherwise a filter projects only matching items from a mixed section.
- `type: "guide"` stores limited guest-facing Markdown for longer editorial content such as packing lists. The renderer supports paragraphs, bullet lists, and ordinary HTTPS links; scripts and arbitrary HTML are never rendered.
- Stored `icon` values remain editable metadata. The current guest renderer maps section meaning to its own consistent outline icon system instead of rendering stored emoji.

---

### 4. Managed Reviews

Reviews shown on a property site are curated in the admin and stored independently from Hospitable listing data. Third-party channel reviews are not imported automatically.

| Key | Value | Example |
|-----|-------|---------|
| PK | `PROPERTY#{propertyId}` | `PROPERTY#kentucky` |
| SK | `REVIEW#MANUAL#{reviewId}` | `REVIEW#MANUAL#8f03...` |

**Attributes:**
```json
{
  "PK": "PROPERTY#kentucky",
  "SK": "REVIEW#MANUAL#8f03...",
  "entityType": "MANUAL_REVIEW",
  "propertyId": "kentucky",
  "reviewId": "8f03...",
  "reviewerName": "Jordan M.",
  "reviewText": "A wonderful stay.",
  "rating": 5,
  "stayDate": "2026-07-01",
  "sourceLabel": "Direct guest",
  "featured": true,
  "published": true,
  "createdAt": "2026-08-12T00:00:00Z",
  "updatedAt": "2026-08-12T00:00:00Z"
}
```

Only published records are returned by the public reviews endpoint. Featured records sort before other reviews; reviews within each group sort newest first.

---

### 5. Shop Your Stay

Shop categories and products are independent property-scoped records. Category order is an ordinary numeric attribute, not part of the sort key, so reordering never creates duplicate logical records.

| Entity | PK | SK |
|--------|----|----|
| Category | `PROPERTY#{propertyId}` | `SHOP#CATEGORY#{categoryId}` |
| Product | `PROPERTY#{propertyId}` | `SHOP#PRODUCT#{productId}` |

**Category attributes:** `categoryId`, `name`, numeric `order`, `active`, `createdAt`, `updatedAt`.

**Product attributes:** `productId`, `name`, `description`, `categoryId`, optional `room`, HTTPS `affiliateUrl`, HTTPS `imageUrl`, `favorite`, `active`, `createdAt`, `updatedAt`.

The public catalog returns only active products belonging to active categories. Categories sort by `order` then name; products sort favorites first and then alphabetically. Public responses omit DynamoDB keys, timestamps, and internal entity metadata. Inactive products have no individual public route and disappear from the catalog completely.

---

### 6. Property Cache (Hospitable data)

Caches property info fetched from Hospitable so the frontend doesn't hit Hospitable on every request.

| Key | Value | Example |
|-----|-------|---------|
| PK | `PROPERTY#{propertyId}` | `PROPERTY#kentucky` |
| SK | `CACHE#HOSPITABLE` | `CACHE#HOSPITABLE` |

**Attributes:**
```json
{
  "PK": "PROPERTY#kentucky",
  "SK": "CACHE#HOSPITABLE",
  "entityType": "HOSPITABLE_CACHE",
  "propertyId": "kentucky",
  "photos": ["https://..."],
  "description": "...",
  "amenities": ["WiFi", "Pool", "Hot tub"],
  "bedrooms": 3,
  "bathrooms": 2,
  "maxGuests": 8,
  "cachedAt": "2026-08-07T00:00:00Z",
  "ttl": 1754784000          // Unix timestamp; DynamoDB auto-expires stale cache
}
```

---

## GSI Summary

| Index | PK | SK | Primary use |
|-------|----|----|-------------|
| GSI1 | `PROPERTY#{id}` | `CHECKIN#{date}` | List bookings by property + date range |
| GSI2 | `STRIPE#{paymentIntentId}` | `BOOKING#{id}` | Legacy payment lookup; retained but not used by Hospitable Direct checkout |

---

## Access Pattern Index

| Pattern | Method | Key |
|---------|--------|-----|
| Get property config | Query | `PK=PROPERTY#kentucky, SK=METADATA` |
| Get Hospitable cache | Query | `PK=PROPERTY#kentucky, SK=CACHE#HOSPITABLE` |
| Get guidebook records for guest projection | Query + published filter | `PK=PROPERTY#kentucky, SK begins_with GUIDEBOOK#SECTION#` |
| Get published managed reviews | Query + published filter | `PK=PROPERTY#kentucky, SK begins_with REVIEW#MANUAL#` |
| Get Shop Your Stay catalog | Query + active projection | `PK=PROPERTY#kentucky, SK begins_with SHOP#` |
| Get booking by ID | Query | `PK=BOOKING#bk_01J4X` |
| List bookings by property | GSI1 Query | `GSI1PK=PROPERTY#kentucky` + date range on GSI1SK |
| Resolve legacy payment record | GSI2 Query | `GSI2PK=STRIPE#pi_3P...` |

---

## Notes

- All monetary values stored in **cents** (integers) to avoid floating point issues.
- `ttl` attribute is set on FAILED bookings and stale cache entries; DynamoDB auto-deletes expired items.
- Guidebook section ordering uses zero-padded integers in SK (`010`, `020`, ...) so DynamoDB's lexicographic sort returns them in the right order. Leave gaps of 10 to allow reordering without reshuffling.
- Items within a section are stored as an attribute array (not separate records) since they're always fetched together and the count is small.
- Section-level and item-level `aiContext` may be consumed by a future agent feed. Item `hostNotes` remain private administrative data.
- Hospitable Direct is the merchant of record. Stripe-shaped booking attributes and GSI2 are legacy schema/code paths, not the active guest payment architecture.
- Shop category order is stored as a numeric attribute because category keys are immutable; changing order updates one record and cannot leave duplicate sort keys.
