# Design System — Is it a Freebie? (v2: Government Stamp)

Visual direction: Indian bureaucracy meets internet culture. Official assessment forms,
rubber stamps, pressure gauges, file labels, paper textures.

## Typography

| Role | Font | Weight | Sizes (desktop / tablet / mobile) |
|------|------|--------|-----------------------------------|
| Display (title, score, verdict, stamp) | Anton | Regular (400) | 80 / 56 / 40 px (title), 52px (gauge score) |
| Body (subheadline, reasoning, summary) | Epilogue | Regular (400), Medium (500), SemiBold (600) | 16 / 16 / 14 px |
| UI (chips, buttons, labels) | Epilogue | SemiBold (600), tracking +0.05em, uppercase | 14 / 14 / 12 px |

Source: Google Fonts. Load only weights used: Anton 400 + Epilogue 400,500,600.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#0A0A0F` | Page background (deep charcoal) |
| `text-primary` | `#FAFAFA` | Primary text (19.3:1 contrast) |
| `muted` | `#A1A1AA` | Subheadline, placeholders, secondary |
| `accent` | `#F59E0B` | Button glow, focus rings, active states |
| `border` | `#27272A` | Input/chip borders (default) |

## Verdict Color Scale

| Score | Label | Hex |
|-------|-------|-----|
| 0-20 | Solid Welfare | `#22C55E` |
| 21-40 | Mostly Productive | `#84CC16` |
| 41-60 | It's Complicated | `#F59E0B` |
| 61-80 | Freebie-ish | `#F97316` |
| 81-100 | Full Freebie | `#EF4444` |

## Background Treatment

- CSS noise/grain texture: SVG feTurbulence filter, opacity 4%, fixed, repeat
- Radial glow: Amber at 3% opacity, centered behind content, 800x600px ellipse
- Creates paper-like depth on dark background

## Component Specs

### Input
- Bottom-border only: 2px solid `border`, transparent other sides
- Focus: bottom border transitions to `accent`
- No box/rounded borders

### Suggestion Chips (File Label Tabs)
- Border: 1px **dashed** `border` (not solid — file folder feel)
- Shape: rounded-lg (8px, not full-round pills)
- Font: Inter Medium, tracking +0.02em
- Active: solid amber border, amber text, amber/10 bg
- Hover: border → accent, text → accent, bg amber/5

### Analyze Button (Stamp-Press)
- Circle: 120px desktop / 112px tablet / 96px mobile
- 3D embossed: inner highlight + inner shadow + outer shadow
- Gradient: top-to-bottom amber/15 to transparent
- Hover: lifts (translateY -2px), shadow extends
- Active/Press: scale(0.95), shadow flattens (tactile press)
- Enabled: 2s amber glow pulse oscillation

### Circular Gauge (SVG)
- 240° arc sweep, 5 colored segments matching verdict scale
- 11 tick marks (every 10 points)
- Needle: thin line from center to score, verdict-colored
- Score number: center, Space Grotesk Bold 48px
- "out of 100" label below score
- "WELFARE" / "FREEBIE" at arc endpoints
- Sizes: 280px mobile / 360px tablet / 400px desktop
- Animation: needle sweeps 0 → score (1.2s easeOut)

### Rubber Stamp (Verdict)
- Border: 3px solid, verdict-colored
- Shape: rounded rectangle (12px), rotated -3°
- Text: Space Grotesk Bold, uppercase, verdict-colored
- Background: verdict color at 8% opacity
- Animation: scale(0) rotate(-15°) → scale(1.05) rotate(-3°) → settle (spring)
- Ink shadow: 3px 3px verdict color at 15% opacity (appears after landing)

### Horizontal Score Bars
- Height: 8px, 2px border-radius
- Track: `border` color
- Fill: verdict-colored, width = (score/10 * 100)%
- Label: criterion name (left, white) + "X/10" (right, verdict-colored)
- Reasoning: below bar, muted, 13px
- Animation: fill 0% → final (600ms easeOut), staggered 150ms

### Layout
- Above the fold: scheme name → gauge → stamp → "See the breakdown ↓"
- Below the fold: "ASSESSMENT BREAKDOWN" header → bars → summary → actions
- Content max-width: 640px centered
- Idle state: vertically centered in viewport

## Responsive Breakpoints

| Breakpoint | Gauge | Stamp | Chips |
|------------|-------|-------|-------|
| Mobile (<640px) | 280px | 16px text | 3 rows |
| Tablet (640-1024px) | 360px | 20px text | 1 row |
| Desktop (>1024px) | 400px | 24px text | 1 row |

## Accessibility

- Gauge: `role="meter"` with aria-valuenow/min/max
- Stamp: aria-hidden (decorative), verdict text in sr-only span
- Bars: `role="meter"` with aria-valuenow and aria-label
- Keyboard: Tab → chips → button. Enter = analyze. Escape = reset.
- Contrast: WCAG AAA primary text, WCAG AA verdict colors
- Touch: 44px+ targets. Button 96px+. Chips 40px height.
- Motion: `prefers-reduced-motion` skips all animations

## Themed Error States

- Not a Scheme: "That doesn't look like a government scheme."
- Error: "The Bureaucracy is Overwhelmed" + "Your request got lost in the paperwork."
- Rate Limited: "Too Many RTIs Filed" + "You've overwhelmed the system."
