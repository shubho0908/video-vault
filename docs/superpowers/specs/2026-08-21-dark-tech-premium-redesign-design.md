# Dark-Tech Premium UI Redesign — Design Doc

Date: 2026-08-21 · Branch: `redesign/premium-ui`

## Goal

Revamp the entire Shubhojeet's Videos UI from a "quiet editorial workspace" into a **dark-tech premium** product interface (Linear/Vercel family): near-black layered surfaces, one restrained accent, crisp sans typography, hairline borders, tinted shadows, subtle texture, and precise micro-motion. All existing logic, data flow, and routes stay untouched.

## Decisions (approved)

- Direction: dark-tech premium.
- Theming: dark is the flagship; the light/dark toggle stays and both themes are redesigned to the same bar.
- Motion: subtle and precise — hover lifts, focus glows, press feedback, staggered page-load fade-ups, dialog transitions. No scroll-jacking, no ambient loops.
- Type: all-sans identity (Geist + Geist Mono via `next/font`). Newsreader serif survives only inside rendered note content (`.markdown-body` headings) for reading comfort.

## Design System

### Color

Single accent: electric indigo-blue (oklch hue ~262), saturation held below the "AI purple" line. Neutral family: cool blue-charcoal (hue ~265), one gray family only.

- Dark (flagship): background `oklch(0.155 0.014 265)`, card `oklch(0.19 0.015 265)`, popover elevated, hairline borders (`oklch(0.27 0.016 265)`), accent `oklch(0.62 0.15 262)`. Never pure `#000`.
- Light: cool zinc — background `oklch(0.985 0.002 260)`, card white-ish, same accent darkened for AA contrast.

### Typography

- Display/UI: Geist Sans. Headlines `tracking-tight` to `tracking-tighter`, weights 500–600 (no thin-on-dark).
- Meta/numbers/dates: Geist Mono with `tabular-nums`.
- Note content: sans body; Newsreader serif reserved for `.markdown-body h1–h3`.

### Surfaces & depth

- Elevation = surface step + hairline border + tinted shadow (accent-hued, never pure black).
- Texture: fine dot-grid replaces paper-grid; a fixed radial ambient glow tints the top of each page; ultra-subtle grain overlay on a fixed `pointer-events-none` layer.
- Radius scale (locked): containers/cards `rounded-xl`, controls/buttons/inputs `rounded-lg`, chips/badges `rounded-md`. No mixed systems.

### Motion

- Global transition: 160–220ms `cubic-bezier(0.16, 1, 0.3, 1)` on color/shadow/transform.
- Press: `scale(0.97)` (exists). Hover lift on cards: `-translate-y-0.5` + shadow step.
- Page-load: CSS-only fade-up cascade utility (`.reveal` + delay steps), gated behind `prefers-reduced-motion: no-preference`.
- All motion honors reduced-motion.

## Scope (files)

1. `app/globals.css` — full token rewrite, dot-grid/glow/grain utilities, markdown restyle, themed scrollbar, selection.
2. `app/layout.tsx` — Geist/Geist Mono fonts, metadata template.
3. Primitives: `button.tsx` (primary glow shadow, refined variants), `input.tsx` (filled dark-visible field), `badge.tsx` (hairline chip), `card.tsx` (token alignment).
4. `journal-shell.tsx` — command-bar header: brand mark with glow ring, hairline blur bar, refined actions.
5. `sign-in/page.tsx` — glass card over ambient glow, tightened copy hierarchy.
6. Dashboard: `dashboard/page.tsx` (hero + mono stat blocks), `dashboard-entry-collection.tsx` (grid cards + divided list rows), `dashboard-filter.tsx` polish, new `loading.tsx` skeleton.
7. Entry detail `[entryId]/page.tsx` (+ `loading.tsx`), `notes-composer.tsx`, edit/new pages, `entry-form.tsx`, `image-panel.tsx`.
8. New: `not-found.tsx` (branded 404), `app/icon.svg` (vault mark favicon).
9. `DESIGN.md` rewritten to the new standard.

## Non-goals

No route/data changes, no new dependencies beyond fonts already on Google Fonts, no icon-library swap (lucide stays — project depends on it), no marketing pages.

## Verification

- `bun run check` (tsc) and `bun run test` pass.
- Dev-server visual pass of every surface in both themes at desktop + mobile widths.
