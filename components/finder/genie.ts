/**
 * Genie effect: the window is cut into horizontal bands. Each band is a clone of the window
 * mapped with its own projective matrix3d onto a slice of the funnel trapezoid (top edge and
 * bottom edge of the band land on the shared edges of its neighbours, so no gaps), bottom
 * bands first. Transform-only animation; the real window is hidden while it runs.
 *
 * Cost control (every band is a full DOM copy, so the copy must be as small as possible):
 * - The template is flattened once: textareas become plain divs, iframes become their poster
 *   image, scroll containers become overflow:hidden with their scroll offset baked in.
 * - Anything a scroll container clips away (off-screen tiles, long notes) is dropped from the
 *   template, so a 500-video library copies only the ~40 tiles that are actually visible.
 * - Bands are attached to a hidden overlay a few per frame, so style and layout for the copies is
 *   spread over several frames instead of landing in the frame the animation starts.
 * - Blurs, animations and transitions inside the copy are switched off by the .fx-genie-clone
 *   rules in finder.css, so no per-element style read is needed for them.
 */
import { getYouTubeThumbnail } from "@/lib/youtube";

const STEPS = 30;
const CHUNK = 6;
const LAG = 0.55;
const OVERLAP = 3;
/** Content within this many px of a band still goes into it (covers box-shadows such as the thumbnails'). */
const BAND_MARGIN = 14;
/** Target band height in px. Fewer, taller bands keep the copy count down on small windows. */
const BAND_PX = 30;
const MIN_BANDS = 14;
const MAX_BANDS = 24;

/** Below half a colour step (1/255): the copies are painted and kept, but cannot change a single pixel. */
const GHOST = "0.002";
/** Fraction of the minimize at which the Dock thumbnail starts fading in under the arriving genie. */
const LAND_AT = 0.78;

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const nextFrame = () => new Promise<void>(res => requestAnimationFrame(() => res()));

/** progress of band t (0 top .. 1 bottom) when the whole effect is at p */
const band = (t: number, p: number) => clamp01(p * (1 + LAG) - (1 - t) * LAG);

type Pt = [number, number];
type Box = { l: number; t: number; r: number; b: number };

/** matrix3d (CSS, column-major) mapping the rect (0,0,w,h) onto quad [tl,tr,br,bl] */
function quadMatrix(w: number, h: number, q: [Pt, Pt, Pt, Pt]): string {
  const src: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // gaussian elimination
  for (let c = 0; c < 8; c++) {
    let m = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
    [A[c], A[m]] = [A[m], A[c]];
    [b[c], b[m]] = [b[m], b[c]];
    const d = A[c][c] || 1e-9;
    for (let r = c + 1; r < 8; r++) {
      const f = A[r][c] / d;
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array<number>(8).fill(0);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 8; k++) s -= A[r][k] * x[k];
    x[r] = s / (A[r][r] || 1e-9);
  }
  const [a, bb, c, d, e, f, g, h2] = x;
  return `matrix3d(${a},${d},0,${g},${bb},${e},0,${h2},0,0,1,0,${c},${f},0,1)`;
}

/**
 * Geometry of each kept template element (viewport px at snapshot time). `solid`: a box whose content
 * never paints outside it, so a band that does not cross it can replace it with an empty box.
 */
type Geom = { t: number; b: number; w: number; h: number; solid: boolean };
const geom = new WeakMap<Element, Geom>();

/** Keep the element's box (so nothing after it moves) but drop all of its content. */
function hollow(el: HTMLElement, w: number, h: number) {
  el.replaceChildren();
  Object.assign(el.style, { width: `${w}px`, height: `${h}px`, minWidth: "0", minHeight: "0", flex: "none", visibility: "hidden" });
}

const overlaps = (r: DOMRect, c: Box) => r.right > c.l && r.left < c.r && r.bottom > c.t && r.top < c.b;

/** Element can scroll (cheap geometry test first, computed style only for real candidates). */
function scrolls(o: HTMLElement): boolean {
  if (o.scrollHeight <= o.clientHeight + 1 && o.scrollWidth <= o.clientWidth + 1) return false;
  const cs = getComputedStyle(o);
  return /(auto|scroll)/.test(cs.overflowY + cs.overflowX);
}

function flattenTextarea(o: HTMLTextAreaElement, c: HTMLElement): HTMLElement {
  const cs = getComputedStyle(o);
  const d = document.createElement("div");
  const inner = document.createElement("div");
  inner.textContent = o.value;
  inner.style.cssText = `white-space:pre-wrap;overflow-wrap:break-word;transform:translateY(${-o.scrollTop}px);`;
  d.appendChild(inner);
  d.className = c.className;
  d.setAttribute("style", c.getAttribute("style") || "");
  Object.assign(d.style, {
    boxSizing: cs.boxSizing, width: cs.width, height: cs.height, padding: cs.padding, margin: cs.margin,
    font: cs.font, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, color: cs.color,
    background: cs.background, border: cs.border, borderRadius: cs.borderRadius, overflow: "hidden",
    display: cs.display === "inline" ? "block" : cs.display, flex: cs.flex,
  });
  c.replaceWith(d);
  return d;
}

function flattenIframe(o: HTMLIFrameElement, c: HTMLElement): HTMLElement {
  // An iframe cannot be cloned with its picture (and a copied player would load and autoplay a second video).
  // Use the video thumbnail so the copy shows the video area, not a black box.
  const id = /\/embed\/([\w-]{6,})/.exec(o.src)?.[1];
  const r = o.getBoundingClientRect();
  const img = document.createElement("img");
  if (id) img.src = getYouTubeThumbnail(id);
  img.alt = "";
  img.dataset.genieThumb = "1";
  img.className = c.className;
  img.setAttribute("style", c.getAttribute("style") || "");
  Object.assign(img.style, { width: `${r.width}px`, height: `${r.height}px`, objectFit: "cover", display: "block", visibility: id ? "inherit" : "hidden", background: "#000" });
  c.replaceWith(img);
  return img;
}

const record = (el: Element, r: DOMRect, solid: boolean) => geom.set(el, { t: r.top, b: r.bottom, w: r.width, h: r.height, solid });

/** Walk original and copy in step, dropping what the nearest scroll container clips away. */
function walk(o: Element, c: Element, clip: Box) {
  const oc = o.children, cc = Array.from(c.children);
  for (let i = 0; i < oc.length; i++) {
    const a = oc[i] as HTMLElement, b = cc[i] as HTMLElement | undefined;
    if (!b) continue;
    if (a instanceof HTMLTextAreaElement) { record(flattenTextarea(a, b), a.getBoundingClientRect(), true); continue; }
    if (a instanceof HTMLIFrameElement) { record(flattenIframe(a, b), a.getBoundingClientRect(), true); continue; }
    if (a instanceof HTMLVideoElement) { b.style.visibility = "hidden"; continue; }
    if (a instanceof HTMLImageElement && b instanceof HTMLImageElement) {
      // lazy copies inside clipped bands may never be considered "visible"; they are cached, so paint them now
      b.loading = "eager";
      b.decoding = "sync";
    }
    const r = a.getBoundingClientRect();
    const display = getComputedStyle(a).display;
    const solid = !!(r.width || r.height) && display !== "inline" && display !== "contents" && a.scrollHeight <= a.clientHeight + 1 && a.scrollWidth <= a.clientWidth + 1;
    // Fully clipped by a scroll container (or outside the window): keep an empty box of the same size so
    // everything after it stays exactly where it was, but copy none of its content.
    if (solid && !overlaps(r, clip)) {
      hollow(b, r.width, r.height);
      continue;
    }
    record(b, r, solid);
    let inner = clip;
    if (a instanceof HTMLElement && scrolls(a)) {
      b.style.overflow = "hidden";
      const sx = a.scrollLeft, sy = a.scrollTop;
      // a clone always starts scrolled to the top: bake the scroll offset into its children
      if (sx || sy) {
        const kids = Array.from(b.children) as HTMLElement[];
        Array.from(a.children).forEach((ok, n) => {
          if (kids[n] && getComputedStyle(ok).translate === "none") kids[n].style.translate = `${-sx}px ${-sy}px`;
        });
      }
      inner = { l: Math.max(clip.l, r.left), t: Math.max(clip.t, r.top), r: Math.min(clip.r, r.right), b: Math.min(clip.b, r.bottom) };
    }
    walk(a, b, inner);
  }
}

/**
 * A flat, static, cheap copy of a window: the genie bands and the Dock thumbnail are made from it.
 * Sized to the window's current box, positioned at 0,0.
 */
export function snapshotWindow(el: HTMLElement): HTMLElement | null {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const tpl = el.cloneNode(true) as HTMLElement;
  tpl.classList.add("fx-genie-clone");
  tpl.removeAttribute("id");
  tpl.removeAttribute("role");
  tpl.setAttribute("aria-hidden", "true");
  tpl.setAttribute("inert", "");
  walk(el, tpl, { l: r.left, t: r.top, r: r.right, b: r.bottom });
  tpl.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
  // invisible resize handles sit on top of the content: in a copy they only add overlap layers
  tpl.querySelectorAll(".fx-rz").forEach(n => n.remove());
  // visibility inherits from the overlay, so a hidden (minimized) window still copies as visible; the Dock thumbnail sets its own
  Object.assign(tpl.style, { position: "absolute", left: "0", top: "0", width: `${r.width}px`, height: `${r.height}px`, translate: "none", transform: "none", opacity: "1", visibility: "inherit", margin: "0", zIndex: "auto", pointerEvents: "none" });
  return tpl;
}

/** Fit a snapshot into a Dock thumbnail box (scaled, centred, never reflowed). */
export function fitThumb(thumb: HTMLElement, boxW: number, boxH: number) {
  const w = parseFloat(thumb.style.width) || boxW, h = parseFloat(thumb.style.height) || boxH;
  const s = Math.min(boxW / w, boxH / h);
  Object.assign(thumb.style, { position: "absolute", left: `${(boxW - w * s) / 2}px`, top: `${(boxH - h * s) / 2}px`, transform: `scale(${s})`, transformOrigin: "0 0", visibility: "visible", opacity: "1", pointerEvents: "none" });
}

/**
 * Copy of the template for one band: elements entirely above or below the band's strip become empty
 * boxes of their exact size. Each band then styles, lays out and paints only what it can show (about
 * 1/24 of the window) instead of a whole window, which keeps the build to a few cheap frames.
 */
export function cloneBand(src: Element, y0: number, y1: number): Element {
  const c = src.cloneNode(false) as Element;
  for (let n = src.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) {
      c.appendChild(n.cloneNode(true));
      continue;
    }
    const g = geom.get(n as Element);
    if (g?.solid && (g.b <= y0 || g.t >= y1)) {
      const h = (n as Element).cloneNode(false) as HTMLElement;
      hollow(h, g.w, g.h);
      c.appendChild(h);
    } else c.appendChild(cloneBand(n as Element, y0, y1));
  }
  return c;
}

/** Genies on their way into the Dock, so they can follow their slot if the centred Dock moves. */
type Flight = { overlay: HTMLElement; slotEl: () => HTMLElement | null; cx: number; end: number; dx: number };
const flying = new Set<Flight>();

/**
 * The Dock is centred, so a slot appearing or leaving moves every other slot. A genie already in flight
 * aims at where its slot was; shift it (the whole overlay, on the compositor) to where its slot settles,
 * over the time it has left, so it still lands exactly in its thumbnail.
 */
export function retargetGenies() {
  const now = performance.now();
  for (const f of flying) {
    const el = f.slotEl();
    const remaining = f.end - now;
    if (!el?.isConnected || remaining < 16) continue;
    const r = settledRect(el);
    const dx = r.left + r.width / 2 - f.cx;
    if (Math.abs(dx - f.dx) < 0.5) continue;
    const from = getComputedStyle(f.overlay).transform;
    for (const a of f.overlay.getAnimations()) a.cancel();
    f.dx = dx;
    f.overlay.animate([{ transform: from === "none" ? "translateX(0px)" : from }, { transform: `translateX(${dx}px)` }], { duration: remaining, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  }
}

export type Genie = {
  /** Run the effect towards (in) or out of the Dock slot. The window is handed over to the copies in one frame. */
  play(slot: DOMRect, dir: "in" | "out", duration: number, onLand?: () => void, slotEl?: () => HTMLElement | null): Promise<void>;
  /** Drop the prepared bands without animating. */
  cancel(): void;
};

/**
 * Build the band copies (a few per frame) and resolve once they are laid out AND painted, so the first
 * animation frame has nothing left to do but composite.
 *
 * Why the copies sit on screen at a ghost opacity instead of being hidden while they are prepared:
 * browsers do not paint hidden layers. If the bands only became visible in the frame they start moving,
 * Chrome composites the animation before its raster workers are done and draws the unpainted tiles as
 * holes (the window breaks into strips with the wallpaper showing through), and Safari paints all of
 * them inside that first frame (a hitch). At opacity 0.002 every band is painted during the warm-up
 * frames while the screen stays pixel-identical; switching the overlay to opacity 1 later is a
 * compositor-only change that reuses those tiles. Start this before the Dock slot is measured: the
 * build overlaps with the Dock making room.
 */
export async function prepareGenie(el: HTMLElement, tpl?: HTMLElement | null): Promise<Genie | null> {
  const r = el.getBoundingClientRect();
  const host = el.parentElement;
  const t = tpl ?? snapshotWindow(el);
  if (!host || !t || !r.width || !r.height) return null;
  const N = Math.max(MIN_BANDS, Math.min(MAX_BANDS, Math.round(r.height / BAND_PX)));
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:35;opacity:${GHOST};contain:layout style;`;
  host.appendChild(overlay);
  // let the poster thumbnail decode (briefly) so the first frame shows it, not the black player background
  const pics = Array.from(t.querySelectorAll<HTMLImageElement>("img[data-genie-thumb]"));
  const decoded = pics.length ? Promise.race([Promise.all(pics.map(p => p.decode().catch(() => undefined))), new Promise(res => setTimeout(res, 150))]) : null;
  const sh = r.height / N;
  const bands: HTMLElement[] = [];
  for (let i = 0; i < N; i++) {
    const b = document.createElement("div");
    b.style.cssText = `position:absolute;left:${r.left}px;top:${r.top + i * sh}px;width:${r.width}px;height:${sh + OVERLAP}px;overflow:hidden;will-change:transform,opacity;transform-origin:0 0;contain:strict;`;
    // a margin either side so shadows and anti-aliased edges of boxes just outside the strip still paint
    const clone = cloneBand(t, r.top + i * sh - BAND_MARGIN, r.top + (i + 1) * sh + OVERLAP + BAND_MARGIN) as HTMLElement;
    clone.style.top = `${-i * sh}px`;
    b.appendChild(clone);
    overlay.appendChild(b);
    bands.push(b);
    // each frame lays out and paints only its own few copies
    if ((i + 1) % CHUNK === 0 && i < N - 1) await nextFrame();
  }
  if (decoded) await decoded;
  await nextFrame();
  let done = false;
  const restoreEl = () => {
    el.style.opacity = "";
    el.style.pointerEvents = "";
  };
  const cancel = () => {
    done = true;
    overlay.remove();
    restoreEl();
  };

  return {
    cancel,
    async play(target, dir, duration, onLand, slotEl) {
      if (done) return;
      // aim at where the slot is now (settled), not where it was when the minimize began
      const live = dir === "in" ? slotEl?.() : null;
      const slot = live?.isConnected ? settledRect(live) : target;
      // follow the slot from now on (a neighbour may appear before the first frame of motion)
      const flight: Flight | null = dir === "in" && slotEl ? { overlay, slotEl, cx: slot.left + slot.width / 2, end: performance.now() + duration, dx: 0 } : null;
      if (flight) flying.add(flight);
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cxr = r.left + r.width / 2, cxs = slot.left + slot.width / 2;
      const anims: Animation[] = [];
      // Arm: every keyframe is computed, parsed and applied (paused at its first frame) while the overlay
      // is still a ghost, so the frame that starts the motion does no style, layout or paint work at all.
      for (let i = 0; i < N; i++) {
        const bandH = sh + OVERLAP;
        const u0 = i / N, u1 = (i + 1) / N + OVERLAP / r.height;
        const frames: Keyframe[] = [];
        for (let k = 0; k <= STEPS; k++) {
          const time = k / STEPS;
          const p = dir === "in" ? ease(time) : 1 - ease(time);
          // top/bottom edge at source fraction u: y, centre x and half width, all continuous in u
          const edge = (u: number): [number, number, number] => {
            const q = band(u, p);
            const y = lerp(r.top + u * r.height, slot.top + u * slot.height, ease(q));
            const ex = ease(clamp01(q * 1.15 - 0.15 * (1 - u))); // x follows a little behind: curved sides
            const cx = lerp(cxr, cxs, ex);
            const hw = lerp(r.width, slot.width, ease(q)) / 2;
            return [y, cx - hw, cx + hw];
          };
          const [yt, lt, rt] = edge(u0), [yb, lb, rb] = edge(u1);
          const oy = r.top + i * sh;
          const m = quadMatrix(r.width, bandH, [[lt - r.left, yt - oy], [rt - r.left, yt - oy], [rb - r.left, yb - oy], [lb - r.left, yb - oy]]);
          // never fully 0: a fully transparent layer may drop its painted tiles, a ghost one keeps them
          frames.push({ transform: m, offset: time, opacity: p > 0.94 ? lerp(1, Number(GHOST), (p - 0.94) / 0.06) : 1 });
        }
        const a = bands[i].animate(frames, { duration: reduce ? 1 : duration, easing: "linear", fill: "both" });
        a.pause();
        anims.push(a);
      }
      if (dir === "out") {
        // the minimized window is visibility:hidden; make it paintable now (still invisible) so the end of
        // the animation only has to fade it in on the compositor
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.visibility = "";
      }
      // one frame for the armed (still invisible) state to be styled and committed
      await nextFrame();
      if (done) {
        if (flight) flying.delete(flight);
        return;
      }
      // Start: in one frame the copies become fully visible, the real window turns transparent (opacity is a
      // compositor change; visibility would repaint), and every band starts on the same timeline tick.
      overlay.style.opacity = "1";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      if (flight) flight.end = performance.now() + duration;
      for (const a of anims) a.play();
      // the Dock thumbnail fades in while the last of the window pours into it, like macOS (no empty slot)
      const land = onLand ? setTimeout(onLand, reduce ? 0 : duration * LAND_AT) : undefined;
      await Promise.all(anims.map(a => a.finished.then(() => undefined, () => undefined)));
      if (dir === "out") restoreEl();
      else el.style.visibility = "hidden";
      // one more frame so the real window is painted before the copies go away (no blink)
      await nextFrame();
      if (dir === "in") restoreEl();
      if (land !== undefined) clearTimeout(land), onLand?.();
      if (flight) flying.delete(flight);
      cancel();
    },
  };
}

/** Minimize step 1: snapshot (also the Dock thumbnail) and build the genie copies. */
export async function prepareMinimize(el: HTMLElement): Promise<{ genie: Genie | null; thumb: HTMLElement | null }> {
  const tpl = snapshotWindow(el);
  if (!tpl) return { genie: null, thumb: null };
  const thumb = tpl.cloneNode(true) as HTMLElement;
  return { genie: await prepareGenie(el, tpl), thumb };
}

/*
 * Speculative preparation. Building the copies takes a few frames; macOS starts the genie the instant
 * you click. So the copies are built (as invisible ghosts) while the pointer rests on the minimize
 * button or on the Dock thumbnail, and the click only has to start the motion. A preparation older
 * than WARM_MS is thrown away so a changed window is never shown stale.
 */
const WARM_MS = 2500;
type Minimized = { genie: Genie | null; thumb: HTMLElement | null };
type Warm<T> = { at: number; p: Promise<T>; stop: () => void };
const warmIn = new WeakMap<HTMLElement, Warm<Minimized>>();
const warmOut = new WeakMap<HTMLElement, Warm<Genie | null>>();

/**
 * A prepared copy is only valid while the window looks the same: any DOM change, typing (a textarea's
 * value is not a DOM mutation) or scrolling inside it drops the copy, and the click then builds a fresh one.
 */
function watch(el: HTMLElement, onChange: () => void): () => void {
  const mo = new MutationObserver(onChange);
  mo.observe(el, { subtree: true, childList: true, characterData: true, attributes: true });
  el.addEventListener("input", onChange, true);
  el.addEventListener("scroll", onChange, true);
  return () => {
    mo.disconnect();
    el.removeEventListener("input", onChange, true);
    el.removeEventListener("scroll", onChange, true);
  };
}

export function warmGenie(el: HTMLElement | null, dir: "in" | "out") {
  if (!el) return;
  const map = dir === "in" ? warmIn : warmOut;
  const w = map.get(el);
  if (w && performance.now() - w.at < WARM_MS) return;
  coolGenie(el, dir);
  // never leave ghost copies behind: expire (window closed by keyboard, pointer never left, …) or on any change
  if (dir === "in") {
    const entry: Warm<Minimized> = { at: performance.now(), p: prepareMinimize(el).catch(() => ({ genie: null, thumb: null })), stop: () => undefined };
    const drop = () => warmIn.get(el) === entry && coolGenie(el, "in");
    const unwatch = watch(el, drop);
    const timer = setTimeout(drop, WARM_MS + 100);
    entry.stop = () => (unwatch(), clearTimeout(timer));
    warmIn.set(el, entry);
  } else {
    const entry: Warm<Genie | null> = { at: performance.now(), p: prepareGenie(el).catch(() => null), stop: () => undefined };
    const drop = () => warmOut.get(el) === entry && coolGenie(el, "out");
    const unwatch = watch(el, drop);
    const timer = setTimeout(drop, WARM_MS + 100);
    entry.stop = () => (unwatch(), clearTimeout(timer));
    warmOut.set(el, entry);
  }
}

/** Pointer left without clicking: drop the ghost copies. */
export function coolGenie(el: HTMLElement | null, dir: "in" | "out") {
  if (!el) return;
  if (dir === "in") {
    const w = warmIn.get(el);
    warmIn.delete(el);
    w?.stop();
    void w?.p.then(r => r.genie?.cancel());
  } else {
    const w = warmOut.get(el);
    warmOut.delete(el);
    w?.stop();
    void w?.p.then(g => g?.cancel());
  }
}

/** The minimize preparation: the warm one when it is fresh, otherwise a new one. */
export function takeMinimize(el: HTMLElement): Promise<Minimized> {
  const w = warmIn.get(el);
  warmIn.delete(el);
  w?.stop();
  if (w && performance.now() - w.at < WARM_MS) return w.p;
  void w?.p.then(r => r.genie?.cancel());
  return prepareMinimize(el);
}

/** The restore preparation: the warm one when it is fresh, otherwise a new one. */
export function takeRestore(el: HTMLElement): Promise<Genie | null> {
  const w = warmOut.get(el);
  warmOut.delete(el);
  w?.stop();
  if (w && performance.now() - w.at < WARM_MS) return w.p;
  void w?.p.then(g => g?.cancel());
  return prepareGenie(el);
}

/**
 * Where a Dock slot will end up once every slot that is still growing or shrinking (itself included) has
 * settled (the Dock is centred, so any resize moves it). Those size animations are moved to 1 ms before
 * their end for the measurement and put back in the same task: nothing is painted in between, and none
 * of them finishes (no finish callbacks fire).
 */
export function settledRect(el: HTMLElement): DOMRect {
  const dock = el.closest(".fx-dock");
  const anims = dock
    ? dock.getAnimations({ subtree: true }).filter(a => {
        const t = (a.effect as KeyframeEffect | null)?.target;
        return a.playState === "running" && t instanceof HTMLElement && t.classList.contains("fx-dock-item");
      })
    : [];
  const saved = anims.map(a => a.currentTime);
  for (const a of anims) {
    const end = Number(a.effect?.getComputedTiming().endTime ?? 0);
    if (end > 1) a.currentTime = end - 1;
  }
  const r = el.getBoundingClientRect();
  anims.forEach((a, i) => (a.currentTime = saved[i]));
  return r;
}
