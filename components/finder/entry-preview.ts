"use client";

/**
 * What the Finder already knows about the entry the user just opened. The loading skeleton uses it
 * to paint the real title and video poster on the first frame, before the server answers; the entry
 * window then replaces the skeleton in place.
 */
export type EntryPreview = { id: string; title: string; topic: string; youtubeId: string };

let pending: EntryPreview | null = null;
export const entryPreview = {
  set: (p: EntryPreview | null) => void (pending = p),
  get: (id: string | undefined) => (id && pending?.id === id ? pending : null),
};

/**
 * Hand-over between the loading skeleton and the real entry window. The skeleton records when it
 * started its open animation; the window, mounted in the same commit that removes the skeleton,
 * continues that animation from where it was instead of starting it again (no double pop).
 */
let handover: { shownAt: number; hiddenAt: number; desktop: boolean } | null = null;
export const skeletonHandover = {
  hidden: (shownAt: number, desktop: boolean) => void (handover = { shownAt, hiddenAt: performance.now(), desktop }),
  /** ms the skeleton animation already ran, or null when no skeleton was just replaced. */
  take(desktop: boolean): number | null {
    const h = handover;
    handover = null;
    if (!h || h.desktop !== desktop || performance.now() - h.hiddenAt > 120) return null;
    return h.hiddenAt - h.shownAt;
  },
};

/** Open animations shared by the skeleton and the entry window (macOS window pop, iOS sheet rise). */
export const OPEN_DESKTOP: [Keyframe[], KeyframeAnimationOptions] = [[{ transform: "scale(0.9)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,.9,.3,1)" }];
export const OPEN_SHEET: [Keyframe[], KeyframeAnimationOptions] = [[{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 500, easing: "cubic-bezier(.32,.72,0,1)" }];
