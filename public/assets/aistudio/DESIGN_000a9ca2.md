---
name: Mega Bajar Editorial Market
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3f493f'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#006d30'
  primary: '#00652c'
  on-primary: '#ffffff'
  primary-container: '#15803d'
  on-primary-container: '#d3ffd5'
  inverse-primary: '#79db8d'
  secondary: '#a73a00'
  on-secondary: '#ffffff'
  secondary-container: '#fd651e'
  on-secondary-container: '#571a00'
  tertiary: '#00652b'
  on-tertiary: '#ffffff'
  tertiary-container: '#008138'
  on-tertiary-container: '#d5ffd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#95f8a7'
  primary-fixed-dim: '#79db8d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb599'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#7f2b00'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
  surface-mint: '#F0FDF4'
  surface-cream: '#F8FAFC'
  accent-amber: '#F59E0B'
  accent-bright-orange: '#F97316'
  tag-discount-bg: '#FEF2F2'
  tag-discount-text: '#DC2626'
  border-subtle: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Epilogue
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Manrope
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
  price-headline:
    fontFamily: Epilogue
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system defines a premium, contemporary multi-vendor e-commerce platform and digital grocery marketplace tailored for Bengali regional commerce. The brand personality conveys freshness, daily harvest authenticity, reliability, and community-centric vitality. 

The design combines an elevated organic-market editorial style with rapid mobile utility. High-contrast botanical forest greens pair with vibrant orchard amber accents against ultra-clean, warm-white and mint-tinted surfaces. Clear visual hierarchies celebrate farm-fresh produce and daily household goods without visual noise, instilling total trust, effortless navigation, and swift, frictionless conversion.

## Colors

The palette balances agriculture, vibrancy, and crisp digital commerce clarity:

- **Primary Green (`#15803D`)**: Anchors core interactions, active tab selections, primary CTA buttons, and header trust badges. Represents farm vitality, garden produce, and transactional security.
- **Secondary Amber/Orange (`#EA580C`)**: Drives urgent visual cues—flash deals, "Order Now" quick triggers, delivery status highlights, and promotional ribbon counters.
- **Tertiary Growth Green (`#22C55E`)**: Used for secondary success actions, instant 'In Stock' statuses, and quick add-to-cart badges.
- **Neutral Slate (`#1E293B`)**: Formats high-contrast body typography, ensuring clear legibility across both Latin and Bengali type scripts.
- **Surface Foundations**: High-purity white (`#FFFFFF`) forms individual product cards, layered across soft mint tints (`#F0FDF4`) and neutral backgrounds (`#F8FAFC`) to reduce eye fatigue during long browsing sessions.

## Typography

Typography pairs the structural, editorial quality of **Epilogue** for merchandising banners, section headers, and promotional numbers with the balanced, modern rhythm of **Manrope** for inventory descriptions, metadata, and controls.

For Bengali language localization, configure `Hind Siliguri` and `Noto Sans Bengali` as system-level fallbacks. Ensure line-heights for body levels remain generous (minimum 1.45x) to accommodate conjunct characters and vowel matras without vertical clipping.

## Layout & Spacing

The layout is built for a compact, thumb-driven mobile commerce experience:

- **Mobile Viewport**: Standard 4-column fluid layout with an outer canvas `margin` of `1rem` (16px) and internal card grid `gutter` of `0.75rem` (12px). Product feeds use a 2-column card arrangement to optimize density and tap accuracy.
- **Tablet / Desktop Viewport**: Scales to an 8-column and 12-column grid system respectively, capping max content width at 1200px centered.
- **Rhythm**: Element padding and stack distances strictly leverage `0.25rem` (4px) increments. Horizontal item carousels expose a 20% peek of the trailing item to visually indicate swipe affordance.

## Elevation & Depth

Visual hierarchy uses clean tonal surfaces combined with soft, vegetable-tinted ambient shadows rather than heavy skeuomorphism:

- **Level 0 (Flat Surface)**: Used for base canvasing (`#F8FAFC` and `#F0FDF4`). Borderless or bounded with 1px hairline `#E2E8F0`.
- **Level 1 (Cards & Tile Surfaces)**: `#FFFFFF` containers styled with an ambient drop: `0px 2px 8px rgba(21, 128, 61, 0.04), 0px 1px 2px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Dropdowns, Flyouts, Quick Cart Floats)**: `0px 8px 24px rgba(15, 23, 42, 0.08), 0px 2px 6px rgba(21, 128, 61, 0.06)`.
- **Level 3 (Fixed Navigation Bar & Bottom Sticky Sheet)**: Elevated with a top-directed ambient diffusion: `0px -4px 16px rgba(15, 23, 42, 0.06)`.

## Shapes

The interface embraces a unified soft geometry (`roundedness: 1`):

- **Cards & Containers**: Standard border radius of `0.25rem` (4px) to `0.5rem` (8px for larger cards), creating crisp, modern product frames.
- **Buttons & Interactive Tags**: Action controls such as "Add to Cart" and discount tags use pill geometries (`9999px`) to invite thumb interaction and contrast against the rectangular product grid.
- **Category Avatars**: Circular frames (`50%` radius) highlighted with thin `#E2E8F0` outlines or subtle mint fills to frame food and grocery categories.

## Components

### Buttons
- **Primary Action (Quick Buy / Checkout)**: Full-bleed or pill buttons filled with `#15803D`, high-contrast `#FFFFFF` text, active state darkening to `#166534`.
- **Secondary Action (Hot Deal / Call-to-Order)**: Accent fill `#EA580C`, providing immediate visual hierarchy over routine shopping flows.
- **Add to Cart (Card Level)**: Pill-shaped, semi-outlined or soft mint surface button (`#F0FDF4`) with `#15803D` text and a mini plus/cart icon. Upon tap, it transforms dynamically into a segmented counter (`-`, `qty`, `+`).

### Product Cards
- Contained white surface (`#FFFFFF`) bordered with `1px solid #E2E8F0`.
- Ratio-locked 1:1 image frame featuring a subtle heart/favorite icon in the top right.
- Visual hierarchy: Discount badge (`-15%`) top left -> Product title (Bengali/English bilingual) -> Unit weight (`1 kg`, `500 ml`) -> Price block (current green price + strikethrough original price) -> Pill Add Button.

### Category Circles
- Distinct 64x64px circular image container surrounded by an ultra-thin green ring on hover/active.
- Centered underneath is a concise 2-line category label in `label-sm` Manrope typography.

### Sticky Bottom Navigation
- Fixed navigation dock pinned to the mobile viewport base.
- Houses 4–5 core access points: Home, Categories, Offers, Cart (with numeric item badge), and Account.
- Features frosted white translucency (`backdrop-blur: 12px`, 92% opacity) bounded by a crisp top border.

### Search & Delivery Bar
- Top-mounted persistent search bar with a pill radius, soft drop shadow, and a prefix location pin denoting the active delivery region.