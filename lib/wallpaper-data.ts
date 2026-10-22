export type WallKind = "mac" | "ios";
export type Wall = { id: string; name: string; tint?: readonly [string, string] };

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

export const WALL_SIZES = {
  mac: { small: 1280, large: 2048, minWidth: 1500, minDpr: 1.5 },
  ios: { small: 645, large: 1290, minWidth: 500, minDpr: 1.5 },
} as const;

export const WALL_STORAGE_PREFIX = "shubhojeets-videos:wallpaper:";
export const wallStorageKey = (k: WallKind) => `${WALL_STORAGE_PREFIX}${k}`;
export const wallTintKey = (k: WallKind) => `${WALL_STORAGE_PREFIX}tint:${k}`;
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

export function wallCss(url: string, tint?: readonly [string, string]) {
  return `url(${url}) center / cover no-repeat` + (tint ? `, linear-gradient(135deg, ${tint[0]}, ${tint[1]})` : "");
}
