"use client";

export type EntryPreview = { id: string; title: string; topic: string; youtubeId: string };

let pending: EntryPreview | null = null;
export const entryPreview = {
  set: (p: EntryPreview | null) => void (pending = p),
  get: (id: string | undefined) => (id && pending?.id === id ? pending : null),
};

// Continue the skeleton animation when the real window mounts to avoid a second pop.
let handover: { shownAt: number; hiddenAt: number; desktop: boolean } | null = null;
export const skeletonHandover = {
  hidden: (shownAt: number, desktop: boolean) => void (handover = { shownAt, hiddenAt: performance.now(), desktop }),
  /** Elapsed animation milliseconds, or null if no skeleton was just replaced. */
  take(desktop: boolean): number | null {
    const h = handover;
    handover = null;
    if (!h || h.desktop !== desktop || performance.now() - h.hiddenAt > 120) return null;
    return h.hiddenAt - h.shownAt;
  },
};

export const OPEN_DESKTOP: [Keyframe[], KeyframeAnimationOptions] = [[{ transform: "scale(0.9)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,.9,.3,1)" }];
export const OPEN_SHEET: [Keyframe[], KeyframeAnimationOptions] = [[{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 500, easing: "cubic-bezier(.32,.72,0,1)" }];
