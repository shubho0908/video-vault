"use client";

import { useIsDesktop, whenIdle } from "./client-env";

import "./finder.css";
import { useEntryWindow } from "./entry-window";
import { ResizeHandles, ZOOM_STYLE, flipZoom, startWindowDrag } from "./window-geom";
import { OPEN_DESKTOP, OPEN_SHEET, skeletonHandover } from "./entry-preview";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { CalendarDays, LoaderCircle, Pencil, Trash2, Video } from "lucide-react";

import { deleteEntryAction, saveEntryAction } from "@/app/actions";
import { bus } from "./lib-bus";
import { NoteMarkdown } from "@/components/journal/note-markdown";
import type { JournalEntry } from "@/lib/journal";
import { getYouTubeThumbnail, getYouTubeVideoId } from "@/lib/youtube";
import { VideoEmbed } from "./video-embed";

export type SceneImage = { id: string; filePath: string; altText: string | null; width: number | null; height: number | null; signedUrl: string };
export type SceneMode = "new" | "view" | "edit";

const EASE_IN = "cubic-bezier(.4,0,1,1)";
const DRAFT = "vv-entry-draft";
const SHEET_EASE = "cubic-bezier(.32,.72,0,1)";

// The editor and the image uploader are only needed in edit/new mode: keep them out of the view bundle
// and fetch them in the background once the window is idle, so Edit still opens instantly.
const loadEditor = () => import("@/components/journal/markdown-editor");
const loadImages = () => import("@/components/journal/image-panel");
const MarkdownEditor = lazy(() => loadEditor().then(m => ({ default: m.MarkdownEditor })));
const ImagePanel = lazy(() => loadImages().then(m => ({ default: m.ImagePanel })));

const dateFormat = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });

type Values = { title: string; youtubeUrl: string; topic: string; notesMarkdown: string };

export function EntryScene({ mode: initialMode, entry, images, standalone }: { mode: SceneMode; entry?: JournalEntry; images: SceneImage[]; standalone: boolean }) {
  const router = useRouter();
  const desktop = useIsDesktop();
  const [mode, setMode] = useState<SceneMode>(initialMode);
  const [values, setValues] = useState<Values>(() => {
    if (!entry && initialMode === "new") {
      try {
        const d = sessionStorage.getItem(DRAFT);
        if (d) return JSON.parse(d) as Values;
      } catch {}
    }
    return { title: entry?.title ?? "", youtubeUrl: entry?.youtubeUrl ?? "", topic: entry?.topic ?? "", notesMarkdown: entry?.notesMarkdown ?? "" };
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<null | "delete" | "discard">(null);
  const [zoomed, setZoomed] = useState(false);
  const pos = useRef({ x: 0, y: 0 });
  const sheetY = useRef(0);
  const frame = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const zoomFrom = useRef<DOMRect | null>(null);
  const toggleZoom = useCallback(() => {
    zoomFrom.current = frame.current?.getBoundingClientRect() ?? null;
    setZoomed(z => !z);
  }, []);

  const cur = entry ? { ...entry, title: values.title.trim() || entry.title, topic: values.topic.trim(), notesMarkdown: values.notesMarkdown, youtubeId: getYouTubeVideoId(values.youtubeUrl) ?? entry.youtubeId } : undefined;
  const imagePanel = useMemo(() => (entry ? <Suspense fallback={<div style={{ minHeight: 120 }} />}><ImagePanel entryId={entry.id} images={images} /></Suspense> : null), [entry, images]);
  const editing = mode !== "view";
  const dirty = editing && (values.title !== (entry?.title ?? "") || values.youtubeUrl !== (entry?.youtubeUrl ?? "") || values.topic !== (entry?.topic ?? "") || values.notesMarkdown !== (entry?.notesMarkdown ?? ""));
  const vid = getYouTubeVideoId(values.youtubeUrl);
  const update = <K extends keyof Values>(k: K, v: Values[K]) => setValues(c => ({ ...c, [k]: v }));

  // open animation: macOS window pop, iOS sheet rise. When the loading skeleton was on screen, carry
  // on from where its animation was instead of popping a second time.
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el || desktop === null) return;
    const ran = skeletonHandover.take(desktop);
    const [kf, opts] = desktop ? OPEN_DESKTOP : OPEN_SHEET;
    // the iOS backdrop continues its fade too (or stays fully shown when the skeleton already finished it)
    if (ran !== null && backRef.current) backRef.current.style.animationDelay = `-${ran}ms`;
    if (ran !== null && ran >= Number(opts.duration)) return;
    const a = el.animate(kf, opts);
    if (ran !== null) a.currentTime = ran;
  }, [desktop]);

  useLayoutEffect(() => {
    const from = zoomFrom.current;
    zoomFrom.current = null;
    if (from) flipZoom(frame.current, from);
  }, [zoomed]);

  // warm the editor chunks while the user reads, so switching to Edit has nothing to download
  useEffect(() => whenIdle(() => void Promise.all([loadEditor(), loadImages()]).catch(() => undefined)), []);

  const leave = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    const el = frame.current;
    if (el) {
      const a = desktop
        ? el.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.94)", opacity: 0 }], { duration: 200, easing: EASE_IN, fill: "forwards" })
        : el.animate([{ transform: `translateY(${sheetY.current}px)` }, { transform: "translateY(110%)" }], { duration: 380, easing: SHEET_EASE, fill: "forwards" });
      await a.finished.then(() => undefined, () => undefined);
    }
    if (standalone) router.push("/dashboard");
    else router.back();
  }, [desktop, router, standalone]);

  const resetSheet = useCallback(() => {
    sheetY.current = 0;
    if (frame.current) {
      frame.current.style.transition = `transform .4s ${SHEET_EASE}`;
      frame.current.style.transform = "";
    }
    if (backRef.current) backRef.current.style.opacity = "";
  }, []);

  const requestClose = useCallback(() => {
    if (!desktop && (saving || dirty)) resetSheet();
    if (saving) return;
    if (dirty) setAlert("discard");
    else void leave();
  }, [desktop, saving, dirty, leave, resetSheet]);

  function save() {
    if (saving || closing.current || !values.title.trim() || !vid) return;
    setError(null);
    setAlert(null);
    const vals = values;
    const ytId = getYouTubeVideoId(vals.youtubeUrl);
    if (!entry) {
      // create: show it in the Finder now, close the window, save in the background
      const tmp = `tmp-e-${Date.now().toString(36)}`;
      bus.add({ id: tmp, title: vals.title.trim(), topic: vals.topic.trim(), youtubeId: ytId ?? "" });
      void leave();
      saveEntryAction(null, vals)
        .catch(() => ({ ok: false as const, error: "Something went wrong." }))
        .then(res => {
          if (res.ok && res.id) {
            bus.settle(tmp, res.id);
            try { sessionStorage.removeItem(DRAFT); } catch {}
            router.refresh();
          } else {
            bus.drop(tmp);
            try { sessionStorage.setItem(DRAFT, JSON.stringify(vals)); } catch {}
            bus.fail(`Could not save "${vals.title.trim()}": ${"error" in res && res.error ? res.error : "try again"}. Your draft is kept; open New Entry to continue.`);
          }
        });
      return;
    }
    // Keep the editor open until the server confirms the save.
    bus.patch(entry.id, { title: vals.title.trim(), topic: vals.topic.trim(), ...(ytId ? { youtubeId: ytId } : {}) });
    setSaving(true);
    saveEntryAction(entry.id, vals)
      .catch(() => ({ ok: false as const, error: "Something went wrong." }))
      .then(res => {
        setSaving(false);
        if (res.ok) {
          setMode("view");
          router.refresh();
        }
        else {
          bus.unpatch(entry.id);
          setError(res.error ?? "Could not save.");
        }
      });
  }
  function remove() {
    if (!entry) return;
    const id = entry.id;
    setAlert(null);
    bus.remove(id);
    void leave();
    deleteEntryAction(id)
      .catch(() => ({ ok: false as const, error: "Something went wrong." }))
      .then(res => {
        if (res.ok) router.refresh();
        else {
          bus.restore(id);
          bus.fail(`Could not delete "${entry.title}": ${res.error ?? "try again"}.`);
        }
      });
  }

  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (ew.min) return;
      const mod = e.metaKey || e.ctrlKey;
      // keep the Finder behind from reacting to window shortcuts while this window has focus
      if (mod && ["w", "m", "n", "1", "2", "[", "]"].includes(e.key.toLowerCase())) e.stopImmediatePropagation();
      if (mod && e.key.toLowerCase() === "w") {
        e.preventDefault();
        requestClose();
      } else if (e.key === "Escape" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        if (alert) setAlert(null);
        else requestClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && editing) {
        e.preventDefault();
        if (!saving) save();
      }
    };
    keyRef.current = key;
  });
  useEffect(() => {
    const f = (e: KeyboardEvent) => keyRef.current?.(e);
    addEventListener("keydown", f, true);
    return () => removeEventListener("keydown", f, true);
  }, []);


  // mac: drag by the title bar
  const lastDown = useRef(0);
  function dragStart(e: RPointerEvent) {
    if (!(e.target as HTMLElement).closest("button,input,a")) {
      // pointer capture swallows dblclick, so detect the double press by hand
      const now = performance.now();
      if (now - lastDown.current < 500) {
        lastDown.current = 0;
        toggleZoom();
        return;
      }
      lastDown.current = now;
    }
    if (zoomed || (e.target as HTMLElement).closest("button,input,a")) return;
    // move the window by writing the transform directly: no React re-render per pointermove
    startWindowDrag(e, frame.current, pos.current, p => void (pos.current = p));
  }
  // iOS: pull the sheet down to dismiss
  function sheetStart(e: RPointerEvent) {
    if (saving || (e.target as HTMLElement).closest("button,input,a")) return;
    const sy = e.clientY;
    const t0 = performance.now();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    let dy = 0;
    const sheet = frame.current, back = backRef.current;
    if (sheet) sheet.style.transition = "none";
    const mv = (m: PointerEvent) => {
      sheetY.current = dy = Math.max(0, m.clientY - sy);
      if (sheet) sheet.style.transform = `translateY(${dy}px)`;
      if (back) back.style.opacity = String(Math.max(0.2, 1 - dy / 500));
    };
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      const v = dy / Math.max(performance.now() - t0, 1);
      if (dy > 140 || v > 0.6) requestClose();
      else resetSheet();
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  const ew = useEntryWindow(frame, pos, mode === "new" ? "New Entry" : mode === "edit" ? "Edit Entry" : (entry?.title ?? "Entry"), desktop === true);
  if (desktop === null) return <div className="fx fx-ew-layer" />;

  const heading = mode === "new" ? "New Entry" : mode === "edit" ? "Edit Entry" : (entry?.title ?? "Entry");
  const actions = editing ? (
    <>
      <button className={desktop ? "fx-btn" : "fx-ios-btn fx-glass"} onClick={requestClose} disabled={saving}>Cancel</button>
      <button className={desktop ? "fx-btn primary" : "fx-ios-btn fx-ios-primary"} onClick={save} disabled={saving || !values.title.trim() || !vid}>
        {saving ? <LoaderCircle size={14} className="fx-spin" /> : null}{mode === "new" ? "Create" : "Save"}
      </button>
    </>
  ) : (
    <>
      <button className={desktop ? "fx-pill fx-glass" : "fx-ios-btn fx-glass"} onClick={() => setMode("edit")} aria-label="Edit entry"><Pencil size={desktop ? 14 : 18} />{desktop ? "Edit" : null}</button>
      <button className={desktop ? "fx-pill fx-glass" : "fx-ios-btn fx-glass"} onClick={() => setAlert("delete")} aria-label="Delete entry"><Trash2 size={desktop ? 14 : 18} /></button>
    </>
  );

  const body = (
    <div className="fx-ew-body" data-mode={mode}>
      {mode === "view" && cur ? (
        <div className="fx-ew-view">
          <article className="fx-ew-main">
            <div className="fx-ew-meta">
              {cur.topic ? <span className="fx-ew-chip">{cur.topic}</span> : null}
              <span className="fx-ew-date"><CalendarDays size={13} />Recorded {dateFormat.format(cur.createdAt)}</span>
            </div>
            <h1 className="fx-ew-h1">{cur.title}</h1>
            <div className="fx-ew-video"><VideoEmbed key={cur.youtubeId} videoId={cur.youtubeId} title={cur.title} /></div>
            <div className="fx-ew-sec">Learning Notes</div>
            <div className="fx-ew-notes" data-nodrag><NoteMarkdown markdown={cur.notesMarkdown} images={images} emptyMessage="No notes added yet. Tap Edit to start writing." /></div>
          </article>
          <aside className="fx-ew-side">
            <div className="fx-ew-sec">Reference Images</div>
            {images.length ? (
              <div className="fx-ew-imgs">
                {images.map(im => (
                  <figure key={im.id}><img src={im.signedUrl} alt={im.altText ?? "Reference image"} loading="lazy" /><figcaption>{im.altText ?? "Reference image"}</figcaption></figure>
                ))}
              </div>
            ) : <p className="fx-ew-empty">No reference images yet.</p>}
            <button className="fx-btn" style={{ marginTop: 12, width: "100%" }} onClick={() => setMode("edit")}>Manage Images…</button>
          </aside>
        </div>
      ) : (
        <fieldset className="fx-ew-form" disabled={saving} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <div className="fx-ew-top">
            <div className="fx-ew-group">
              <label className="fx-ew-row"><span>Title</span><input value={values.title} onChange={e => update("title", e.target.value)} placeholder="What did you explain?" autoFocus={desktop} /></label>
              <label className="fx-ew-row"><span>YouTube URL</span><input type="url" value={values.youtubeUrl} onChange={e => update("youtubeUrl", e.target.value)} placeholder="https://youtu.be/…" inputMode="url" autoCapitalize="none" /></label>
              <label className="fx-ew-row"><span>Topic</span><input value={values.topic} onChange={e => update("topic", e.target.value)} placeholder="React, JavaScript, Computer networks…" /></label>
            </div>
            <div className="fx-ew-preview">
              {vid ? <img src={getYouTubeThumbnail(vid)} alt="YouTube thumbnail preview" /> : <span><Video size={18} />No video yet</span>}
            </div>
          </div>
          <div className="fx-ew-sec">Notes</div>
          <div className="fx-ew-editor" data-nodrag>
            <Suspense fallback={<div style={{ minHeight: 380 }} />}>
              <MarkdownEditor value={values.notesMarkdown} onChangeAction={v => update("notesMarkdown", v)} entryId={entry?.id} images={images} minHeightClassName="min-h-[320px]" />
            </Suspense>
          </div>
          {entry ? (
            <div className="fx-ew-images" data-nodrag>{imagePanel}</div>
          ) : (
            <p className="fx-ew-hint">Reference images can be added after the entry is created.</p>
          )}
        </fieldset>
      )}
      {error ? <p role="alert" className="fx-ew-error">{error}</p> : null}
    </div>
  );

  const alertEl = alert && typeof document !== "undefined" ? createPortal(
    <div className="fx fx-portal">
    <div className="fx-sheet-back fx-ew-alert" onPointerDown={e => e.stopPropagation()}>
      <div className="fx-sheet fx-glass" role="alertdialog" aria-label={alert === "delete" ? "Delete this entry?" : "Discard changes?"}>
        <h3>{alert === "delete" ? "Delete this entry?" : "Discard changes?"}</h3>
        <p>{alert === "delete" ? "This permanently removes the video record, notes, and associated reference images." : "Your edits to this entry have not been saved."}</p>
        <div className="fx-ew-alert-btns">
          <button className="fx-btn" onClick={() => setAlert(null)}>{alert === "delete" ? "Keep Entry" : "Keep Editing"}</button>
          <button className="fx-btn primary fx-danger" onClick={() => (alert === "delete" ? remove() : void leave())}>{alert === "delete" ? "Delete" : "Discard"}</button>
        </div>
      </div>
    </div>
    </div>, document.body
  ) : null;

  const wall = standalone ? <div className="fx-ew-wall" /> : null;

  if (desktop) {
    const W = ew.size ? `${ew.size.w}px` : "min(1040px, calc(100vw - 80px))", H = ew.size ? `${ew.size.h}px` : "min(720px, calc(100vh - 150px))";
    const style: React.CSSProperties = zoomed
      ? ZOOM_STYLE
      : { left: "calc(50% - min(1040px, calc(100vw - 80px)) / 2)", top: "calc(50% - min(720px, calc(100vh - 150px)) / 2 - 8px)", width: W, height: H, translate: `${pos.current.x}px ${pos.current.y}px` };
    return (
      <div className="fx fx-ew-layer" data-standalone={standalone} style={ew.min ? { pointerEvents: "none" } : undefined}>
        {wall}
        <div ref={frame} className="fx-window fx-ew-win" data-active="true" data-min={ew.min} data-zoomed={zoomed} style={style} role="dialog" aria-label={heading}>
          <div className="fx-traffic" data-nodrag>
            <button className="r" aria-label="Close" onClick={requestClose}><svg viewBox="0 0 12 12"><path d="m3.600 3.600 4.800 4.800m0-4.800-4.800 4.800" /></svg></button>
            <button className="y" aria-label="Minimize" disabled={standalone} onClick={() => void ew.minimize()}><svg viewBox="0 0 12 12"><path d="M3 6h6" /></svg></button>
            <button className="g" aria-label="Zoom" onClick={toggleZoom}><svg viewBox="0 0 12 12"><path d="M3.500 8.500V4.600a1.100 1.100 0 0 1 1.100-1.100h3.900M8.500 3.500v3.900a1.100 1.100 0 0 1-1.100 1.100H3.500" /></svg></button>
          </div>
          <section className="fx-main fx-ew-panel">
            <div className="fx-toolbar fx-ew-bar" onPointerDown={dragStart}>
              <div className="fx-ew-barl" />
              <div className="fx-title fx-ew-title">{heading}{dirty ? <i className="fx-ew-dot" aria-label="Edited" /> : null}</div>
              <div className="fx-ew-bara">{actions}</div>
            </div>
            <div className="fx-ew-scroll">{body}</div>
          </section>
          {alertEl}
          {!zoomed && <ResizeHandles frame={frame} base={() => pos.current} min={[640, 420]} onCommit={ew.commit} />}
        </div>
      </div>
    );
  }

  return (
    <div className="fx fx-ew-layer" data-standalone={standalone}>
      {wall}
      <div ref={backRef} className="fx-ios-sheet-back fx-ew-back" onClick={requestClose} />
      <div ref={frame} className="fx-ew-sheet" role="dialog" aria-label={heading}>
        <div className="fx-ew-nav" onPointerDown={sheetStart}>
          <i className="fx-ew-grab" />
          <div className="fx-ew-navrow"><div className="fx-ew-navl">{editing ? actions.props.children[0] : <button className="fx-ios-btn fx-glass" onClick={requestClose}>Done</button>}</div><div className="fx-ew-navt">{heading}</div><div className="fx-ew-navr">{editing ? actions.props.children[1] : actions}</div></div>
        </div>
        <div className="fx-ew-scroll">{body}</div>
        {alertEl}
      </div>
    </div>
  );
}
