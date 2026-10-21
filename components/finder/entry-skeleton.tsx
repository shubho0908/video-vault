"use client";

import "./finder.css";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { getYouTubeThumbnail } from "@/lib/youtube";
import { OPEN_DESKTOP, OPEN_SHEET, entryPreview, skeletonHandover } from "./entry-preview";

const query = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";
const subscribe = (cb: () => void) => {
  const m = matchMedia(query);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/**
 * Instant entry window while the server renders the real one (loading.tsx of the intercepted entry
 * routes). Same frame, same position, same open animation; the title and poster come from the
 * Finder's own data when it is the entry that was just opened.
 */
export function EntrySkeleton({ mode }: { mode?: "new" | "view" }) {
  const desktop = useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => null);
  const frame = useRef<HTMLDivElement>(null);
  const params = useParams<{ entryId?: string }>();
  const path = usePathname();
  const edit = path?.endsWith("/edit");
  const preview = mode === "new" ? null : entryPreview.get(params?.entryId);
  const heading = mode === "new" ? "New Entry" : edit ? "Edit Entry" : (preview?.title ?? "");

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el || desktop === null) return;
    const shownAt = performance.now();
    el.animate(...(desktop ? OPEN_DESKTOP : OPEN_SHEET));
    return () => skeletonHandover.hidden(shownAt, desktop);
  }, [desktop]);

  if (desktop === null) return null;

  const body = (
    <div className="fx-ew-body fx-ew-skel" data-mode="view" aria-hidden="true">
      {mode === "new" || edit ? (
        <div className="fx-ew-form">
          <div className="fx-ew-top"><div className="fx-ew-group" style={{ height: 134 }} /><div className="fx-ew-preview" /></div>
          <div className="fx-ew-sec">Notes</div>
          <div className="fx-ew-group" style={{ height: 320 }} />
        </div>
      ) : (
        <div className="fx-ew-view">
          <article className="fx-ew-main">
            <div className="fx-ew-meta">
              {preview?.topic ? <span className="fx-ew-chip">{preview.topic}</span> : null}
              <span className="fx-ew-date"><CalendarDays size={13} /><i className="fx-skel-line" style={{ width: 120 }} /></span>
            </div>
            <h1 className="fx-ew-h1">{preview?.title ?? <i className="fx-skel-line" style={{ width: "60%", height: 26 }} />}</h1>
            <div className="fx-ew-video">
              {preview?.youtubeId ? <span className="fx-ew-poster"><img src={getYouTubeThumbnail(preview.youtubeId)} alt="" decoding="async" fetchPriority="high" /></span> : null}
            </div>
            <div className="fx-ew-sec">Learning Notes</div>
            <i className="fx-skel-line" style={{ width: "92%" }} /><i className="fx-skel-line" style={{ width: "84%" }} /><i className="fx-skel-line" style={{ width: "70%" }} />
          </article>
          <aside className="fx-ew-side"><div className="fx-ew-sec">Reference Images</div></aside>
        </div>
      )}
    </div>
  );

  if (desktop) {
    return (
      <div className="fx fx-ew-layer">
        <div
          ref={frame}
          className="fx-window fx-ew-win"
          data-active="true"
          role="dialog"
          aria-busy="true"
          aria-label={heading || "Loading entry"}
          style={{ left: "calc(50% - min(1040px, calc(100vw - 80px)) / 2)", top: "calc(50% - min(720px, calc(100vh - 150px)) / 2 - 8px)", width: "min(1040px, calc(100vw - 80px))", height: "min(720px, calc(100vh - 150px))" }}
        >
          <div className="fx-traffic"><button className="r" aria-label="Close" disabled /><button className="y" aria-label="Minimize" disabled /><button className="g" aria-label="Zoom" disabled /></div>
          <section className="fx-main fx-ew-panel">
            <div className="fx-toolbar fx-ew-bar"><div className="fx-ew-barl" /><div className="fx-title fx-ew-title">{heading}</div><div className="fx-ew-bara" /></div>
            <div className="fx-ew-scroll">{body}</div>
          </section>
        </div>
      </div>
    );
  }
  return (
    <div className="fx fx-ew-layer">
      <div className="fx-ios-sheet-back fx-ew-back" />
      <div ref={frame} className="fx-ew-sheet" role="dialog" aria-busy="true" aria-label={heading || "Loading entry"}>
        <div className="fx-ew-nav">
          <i className="fx-ew-grab" />
          <div className="fx-ew-navrow"><div className="fx-ew-navl" /><div className="fx-ew-navt">{heading}</div><div className="fx-ew-navr" /></div>
        </div>
        <div className="fx-ew-scroll">{body}</div>
      </div>
    </div>
  );
}
