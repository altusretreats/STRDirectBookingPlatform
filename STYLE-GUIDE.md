# Altus Retreats — Style Guide

> **Rule:** All brand values live here. Change them here first, then update the code. Never hardcode a color or font directly in a new file — reference the tokens below.

---

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Forest Green | `#2D3A2E` | Primary — headings, buttons, nav, borders |
| Gold | `#C9A84C` | Accent — dividers, highlights, hover states, badges |
| Cream | `#F5EFE4` | Background — light pages (hub, coming soon) |
| Stone | `#1C1F1A` | Background — dark pages (property coming soon) |
| Muted text (light bg) | `rgba(45,58,46,0.45)` | Supporting text on cream |
| Muted text (dark bg) | `rgba(245,239,228,0.45)` | Supporting text on stone/dark |

### CSS variable names
```css
/* Used across all CSS files */
--color-primary:  #2D3A2E;
--color-accent:   #C9A84C;
--color-surface:  #F5EFE4;

/* Coming soon pages use inline vars */
--green: #2D3A2E;
--gold:  #C9A84C;
--cream: #F5EFE4;
--stone: #1C1F1A;
```

---

## Typography

### Fonts
- **Cormorant Garamond** — headings, wordmarks, taglines (serif, elegant)
- **Inter** — body, nav, buttons, labels (sans-serif, clean)

Both loaded from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### Scale
| Element | Size | Weight | Font |
|---------|------|--------|------|
| Hero wordmark | `clamp(52px, 10vw, 110px)` | 300 | Cormorant |
| H1 | `clamp(32px, 5vw, 56px)` | 600 | Cormorant |
| H2 | `clamp(24px, 3vw, 36px)` | 400 | Cormorant |
| Body | `17px` | 400 | Inter |
| Small / label | `11–13px` | 400–500 | Inter |
| Button | `11–12px` | 600 | Inter, `letter-spacing: 0.1em`, uppercase |
| Eyebrow | `10–11px` | 500 | Inter, `letter-spacing: 0.25–0.3em`, uppercase |

---

## Taglines & Copy

| Context | Copy |
|---------|------|
| Master tagline | "Elevate Your Getaway" |
| Hub hero | "Not just places to stay. Places you'll never forget." |
| Hub coming soon | "Something exceptional is coming." |
| Overhang tagline | "Your basecamp for all things Red River Gorge — where adventure meets the kind of comfort you'll want to come back to." |
| Lazy Palm | TBD (coastal/tropical, family-friendly, Bradenton FL) |

---

## Email & Contact

- **Support email:** `support@altusretreats.net` (used everywhere — no hello@)
- **No-reply / from address:** `Altus Retreats <support@altusretreats.net>`

---

## Buttons

```css
/* Primary button */
background: #2D3A2E;
color: #F5EFE4;
border: none;
border-radius: 4px;
font-size: 12px;
font-weight: 600;
letter-spacing: 0.1em;
text-transform: uppercase;
padding: 14px 24px;
transition: opacity 0.2s;

/* Hover */
opacity: 0.85;

/* Accent button (on dark backgrounds) */
background: #C9A84C;
color: #1C1F1A;
```

---

## Site-by-Site Notes

### altusretreats.net (Hub — coming soon)
- Cream background (`#F5EFE4`)
- Cream-background logo
- Minimal, centered layout
- Cormorant headings, Inter body

### altusretreats.net/hub.html (Full hub — not yet live)
- Dark green hero (`#2D3A2E`)
- Both property cards side-by-side
- Cream section backgrounds alternated with white

### staytheoverhang.com (Coming soon)
- Dark stone background (`#1C1F1A`)
- Gold accent throughout
- Large Cormorant wordmark
- Amenity pills with subtle borders

### Property booking site (d2mbuzsam5af3c.cloudfront.net / future staytheoverhang.com)
- Primary: `#2D3A2E`, Accent: `#C9A84C`, Surface: `#F5EFE4`
- CSS vars in `frontend/property-site/css/main.css`
- 17px body, `line-height: 1.7`

### Guidebook (property-site/guidebook/)
- White cards with 4px `#2D3A2E` left border
- Section icons: 52px
- Same CSS vars — `--color-primary: #2D3A2E`

### Admin SPA (admin.altusretreats.net)
- Inline React styles — match `#2D3A2E` / `#C9A84C`
- No external CSS framework

### Email templates
- Header/hero: `background: #2D3A2E`
- CTA button: `background: #2D3A2E`
- Accent links: `color: #2D3A2E`

---

## Spacing & Layout

- Container max-width: `1200px`
- Section padding: `80px 24px` (desktop), `48px 24px` (mobile)
- Card border-radius: `4px` (minimal, not rounded)
- All money values: stored in **cents** (integers) in DynamoDB; display with `/100`

---

## When You Make Changes

1. Update token here first
2. Search for any hardcoded hex values (`#2D3A2E`, `#C9A84C`, `#F5EFE4`) and replace from this guide
3. Test on mobile (375px) and desktop (1280px) before deploying
4. After any frontend change, invalidate the relevant CloudFront distribution
