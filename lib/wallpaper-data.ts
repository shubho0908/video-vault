export type WallKind = "mac" | "ios";
/** tint: average colour of the top-left and bottom-right halves. Painted under the image until it arrives. */
export type Wall = { id: string; name: string; tint?: readonly [string, string] };

/**
 * Single source of truth for wallpapers. Adding one = drop `{kind}-{id}-{small}.webp` and
 * `{kind}-{id}-{large}.webp` into public/wp and add a line here (tint: `python3 scripts/wallpaper-tint.py`).
 * "default" follows the light/dark theme through CSS (Tahoe on macOS, iOS 26 on iOS).
 * Nothing here is inlined per wallpaper into CSS or HTML, so cost does not grow with the list.
 */
export const WALLPAPERS: Record<WallKind, Wall[]> = {
  mac: [
    { id: "default", name: "Tahoe" },
    { id: "sequoia-light", name: "Sequoia Light", tint: ["#6571a3", "#ae868a"] },
    { id: "sequoia-dark", name: "Sequoia Dark", tint: ["#2853b8", "#2179c2"] },
    { id: "sonoma-light", name: "Sonoma Light", tint: ["#a87b8c", "#79af27"] },
    { id: "sonoma-dark", name: "Sonoma Dark", tint: ["#40548c", "#388746"] },
  ],
  ios: [
    { id: "default", name: "iOS 26" },
    { id: "rose", name: "Rose", tint: ["#ebafa9", "#0f2b40"] },
    { id: "ember", name: "Ember", tint: ["#5e3232", "#041014"] },
    { id: "gold", name: "Gold", tint: ["#f0c582", "#0f2a3e"] },
    { id: "sky", name: "Sky", tint: ["#7ebfeb", "#05113a"] },
    { id: "orchid", name: "Orchid", tint: ["#d18ab5", "#0f093c"] },
  ],
};

/** The one place the image-size rule lives. The large file is used at >= minWidth px wide OR >= minDpr pixel density. */
export const WALL_SIZES = {
  mac: { small: 1280, large: 2048, minWidth: 1500, minDpr: 1.5 },
  ios: { small: 645, large: 1290, minWidth: 500, minDpr: 1.5 },
} as const;

export const WALL_STORAGE_PREFIX = "shubhojeets-videos:wallpaper:";
export const wallStorageKey = (k: WallKind) => `${WALL_STORAGE_PREFIX}${k}`;
export const wallTintKey = (k: WallKind) => `${WALL_STORAGE_PREFIX}tint:${k}`;
/** Attribute on <html> that finder.css keys off; the matching --fx-wall-{kind} custom property carries the image. */
export const WALL_ATTR_PREFIX = "data-wall-";
export const wallAttr = (k: WallKind) => `${WALL_ATTR_PREFIX}${k}`;
export const DESKTOP_QUERY = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

export const isWallId = (k: WallKind, id: string | null | undefined): id is string =>
  !!id && WALLPAPERS[k].some(w => w.id === id);

export function wallUrl(k: WallKind, id: string, width: number, dpr: number): string | null {
  if (id === "default") return null;
  const s = WALL_SIZES[k];
  return `/wp/${k}-${id}-${width >= s.minWidth || dpr >= s.minDpr ? s.large : s.small}.webp`;
}

/** Exactly what goes into --fx-wall-{kind}. The boot script builds the same string from what it finds in localStorage. */
export function wallCss(url: string, tint?: readonly [string, string]) {
  return `url(${url}) center / cover no-repeat` + (tint ? `, linear-gradient(135deg, ${tint[0]}, ${tint[1]})` : "");
}
