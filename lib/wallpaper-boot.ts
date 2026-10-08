import {
  DESKTOP_QUERY,
  WALL_ATTR_PREFIX,
  WALL_SIZES,
  WALL_STORAGE_PREFIX,
} from "@/lib/wallpaper-data";

/**
 * Runs synchronously in <head>, before the first paint and long before React hydrates.
 *  1. Reads the saved choice (id + tint) from localStorage and publishes it on <html> as
 *     data-wall-{kind} plus the --fx-wall-{kind} custom property; finder.css maps that onto --fx-wall.
 *     The tint paints instantly under the image, so the first frame already looks like the wallpaper.
 *  2. Preloads exactly the image this viewport, theme and choice will paint.
 * Constant size regardless of how many wallpapers exist: it validates the id by shape and builds the
 * URL by convention, so no per-wallpaper data is shipped in HTML or CSS.
 */
export function wallpaperBootScript() {
  const S = JSON.stringify(WALL_SIZES);
  return (
    `(function(){try{var d=document.documentElement,L=localStorage,S=${S},P=${JSON.stringify(WALL_STORAGE_PREFIX)},A=${JSON.stringify(WALL_ATTR_PREFIX)},` +
    `w=innerWidth,r=devicePixelRatio||1,k=matchMedia(${JSON.stringify(DESKTOP_QUERY)}).matches?"mac":"ios",u,v,c=/^#[0-9a-f]{6}$/i,` +
    `big=function(n){return w>=S[n].minWidth||r>=S[n].minDpr};` +
    `["mac","ios"].forEach(function(n){var id=L.getItem(P+n);if(!id||!/^[a-z0-9-]{1,40}$/.test(id))return;` +
    `var t=(L.getItem(P+"tint:"+n)||"").split(","),x="/wp/"+n+"-"+id+"-"+S[n][big(n)?"large":"small"]+".webp";` +
    `d.setAttribute(A+n,id);` +
    `d.style.setProperty("--fx-wall-"+n,"url("+x+") center / cover no-repeat"+(c.test(t[0])&&c.test(t[1])?", linear-gradient(135deg, "+t[0]+", "+t[1]+")":""));` +
    `if(n===k)v=x});` +
    // theme default: avif at the size the finder.css media queries pick
    `u=v||"/wp/"+k+"-"+(L.getItem("theme")==="light"?"light":"dark")+"-"+(k==="mac"?(w>=2200||(w>=1500&&r>=1.5)?2880:(big("mac")?2048:1280)):(big("ios")?1290:645))+".avif";` +
    `var l=document.createElement("link");l.rel="preload";l.as="image";l.href=u;l.setAttribute("fetchpriority","high");if(!v)l.type="image/avif";document.head.appendChild(l)}catch(e){}})();`
  );
}
