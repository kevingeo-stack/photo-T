---
name: Obsidian Aperture
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#36393f'
  surface-container-lowest: '#0b0e13'
  surface-container-low: '#191c21'
  surface-container: '#1d2025'
  surface-container-high: '#272a30'
  surface-container-highest: '#32353b'
  on-surface: '#e1e2ea'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#e1e2ea'
  inverse-on-surface: '#2e3036'
  outline: '#8b90a0'
  outline-variant: '#414754'
  surface-tint: '#adc7ff'
  primary: '#adc7ff'
  on-primary: '#002e68'
  primary-container: '#4a8eff'
  on-primary-container: '#00285b'
  inverse-primary: '#005bc0'
  secondary: '#ffd795'
  on-secondary: '#422c00'
  secondary-container: '#fbb400'
  on-secondary-container: '#694900'
  tertiary: '#00daf3'
  on-tertiary: '#00363d'
  tertiary-container: '#009fb2'
  on-tertiary-container: '#002f35'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc7ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#ffdea9'
  secondary-fixed-dim: '#ffba27'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4100'
  tertiary-fixed: '#9cf0ff'
  tertiary-fixed-dim: '#00daf3'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#111319'
  on-background: '#e1e2ea'
  surface-variant: '#32353b'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.06em
  metadata-mono:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-performance visual workspace tailored for photographers, art directors, and visual curators. Built around an austere, ultra-deep canvas, the system retreats into the periphery so imagery commands absolute focal priority. 

The aesthetic fuses developer-grade optical precision with high-end creative suite ergonomics:
- **Atmospheric Obsidian Canvas:** Deep, non-distracting surfaces tuned to eliminate glare and preserve human perception of photographic dynamic range.
- **Glassmorphic Tactility:** Subtle, dark-tinted frosted overlays (`backdrop-blur-md` over elevated controls) that maintain environmental awareness beneath rapid triage actions.
- **Instrument Precision:** Minimalist, geometric type pairing that conveys technical confidence, balanced with generous target zones engineered for rapid one-thumb mobile workflows.
- **Decisive Chromatic Feedback:** Vivid electric blue guides curation flows, punctuated by selective gold accents reserving reverence for final candidate selections.

## Colors

The chromatic architecture is engineered for low-light curation, eliminating chromatic bleeding into adjacent imagery while maintaining critical hierarchy.

- **Primary (`#007BFF`):** Electric Cobalt. Serves as the primary active state, bulk triage confirmation, selection bounding boxes, and high-priority actionable triggers.
- **Secondary (`#FFB703`):** Amber Star. Reserved exclusively for finalist badges, star-ratings, curated selects, and hero retention indicators.
- **Tertiary (`#00E5FF`):** Cyan Spark. Utilized for non-destructive metadata tags, filter toggles, live capture sync indicators, and micro-interactions.
- **Neutral Canvas (`#0A0D12`):** Deep Obsidian. The baseline ambient surface. Layer tiers step up through subtle lightness elevations (`#121721` for elevated decks, `#1A2230` for floating floating controls) combined with 1px hairline borders (`rgba(255, 255, 255, 0.08)`).
- **Semantic Feedback:** Rejection flags apply muted crimson (`#EF4444`) with low alpha backgrounds, while keeper confirmations trigger vibrant cobalt flashes.

## Typography

Typography balances technical studio precision with effortless legibility:
- **Headlines & Technical Labels (Geist):** Employed for numeric photo telemetry (ISO, aperture, shutter speed, frame counts), modal titles, and section headers. High tabular alignment accuracy and tight tracking evoke calibrated camera hardware.
- **Body & Editorial Copy (Manrope):** Geometric yet open and humanistic letterforms ensure sustained readability when reviewing capture metadata, client notes, and batch export configurations.
- **Scale Discipline:** Mobile interfaces strictly leverage `headline-xl-mobile` to prevent header wrapping over active curation zones. All uppercase tags use `label-sm` with widened tracking (`0.06em`) for immediate peripheral scanability.

## Layout & Spacing

The layout is built mobile-first around rapid thumb-driven gestures and edge-to-edge full-bleed visual engagement.

- **Mobile Viewport (< 640px):** Single-column full-bleed visual stage with a fixed bottom triage deck. Margins are maintained at `margin` (`1rem`) to maximize screen area for photo inspection. Grid displays enforce a 2-column or 3-column contact sheet layout using `gutter` (`0.75rem`).
- **Tablet & Desktop (≥ 640px):** Expands to a multi-pane split view where metadata and thumbnail navigation flank the central stage. Grid views expand dynamically from 4 to 8 columns with `gutter-desktop` (`1.5rem`).
- **Touch-First Rhythm:** Triage controls observe a vertical 48px baseline safe hit area. The bottom edge includes a dedicated `space-xl` margin clearance to account for system gesture home bars on mobile devices.

## Elevation & Depth

Visual hierarchy uses tonal surface layering combined with translucent glassmorphism rather than muddy opaque drop-shadows.

- **Level 0 (Canvas):** Base background `#0A0D12`. Non-interactive, light-absorbent plane.
- **Level 1 (Panels & Cards):** Tonal surface `#121721` bounded by a crisp 1px border (`rgba(255, 255, 255, 0.07)`). Used for metadata sheets and unselected asset containers.
- **Level 2 (Floating Action Decks & Overlays):** Translucent obsidian `rgba(18, 23, 33, 0.72)` supported by a `20px` backdrop blur (`backdrop-blur-md`) and a top hairline rim-light border (`rgba(255, 255, 255, 0.15)`).
- **Level 3 (Focused & Dragged Assets):** Active cards during swipe triage lift with an ambient cobalt aura (`box-shadow: 0 16px 32px -8px rgba(0, 123, 255, 0.25), 0 0 0 1px rgba(0, 123, 255, 0.6)`).
- **Modals & Popovers:** Suspended against a dark scrim (`rgba(5, 7, 10, 0.8)`) with `backdrop-blur-sm`, anchored with pill-shaped handles.

## Shapes

The design system uses deliberate geometry to distinguish interactive controls from photographic assets:

- **Interactive Controls (Pill Form, Radius Level 3):** Action buttons, badge indicators, filter chips, and navigation floating islands feature fully rounded pill profiles (`rounded-full` / 9999px) or `1rem` on compact elements. This eliminates harsh corners near swipe zones and conveys dynamic physical touchpoints.
- **Photographic Media (Controlled Radius):** Image containers deviate strictly from pill shapes to preserve composition integrity, utilizing a subtle 8px–12px radius (`rounded-md` to `rounded-lg`). Over-rounding photos is avoided to prevent visual cropping of framing corners.

## Components

### Buttons
- **Primary Pill:** Electric Cobalt fill (`#007BFF`), high-contrast white text, `font-family: Geist`, `font-weight: 600`. Active state triggers micro-scale compression (`transform: scale(0.97)`).
- **Glass Secondary:** Translucent slate background (`rgba(255, 255, 255, 0.08)`), frosted blur, white text, 1px perimeter line (`rgba(255, 255, 255, 0.12)`).
- **Action Icons (Floating Triage Deck):** 56px circular pill buttons holding SVG iconography for Quick Reject (crimson tint), Star (amber tint), and Keep (electric blue tint).

### Chips & Metadata Badges
- **Triage Chips:** Fully rounded pills (`rounded-full`) utilizing `space-xs` vertical padding and `space-sm` horizontal padding.
- **Finalist Badge:** High-contrast amber pill (`rgba(255, 183, 3, 0.15)`) with an amber star icon and text `#FFB703`, accented by an amber border glow.
- **EXIF Tokens:** Subdued neutral gray chips displaying monospace Geist telemetry (`1/250s`, `f/2.8`, `ISO 400`).

### Photo Cards (Triage Stack & Contact Grid)
- **Triage Card:** High-contrast frame holding edge-to-edge preview. Features an interior bottom gradient (`linear-gradient(to top, rgba(10, 13, 18, 0.9), transparent)`) surfacing EXIF data.
- **Selection Halo:** In grid mode, chosen cards gain an inner 2px Electric Cobalt border (`#007BFF`) and an elevated corner badge containing a checkmark.

### Checkboxes & Binary Selectors
- **Curator Multi-Select:** Circular pill checkboxes. Inactive: transparent with a 1.5px slate rim. Active: vibrant `#007BFF` fill with a centered micro checkmark icon.

### Input Fields & Sliders
- **Search & Filter Bars:** Pill-shaped glass troughs with inset search icons and a placeholder color of `#64748B`. Focus reveals an active `#007BFF` hairline outline.
- **Rating Scrubbers:** Horizontal touch strip providing haptic feedback at star increments (1 through 5) mapped to amber illumination.

### Lists & Activity Feeds
- High-density rows separated by subtle border separators (`rgba(255, 255, 255, 0.05)`). Thumbnails feature consistent 6px corner rounding paired with two-line typographic metadata.