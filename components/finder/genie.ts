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
const CHUNK = 4;
const LAG = 0.55;
const OVERLAP = 3;
/** Target band height in px. Fewer, taller bands keep the copy count down on small windows. */
const BAND_PX = 30;
const MIN_BANDS = 14;
const MAX_BANDS = 24;

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

const overlaps = (r: DOMRect, c: Box) => r.right > c.l && r.left < c.r && r.bottom > c.t && r.top < c.b;

/** Element can scroll (cheap geometry test first, computed style only for real candidates). */
function scrolls(o: HTMLElement): boolean {
  if (o.scrollHeight <= o.clientHeight + 1 && o.scrollWidth <= o.clientWidth + 1) return false;
  const cs = getComputedStyle(o);
  return /(auto|scroll)/.test(cs.overflowY + cs.overflowX);
}

function flattenTextarea(o: HTMLTextAreaElement, c: HTMLElement) {
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
}

function flattenIframe(o: HTMLIFrameElement, c: HTMLElement) {
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
}

/** Walk original and copy in step, dropping what the nearest scroll container clips away. */
function walk(o: Element, c: Element, clip: Box) {
  const oc = o.children, cc = Array.from(c.children);
  for (let i = 0; i < oc.length; i++) {
    const a = oc[i] as HTMLElement, b = cc[i] as HTMLElement | undefined;
    if (!b) continue;
    if (a instanceof HTMLTextAreaElement) { flattenTextarea(a, b); continue; }
    if (a instanceof HTMLIFrameElement) { flattenIframe(a, b); continue; }
    if (a instanceof HTMLVideoElement) { b.style.visibility = "hidden"; continue; }
    if (a instanceof HTMLImageElement && b instanceof HTMLImageElement) {
      // lazy copies inside clipped bands may never be considered "visible"; they are cached, so paint them now
      b.loading = "eager";
      b.decoding = "sync";
    }
    const r = a.getBoundingClientRect();
    // Fully clipped by a scroll container (or outside the window): keep an empty box of the same size so
    // everything after it stays exactly where it was, but copy none of its content.
    if ((r.width || r.height) && !overlaps(r, clip) && a.scrollHeight <= a.clientHeight + 1 && a.scrollWidth <= a.clientWidth + 1) {
      const display = getComputedStyle(a).display;
      if (display !== "inline" && display !== "contents") {
        b.replaceChildren();
        Object.assign(b.style, { width: `${r.width}px`, height: `${r.height}px`, minWidth: "0", minHeight: "0", flex: "none", visibility: "hidden" });
        continue;
      }
    }
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
  // visibility inherits: the copies stay hidden inside the hidden preparation overlay (the Dock thumbnail sets its own)
  Object.assign(tpl.style, { position: "absolute", left: "0", top: "0", width: `${r.width}px`, height: `${r.height}px`, translate: "none", transform: "none", opacity: "1", visibility: "inherit", margin: "0", zIndex: "auto", pointerEvents: "none" });
  return tpl;
}

/** Fit a snapshot into a Dock thumbnail box (scaled, centred, never reflowed). */
export function fitThumb(thumb: HTMLElement, boxW: number, boxH: number) {
  const w = parseFloat(thumb.style.width) || boxW, h = parseFloat(thumb.style.height) || boxH;
  const s = Math.min(boxW / w, boxH / h);
  Object.assign(thumb.style, { position: "absolute", left: `${(boxW - w * s) / 2}px`, top: `${(boxH - h * s) / 2}px`, transform: `scale(${s})`, transformOrigin: "0 0", visibility: "visible", opacity: "1", pointerEvents: "none" });
}

export type Genie = {
  /** Run the effect towards (in) or out of the Dock slot. Hides the window as the first frame shows. */
  play(slot: DOMRect, dir: "in" | "out", duration: number): Promise<void>;
  /** Drop the prepared bands without animating. */
  cancel(): void;
};

/**
 * Build the band copies off-screen (a few per frame) and resolve once they are laid out, so the
 * first animation frame has nothing left to do but composite. Start this before the Dock slot is
 * measured: the build overlaps with the Dock making room.
 */
export async function prepareGenie(el: HTMLElement, tpl?: HTMLElement | null): Promise<Genie | null> {
  const r = el.getBoundingClientRect();
  const host = el.parentElement;
  const t = tpl ?? snapshotWindow(el);
  if (!host || !t || !r.width || !r.height) return null;
  const N = Math.max(MIN_BANDS, Math.min(MAX_BANDS, Math.round(r.height / BAND_PX)));
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:35;visibility:hidden;contain:layout style;";
  host.appendChild(overlay);
  // let the poster thumbnail decode (briefly) so the first frame shows it, not the black player background
  const pics = Array.from(t.querySelectorAll<HTMLImageElement>("img[data-genie-thumb]"));
  const decoded = pics.length ? Promise.race([Promise.all(pics.map(p => p.decode().catch(() => undefined))), new Promise(res => setTimeout(res, 150))]) : null;
  const sh = r.height / N;
  const bands: HTMLElement[] = [];
  for (let i = 0; i < N; i++) {
    const b = document.createElement("div");
    b.style.cssText = `position:absolute;left:${r.left}px;top:${r.top + i * sh}px;width:${r.width}px;height:${sh + OVERLAP}px;overflow:hidden;will-change:transform;transform-origin:0 0;contain:strict;`;
    const clone = t.cloneNode(true) as HTMLElement;
    clone.style.top = `${-i * sh}px`;
    b.appendChild(clone);
    overlay.appendChild(b);
    bands.push(b);
    // attached to the (hidden) overlay, so each frame lays out only its own few copies
    if ((i + 1) % CHUNK === 0 && i < N - 1) await nextFrame();
  }
  if (decoded) await decoded;
  await nextFrame();
  let done = false;
  const cancel = () => { done = true; overlay.remove(); };

  return {
    cancel,
    async play(slot, dir, duration) {
      if (done) return;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cxr = r.left + r.width / 2, cxs = slot.left + slot.width / 2;
      const anims: Animation[] = [];
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
          frames.push({ transform: m, offset: time, opacity: p > 0.94 ? lerp(1, 0, (p - 0.94) / 0.06) : 1 });
        }
        anims.push(bands[i].animate(frames, { duration: reduce ? 1 : duration, easing: "linear", fill: "both" }));
      }
      // first frame: the copies take over from the real window in the same paint
      overlay.style.visibility = "visible";
      el.style.visibility = "hidden";
      await Promise.all(anims.map(a => a.finished.then(() => undefined, () => undefined)));
      if (dir === "out") el.style.visibility = "";
      // one more frame so the real window is painted before the copies go away (no blink)
      await nextFrame();
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
