# EliteMath — Design System (P33)

## Color Palette

All colors are defined as CSS custom properties in `src/index.css` and as Tailwind extensions in `tailwind.config.js`.

### Brand — Coastal Dark (Primary Theme)
| Token | Value | Usage |
|-------|-------|-------|
| `--coastal-midnight` | `#07111D` | App background, deepest layer |
| `--coastal-ocean` | `#0F1D31` | Card backgrounds, panels |
| `--coastal-steel` | `#1F3350` | Borders, dividers |
| `--coastal-wave` | `#2F5F8F` | Secondary accents |
| `--coastal-neon` | `#61BDF8` | Primary interactive blue, focus rings |
| `--coastal-mist` | `#F4F2EB` | Primary text on dark |

### Brand — Verdant (Success/Progress)
| Token | Value | Usage |
|-------|-------|-------|
| `--verdant-accent` | `#45C6A7` | Success states, mastery 100% |
| `--verdant-gold` | `#D1B06F` | Achievements, premium indicators |
| `--verdant-luxe` | `#1C7F6A` | Hover secondary buttons |

### Semantic States
| Token | Value | Usage |
|-------|-------|-------|
| `--accent-coral` | `#FF7A59` | Error, danger, blocked state |
| `--accent-violet` | `#7D8CFF` | Premium, AI tutor highlights |
| `--accent-amber` | `#F4B04A` | Warning, "at risk" skill |

### Skill Mastery Colors (Tailwind classes)
| Range | Class | Color |
|-------|-------|-------|
| 100% | `text-emerald-600` / `bg-emerald-100` | `#059669` |
| 75-99% | `text-green-500` / `bg-green-100` | `#22C55E` |
| 50-74% | `text-amber-500` / `bg-amber-100` | `#F59E0B` |
| 1-49% | `text-rose-500` / `bg-rose-100` | `#EF4444` |
| 0% | `text-slate-400` / `bg-slate-100` | `#94A3B8` |

---

## Typography

Primary font: **Plus Jakarta Sans** (loaded from Google Fonts via `index.html`)
Fallbacks: `Sora, Manrope, Segoe UI, sans-serif`

| Scale | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-4xl` | 36px | 900 (Black) | 1.2 | Hero headings |
| `text-3xl` | 30px | 800 (ExtraBold) | 1.25 | Page titles |
| `text-2xl` | 24px | 700 (Bold) | 1.3 | Section headers |
| `text-xl` | 20px | 700 | 1.4 | Card titles |
| `text-lg` | 18px | 600 | 1.5 | Subheadings |
| `text-base` | 16px | 500 | 1.5 | Body copy |
| `text-sm` | 14px | 500 | 1.5 | Secondary text |
| `text-xs` | 12px | 700 | 1.4 | Labels, badges, caps |

Heading tracking: `letter-spacing: -0.02em` (tighter for premium feel)
Uppercase labels: `letter-spacing: +0.08em` (widest spacing, all-caps)

---

## Spacing Scale

Uses Tailwind's default 4px base scale. Key values:
- `p-2` = 8px (tight, inline elements)
- `p-4` = 16px (default padding)
- `p-6` = 24px (card internal padding)
- `p-8` = 32px (section/page padding)
- `gap-4` = 16px (default between components)

---

## Component Library

All reusable components live in `src/components/Common/`:

| Component | File | Description |
|-----------|------|-------------|
| `RippleButton` | `RippleButton.tsx` | Pressable button with Material ripple |
| `Tooltip` | `Tooltip.tsx` | Hover intent tooltip with arrow |
| `ValidatedInput` | `ValidatedInput.tsx` | Input with animated ✓/✗ state indicators |
| `EmptyState` | `EmptyState.tsx` | Illustrated empty content placeholder |
| `SkeletonLoader` | `SkeletonLoader.tsx` | Animated loading skeleton (card, text, profile) |
| `PageTransition` | `PageTransition.tsx` | Framer Motion fade/slide wrapper |
| `GlobalXPAnimation` | `GlobalXPAnimation.tsx` | Floating XP bounce notification |
| `Onboarding` | `Onboarding.tsx` | Multi-step first-use wizard |
| `ConnectionStatusBanner` | `ConnectionStatusBanner.tsx` | Online/offline status banner |
| `KeyboardShortcutsOverlay` | `KeyboardShortcutsOverlay.tsx` | Ctrl+? shortcut reference dialog |

---

## Motion & Animation Tokens

Defined in `src/index.css` as CSS variables:

| Token | Value | Usage |
|-------|-------|-------|
| `--motion-duration-fast` | `140ms` | Hover state transitions |
| `--motion-duration-base` | `260ms` | Default element transitions |
| `--motion-duration-slow` | `480ms` | Page-level transitions |
| `--motion-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Enter animations |
| `--motion-ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | State transitions |

Framer Motion presets used throughout the app:
- **Page transition**: `opacity 0→1`, `y: 16→0`, `duration: slow`
- **XP bounce**: Spring, `stiffness: 100`, `damping: 15`, scale `0.5→1.2`
- **Modal**: Scale `0.9→1`, spring `stiffness: 300, damping: 25`
- **Tooltip**: Scale `0.9→1`, `duration: 150ms`

---

## Accessibility Standards

Compliant with **WCAG 2.1 Level AA**:

- **Contrast ratio**: Minimum 4.5:1 for normal text. Coastal design achieves ~14.9:1 (white on midnight)
- **Focus rings**: All interactive elements get `box-shadow: 0 0 0 2px midnight, 0 0 0 4px neon` on `:focus-visible`
- **ARIA**: All buttons have `aria-label`, interactive landmarks have roles, AI chat has `aria-live="polite"`
- **Keyboard**: Full Tab navigation, Enter/Esc handled, all modals trap focus
- **Reduced motion**: `@media (prefers-reduced-motion)` disables all animations

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | ≥ 1024px | Full sidebar + content (supported) |
| Tablet | 768–1023px | Sidebar hidden, stack vertical (partial support) |
| Mobile | < 768px | NOT SUPPORTED — redirect message shown |
