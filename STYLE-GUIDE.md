# Altus Retreats — Product & Visual Style Guide

This is the canonical design reference for Altus Retreats guest-facing products. Update this document when a visual system or interaction rule changes, then update the implementation.

The platform has a shared hospitality voice, but property experiences may use their own visual palette. Do not force every property into the Altus corporate colors.

---

## Brand hierarchy

### Altus Retreats master brand

Used for the hub, corporate communication, email, and administrative identity.

| Token | Value | Role |
|---|---:|---|
| Altus Forest | `#2D3A2E` | Master-brand primary |
| Altus Gold | `#C9A84C` | Master-brand accent |
| Altus Cream | `#F5EFE4` | Warm master-brand surface |
| Altus Stone | `#1C1F1A` | Dark master-brand surface |

### The Overhang property experience

Used by the live editorial property page and guest stay guide. It should feel outdoorsy, confident, modern, and clearly tied to Red River Gorge.

| Token | Value | Role |
|---|---:|---|
| Deep Blue | `#1D3557` | Primary navigation, headings, iconography, dark surfaces |
| Deep Blue Soft | `#294765` | Secondary blue surfaces |
| Canyon Red | `#D1614D` | Property-page calls to action and active accents |
| Guide Canyon Red | `#BD503E` | Guidebook calls to action and labels |
| Cloud Surface | `#F2F4F6` | Property-page section background |
| Guide Mist | `#F3F6F7` | Guidebook background |
| Snow | `#FBFDFF` | Property-page white surface |
| White | `#FFFFFF` | Guidebook cards and overlays |
| Ink | `#202A35` | Property-page body text |
| Guide Ink | `#172638` | Guidebook body text |
| Muted | `#657180` | Property-page secondary text |
| Guide Muted | `#637180` | Guidebook secondary text |
| Guide Line | `#DCE3E7` | Guidebook borders and separators |
| Guide Soft | `#E7EEEB` | Subtle guidebook status surfaces |

The small difference between property-page Canyon Red and guidebook Canyon Red is intentional in the current implementation. If they are unified later, change the tokens first and visually verify contrast before replacing either value.

### Token ownership

- Property page: `frontend/property-site/css/main.css`, especially `--property-*` tokens.
- Guest guide: `frontend/property-site/guidebook/css/guidebook.css`, using `--guide-*` tokens.
- Booking page: `frontend/property-site/css/book.css`; this still uses the earlier Altus green/gold system and has not yet been migrated.
- Admin SPA: `frontend/admin-spa/src/admin.css` owns the shared workspace tokens and shell. The admin borrows the guidebook's Deep Blue, Canyon Red, Mist, Fraunces, and DM Sans language while keeping forms denser and operationally focused.

Never use a master-brand token merely because it already exists. Choose the token family belonging to the surface being changed.

---

## Typography

### Property page

- **Cormorant Garamond** — display headings and editorial moments.
- **Inter** — navigation, body copy, labels, facts, controls, and booking UI.

```css
--font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
```

### Guest stay guide

- **Fraunces** — warm editorial headings, property name, journey titles, and topic titles.
- **DM Sans** — body copy, labels, buttons, search, metadata, and navigation.

```css
--guide-serif: "Fraunces", Georgia, serif;
--guide-sans: "DM Sans", Arial, sans-serif;
```

### Type principles

- Serif type establishes sense of place; sans-serif type carries instructions.
- Use sentence case for guest-facing buttons and navigation. Avoid all-uppercase button copy.
- Eyebrows may be uppercase at `9–12px` with `0.11–0.13em` tracking.
- Do not use font weights above `600` in the guest guide.
- Instructional text must remain readable at a glance; do not place essential information below `12px`.

---

## Icon system

The guest experience uses one restrained outline icon system.

### Rules

- Use inline SVG symbols from the guidebook icon sprite or matching line icons.
- Default icon color is Deep Blue. Use Canyon Red for active journeys and emphasized actions only.
- Use consistent rounded line caps and joins with approximately `1.8–2px` strokes.
- Put navigational/topic icons on subtle Mist backgrounds when they need a container.
- Never show admin-authored emoji directly in the guest UI. The guest renderer maps section meaning to a semantic outline icon.
- Do not mix filled, cartoon, multicolor, emoji, and outline icons on the same surface.
- Icons support visible labels; they do not replace labels for important actions.

### Semantic mapping

| Content | Icon |
|---|---|
| Welcome | House with heart |
| Check-in / access | Key |
| Check-out | Open door |
| Wi-Fi & technology | Wi-Fi |
| House rules | Clipboard |
| Hot tub / water amenities | Waves |
| Fire pit / grill | Flame |
| Local recommendations | Map or compass |
| Emergency contacts | Shield with alert |
| Restaurant | Utensils |
| Attraction | Landmark |
| Shopping | Shopping bag |
| Services | Fuel pump |

The round mountain mark in the guide header is a compact product identifier, not the final property logo. Replace it only with a mark that remains legible at approximately `36–42px`.

---

## Guest stay guide

The guide is a stay companion, not a digital binder. Desktop and mobile use the same API data but intentionally present different information densities.

### Desktop and tablet

- Show the photographic welcome hero and prominent search.
- Present four journey choices: **I’m arriving**, **At the house**, **Let’s explore**, and **Checking out**.
- Show the selected journey’s topics in the main column.
- Keep up to four quick essentials in a sticky supporting rail.
- Topic bodies are collapsible; open the first topic by default.

### Mobile

- The home screen is a calm router, not a compressed desktop dashboard.
- Show search, four guest intents, and one timely information card.
- Do not display full topic content until the guest chooses a journey.
- Journey detail screens show focused, collapsible topics with a clear back action.
- Keep Home, Search, Explore, and Help available in the bottom navigation.
- Avoid horizontal card carousels and dense two-column content on phones.

### Information hierarchy

```text
Search or guest intent
  → Journey
    → Topic
      → Individual answer, instruction, media, or place detail
```

### Supported content

- Text and highlighted text
- Copyable short values such as Wi-Fi passwords
- Images and video
- Maps and external links
- Google Place recommendation cards and detail dialogs
- Search and section deep links

Placeholder values such as `REPLACE_ME` must never be printed literally to guests. Show a neutral “available when ready for your stay” state instead.

### Cards and geometry

- Guide surfaces use `13–22px` radii depending on hierarchy.
- Use one-pixel `Guide Line` borders and restrained shadows.
- Do not reintroduce the former four-pixel colored left border.
- Avoid nesting decorative cards. A topic may contain content surfaces only when the content needs a distinct interaction or reading boundary.

---

## Property page

- The live page uses a framed, immersive photographic landing followed by a wide editorial layout.
- Deep Blue anchors navigation and major dark surfaces; Canyon Red is reserved for booking actions and active accents.
- Photography should dominate. Decorative UI must not compete with the property or landscape.
- Use full-width gallery moments, generous whitespace, and restrained scroll motion.
- The Hospitable booking widget remains the primary transactional element.
- Reduced-motion preferences must be honored.

---

## Buttons and controls

### Emphasis

1. **Primary:** Canyon Red filled button for the most important action, such as Book Now or Get directions.
2. **Secondary:** Deep Blue filled or outlined button for important supporting actions.
3. **Tertiary:** Text or ghost action for navigation and disclosure.

### Shape and language

- Use rounded rectangles for ordinary actions and pills only where the control is intentionally compact.
- Use circular buttons only for familiar icon actions with an accessible label, such as close.
- Use explicit guest language: “Get directions,” “Contact your host,” or “Back to guide.”
- Provide visible hover and focus states; never remove the browser focus indicator without a replacement.
- Touch targets should be at least `44px` in either dimension.

---

## Content and voice

- Warm, capable, concise, and never corporate.
- Lead with the answer or action the guest needs.
- Prefer “What do you need?” over software language such as “Search knowledge base.”
- Keep instructions short enough to scan while standing at the relevant appliance or entry point.
- Local recommendations should explain why the host chose the place, not simply repeat Google metadata.
- Checkout instructions should be mercifully short and clearly prioritized.

---

## Guest, AI, and private content

Visual visibility and AI availability are different concepts.

- `published` means the section is visible in the guest stay guide.
- `aiContext` is hidden from guests and included only when its section is available in the agent-readable context feed.
- `hostNotes` is private admin-only content and must never appear in either the guest guide or an AI feed.
- The public guest API must return a sanitized projection without AI context, host notes, DynamoDB keys, or internal metadata.
- `aiPublished` ("Available to AI agents") controls the public Markdown feed independently from `published` ("Visible to guests"). Existing records without `aiPublished` temporarily inherit `published` for migration compatibility.
- Because the agent feed is publicly reachable, never enable sections containing reservation-specific codes, private guest information, or operational secrets. Keep private material in `hostNotes`.
- Guest search should resolve common intent synonyms (such as food/eat/restaurants) without requiring duplicate content or tags from the host.
- The guest guide must remain booking-neutral: no “Book again,” “Book direct,” pricing, discount, review-solicitation, or links back to the direct-booking experience. Property identity and stay-support content are allowed; reservation commerce belongs to the booking channel.

---

## Accessibility and reliability

- Maintain WCAG-readable contrast for all text and controls.
- Use semantic buttons, links, headings, dialogs, and native inputs.
- Every icon-only control requires an accessible label.
- Do not rely on color or icons alone to communicate meaning.
- Verify keyboard operation for search, topic disclosure, dialogs, and close actions.
- Essential content must degrade gracefully if a photo or third-party service fails.
- Test at `390px` mobile and at least `1280px` desktop. Also confirm no horizontal overflow at `320px`.
- Honor `prefers-reduced-motion`.

---

## Other product surfaces

### Hub

- Retains the Altus Forest, Gold, Cream, and Stone master-brand system.
- The current public hub remains a minimal coming-soon experience.

### Admin SPA

- Prioritize legibility, obvious form state, and efficient content editing.
- Use Deep Blue for navigation and primary controls, Canyon Red for active accents, Mist for the workspace, and white for editing surfaces.
- Use Fraunces only for page-level editorial headings; use DM Sans for controls, labels, and operational content.
- Property content editors must preserve existing unedited content fields when saving so media and other tab-owned overrides are never discarded.
- AI context and host notes must be visibly differentiated from guest-visible content.
- Do not imply that “Visible to guests” also controls AI availability.

### Email

- Use the master-brand Forest header and CTA styling.
- Sender: `Altus Retreats <support@altusretreats.net>`.

---

## Change checklist

1. Update this guide when changing a token, typeface, icon rule, or responsive pattern.
2. Update the owning CSS token rather than scattering new hardcoded values.
3. Check desktop and mobile with real API content—not only placeholder fixtures.
4. Verify focus, keyboard behavior, reduced motion, and horizontal overflow.
5. For guidebook changes, confirm the public API still excludes `aiContext` and `hostNotes`.
6. Deploy with the relevant guide and invalidate only the affected CloudFront paths.
