# Shubhojeet's Videos Design Standard

The interface is a **dark-tech premium** product surface in the Linear/Vercel family. Dark is the flagship theme; a light theme shares the same hue family and quality bar, switchable from the header.

## Foundations

- **Color.** One cool blue-charcoal neutral family (oklch hue ~265) and one electric indigo-blue accent (hue ~262). Never pure black or pure white backgrounds; dark surfaces step up in lightness for elevation (`background → card → popover`). Accent saturation stays restrained; it appears on primary actions, focus rings, key labels, and ambient glow — nowhere else.
- **Type.** Geist Sans for all UI and display (semibold headlines, tight tracking). Geist Mono with tabular figures for dates, counts, metadata, and inline code. Newsreader serif survives only inside rendered note content headings (`.markdown-body h1–h3`).
- **Surfaces & depth.** Elevation = surface step + hairline border + tinted shadow (`glow-primary` for accent-tinted elevation, `hairline-top` for inner edge light). Texture comes from a fine dot grid, a fixed radial ambient glow at the top of each page, and an ultra-subtle grain overlay on a fixed pointer-events-none layer.
- **Radius scale (locked).** Containers/cards `rounded-xl`, controls/buttons/inputs `rounded-lg`, chips/badges `rounded-md`. No mixed systems.
- **Motion.** Subtle and precise: 170–220ms `cubic-bezier(0.16, 1, 0.3, 1)` transitions, press scale(0.97), hover lifts on cards, CSS-only staggered fade-up on page load (`.reveal` utilities). Everything collapses under `prefers-reduced-motion`.

## Implementation rules

- shadcn/ui primitives remain the only interactive/structural components; they are themed through the token layer in `app/globals.css`.
- Every state is designed: hover, active, keyboard focus ring, loading skeletons (`loading.tsx`), empty states, inline error messages, destructive confirmation dialogs.
- Labels sit above inputs; helper text below; errors are inline, never alerts.
- Dates and numbers render in mono with `tabular-nums` (`.tnum`).
- The dashboard favors an asymmetric hero with inline stat blocks, real data-driven cards, and a divided-row list view alternative.
- Avoided: generic three-card marketing grids, AI-purple gradients, decorative status indicators, artificial dashboard mockups, prominent gradients, borders on every list row, serif display type outside note content.

## References

- Taste Skill documentation, accessed 2026-08-18: https://www.tasteskill.dev/docs
- Redesign audit skill: `.agents/skills/redesign-existing-projects`
