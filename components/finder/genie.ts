/**
 * Genie effect: the window is cut into horizontal bands. Each band is a clone of the window
 * mapped with its own projective matrix3d onto a slice of the funnel trapezoid (top edge and
 * bottom edge of the band land on the shared edges of its neighbours, so no gaps), bottom
 * bands first. Transform-only animation; the real window is hidden while it runs.
 *
 * The clone template is flattened once: textareas become plain divs and scroll containers
 * become overflow:hidden. Otherwise each of those is its own compositor layer and is
 * rasterised separately inside every clipped, warped band, which doubles lines at the seams.
 */
import { getYouTubeThumbnail } from "@/lib/youtube";

const N = 24;
const STEPS = 30;
const CHUNK = 4;
const LAG = 0.55;
const OVERLAP = 3;

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** progress of band t (0 top .. 1 bottom) when the whole effect is at p */
const band = (t: number, p: number) => clamp01(p * (1 + LAG) - (1 - t) * LAG);

type Pt = [number, number];

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

function flatTemplate(el: HTMLElement, w: number, h: number): HTMLElement {
  const tpl = el.cloneNode(true) as HTMLElement;
  tpl.classList.add("fx-genie-clone");
  tpl.removeAttribute("id");
  tpl.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
  const orig = Array.from(el.querySelectorAll<HTMLElement>("*"));
  const copy = Array.from(tpl.querySelectorAll<HTMLElement>("*"));
  orig.forEach((o, i) => {
    const c = copy[i];
    if (!c) return;
    const cs = getComputedStyle(o);
    if (o instanceof HTMLTextAreaElement) {
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
      return;
    }
    if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) c.style.overflow = "hidden";
    // Static snapshot: 36 copies of every blur, shadow, animation and embedded frame would be recomputed per frame.
    const st = c.style as CSSStyleDeclaration & { webkitBackdropFilter?: string };
    if (cs.backdropFilter && cs.backdropFilter !== "none") { st.backdropFilter = "none"; st.webkitBackdropFilter = "none"; }
    if (cs.filter && cs.filter !== "none") st.filter = "none";
    st.animation = "none"; st.transition = "none"; st.willChange = "auto";
    if (o instanceof HTMLIFrameElement) {
      // An iframe cannot be cloned with its picture. Use the video thumbnail so the genie shows the video area, not a black box.
      const id = /\/embed\/([\w-]{6,})/.exec(o.src)?.[1];
      if (id) {
        const img = document.createElement("img");
        img.src = getYouTubeThumbnail(id);
        img.alt = "";
        img.dataset.genieThumb = "1";
        img.className = c.className;
        img.setAttribute("style", c.getAttribute("style") || "");
        Object.assign(img.style, { width: cs.width, height: cs.height, objectFit: "cover", display: "block", visibility: "visible" });
        c.replaceWith(img);
        return;
      }
      st.visibility = "hidden";
    } else if (o instanceof HTMLVideoElement) st.visibility = "hidden";
  });
  Object.assign(tpl.style, { position: "absolute", left: "0", width: `${w}px`, height: `${h}px`, translate: "none", transform: "none", opacity: "1", visibility: "visible", margin: "0", zIndex: "auto" });
  return tpl;
}

export async function genie(el: HTMLElement, slot: DOMRect, dir: "in" | "out", duration: number): Promise<void> {
  const r = el.getBoundingClientRect();
  const host = el.parentElement;
  if (!host || !r.width || !r.height) return;
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:35;";
  const tpl = flatTemplate(el, r.width, r.height);
  // let the thumbnail decode (briefly) so the first frame shows it, not the black player background
  const pics = Array.from(tpl.querySelectorAll<HTMLImageElement>("img[data-genie-thumb]"));
  if (pics.length) await Promise.race([Promise.all(pics.map(p => p.decode().catch(() => undefined))), new Promise(res => setTimeout(res, 150))]);
  const sh = r.height / N;
  const cxr = r.left + r.width / 2, cxs = slot.left + slot.width / 2;
  const anims: Animation[] = [];
  const bands: HTMLElement[] = [];
  // build the band clones a few per frame so no single frame blocks on 24 deep clones
  for (let i = 0; i < N; i++) {
    const bandH = sh + OVERLAP;
    const band$ = document.createElement("div");
    band$.style.cssText = `position:absolute;left:${r.left}px;top:${r.top + i * sh}px;width:${r.width}px;height:${bandH}px;overflow:hidden;will-change:transform;transform-origin:0 0;`;
    const clone = tpl.cloneNode(true) as HTMLElement;
    clone.style.top = `${-i * sh}px`;
    band$.appendChild(clone);
    overlay.appendChild(band$);
    bands.push(band$);
    if ((i + 1) % CHUNK === 0 && i < N - 1) await new Promise<void>(res => requestAnimationFrame(() => res()));
  }
  const prev = el.style.visibility;
  host.appendChild(overlay);
  el.style.visibility = "hidden";
  for (let i = 0; i < N; i++) {
    const bandH = sh + OVERLAP;
    const band$ = bands[i];
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
    anims.push(band$.animate(frames, { duration, easing: "linear", fill: "both" }));
  }
  await Promise.all(anims.map(a => a.finished.then(() => undefined, () => undefined))).then(() => {
    overlay.remove();
    if (dir === "out") el.style.visibility = prev;
  });
}
