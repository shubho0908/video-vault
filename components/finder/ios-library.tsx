"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FolderPlus, Inbox, Layers, Plus } from "lucide-react";

import { SmallFolder } from "./icons";
import { entryPreview } from "./entry-preview";
import { thumb, type LibEntry, type Location, type useLibrary } from "./library";

type Lib = ReturnType<typeof useLibrary>;
type Sheet = { kind: "new" } | { kind: "rename"; id: string } | { kind: "entry"; entry: LibEntry } | null;

/** Interruptible bottom sheet: follows the finger 1:1, projects the release velocity, springs shut or back. */
function BottomSheet({ children, close }: { children: React.ReactNode; close: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; v: number } | null>(null);
  const shut = (v: number) => {
    el.current?.animate(
      [{ transform: getComputedStyle(el.current).transform }, { transform: "translateY(110%)" }],
      { duration: 320, easing: "cubic-bezier(.32,.72,0,1)", fill: "forwards" }
    ).finished.then(close);
    void v;
  };
  return (
    <>
      <div className="fx-ios-sheet-back" onClick={() => shut(0)} />
      <div
        ref={el}
        className="fx-ios-sheet fx-glass"
        style={{ animation: "fx-sheet-in .45s cubic-bezier(.32,.72,0,1) both" }}
        onPointerDown={e => {
          if ((e.target as HTMLElement).closest("input,button")) return;
          drag.current = { y: e.clientY, t: e.timeStamp, v: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const d = drag.current;
          if (!d || !el.current) return;
          const dy = Math.max(e.clientY - d.y, 0);
          d.v = (e.clientY - d.y) / Math.max(e.timeStamp - d.t, 1);
          el.current.style.animation = "none";
          el.current.style.transform = `translateY(${dy}px)`;
        }}
        onPointerUp={e => {
          const d = drag.current;
          drag.current = null;
          if (!d || !el.current) return;
          const dy = Math.max(e.clientY - d.y, 0);
          const projected = dy + d.v * 180;
          if (projected > 140) shut(d.v);
          else el.current.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: 380, easing: "cubic-bezier(.32,.72,0,1)" }), (el.current.style.transform = "");
        }}
      >
        <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--fx-sep)", margin: "-8px auto 12px" }} />
        {children}
      </div>
    </>
  );
}

export function IosLibrary({ lib }: { lib: Lib }) {
  const { data, entriesIn, createFolder, renameFolder, deleteFolder, place } = lib;
  const router = useRouter();
  const [stack, setStack] = useState<Location[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [tab, setTab] = useState<"library" | "unfiled">("library");
  const [leaving, setLeaving] = useState(false);
  const loc: Location | null = stack.at(-1) ?? null;

  const popTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(popTimer.current), []);
  const push = (l: Location) => (clearTimeout(popTimer.current), setLeaving(false), setStack(s => [...s, l]));
  const pop = () => {
    if (leaving) return;
    setLeaving(true);
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => (setStack(s => s.slice(0, -1)), setLeaving(false)), 330);
  };
  // one pass over the memberships instead of one filter per folder row on every render
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    data.memberships.forEach(x => m.set(x.playlistId, (m.get(x.playlistId) ?? 0) + 1));
    return m;
  }, [data.memberships]);
  const here = useMemo(() => (stack.length ? entriesIn(stack[stack.length - 1]) : []), [stack, entriesIn]);

  const rows = (list: LibEntry[], from: string | null) =>
    list.map(e => (
      <div key={e.id} className="fx-ios-row" style={{ padding: 0 }}>
        <Link
          href={`/entries/${e.id}`}
          // a long library would otherwise prefetch every visible row; warm only the one being touched
          prefetch={false}
          onPointerDown={() => router.prefetch(`/entries/${e.id}`)}
          onClick={() => entryPreview.set({ id: e.id, title: e.title, topic: e.topic, youtubeId: e.youtubeId })}
          className="fx-ios-row"
          style={{ flex: 1, textDecoration: "none", color: "inherit" }}
        >
          <img className="fx-ios-thumb" src={thumb(e.youtubeId)} alt="" loading="lazy" decoding="async" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontSize: 16 }}>{e.title}</span>
        </Link>
        <button className="fx-ios-btn" aria-label={`Actions for ${e.title}`} onClick={() => setSheet({ kind: "entry", entry: e })} data-from={from ?? ""}>•••</button>
      </div>
    ));

  const folderLoc = loc && loc !== "all" && loc !== "unfiled" ? loc : null;
  const title = !loc ? (tab === "library" ? "Library" : "Unfiled") : loc === "unfiled" ? "Unfiled" : data.folders.find(f => f.id === loc)?.name ?? "Folder";

  return (
    <div className="fx fx-ios">
      <div className="fx-ios-page" style={{ transform: loc ? "translateX(-30%)" : undefined, transition: "transform .4s cubic-bezier(.32,.72,0,1)" }}>
        <div className="fx-ios-nav">
          <span />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="fx-ios-btn fx-glass" aria-label="New Folder" onClick={() => setSheet({ kind: "new" })}><FolderPlus size={20} /></button>
            <Link href="/entries/new" className="fx-ios-btn fx-glass" aria-label="New entry"><Plus size={22} /></Link>
          </div>
        </div>
        <h1 className="fx-ios-large">{tab === "library" ? "Library" : "Unfiled"}</h1>
        {tab === "library" ? (
          <div className="fx-ios-group">
            <button className="fx-ios-row" onClick={() => push("all")}><Layers size={22} color="var(--fx-accent)" />All Videos<span className="sub">{data.entries.length}<ChevronRight size={16} /></span></button>
            {data.folders.map(f => (
              <button key={f.id} className="fx-ios-row" onClick={() => push(f.id)}>
                <SmallFolder size={24} /><span style={{ color: "var(--fx-label)" }}>{f.name}</span>
                <span className="sub">{counts.get(f.id) ?? 0}<ChevronRight size={16} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="fx-ios-group">{rows(entriesIn("unfiled"), null)}</div>
        )}
      </div>

      {loc && (
        <div
          className="fx-ios-page"
          style={{ animation: `${leaving ? "fx-ios-out" : "fx-ios-in"} .4s cubic-bezier(.32,.72,0,1) both`, boxShadow: "-8px 0 30px rgba(0,0,0,.15)" }}
        >
          <div className="fx-ios-nav">
            <button className="fx-ios-btn fx-glass" onClick={pop}><ChevronLeft size={22} />Library</button>
            {folderLoc && <button className="fx-ios-btn fx-glass" onClick={() => setSheet({ kind: "rename", id: folderLoc })}>Edit</button>}
          </div>
          <h1 className="fx-ios-large">{title}</h1>
          {here.length ? (
            <div className="fx-ios-group">{rows(here, folderLoc)}</div>
          ) : (
            <p style={{ textAlign: "center", color: "var(--fx-label-2)", marginTop: 80 }}>No videos here</p>
          )}
        </div>
      )}

      <nav className="fx-ios-tab fx-glass" aria-label="Library sections">
        <button aria-current={tab === "library"} onClick={() => (setTab("library"), setStack([]))}><Layers size={22} />Library</button>
        <button aria-current={tab === "unfiled"} onClick={() => (setTab("unfiled"), setStack([]))}><Inbox size={22} />Unfiled</button>
      </nav>

      {sheet?.kind === "new" && (
        <BottomSheet close={() => setSheet(null)}>
          <NameForm title="New Folder" action="Create" initial="" onSubmit={async n => { const id = await createFolder(n); if (id) setStack([id]); setSheet(null); }} close={() => setSheet(null)} />
        </BottomSheet>
      )}
      {sheet?.kind === "rename" && (
        <BottomSheet close={() => setSheet(null)}>
          <NameForm title="Rename Folder" action="Save" initial={data.folders.find(f => f.id === sheet.id)?.name ?? ""} onSubmit={n => { renameFolder(sheet.id, n); setSheet(null); }} close={() => setSheet(null)} />
          <button className="fx-ios-act sec" style={{ color: "#ff3b30" }} onClick={() => { deleteFolder(sheet.id); setSheet(null); setStack([]); }}>Delete Folder</button>
        </BottomSheet>
      )}
      {sheet?.kind === "entry" && (
        <BottomSheet close={() => setSheet(null)}>
          <h3>{sheet.entry.title}</h3>
          <div className="fx-ios-group" style={{ background: "transparent" }}>
            {data.folders.map(f => (
              <button key={f.id} className="fx-ios-row" onClick={() => { place(sheet.entry.id, folderLoc, f.id); setSheet(null); }}>
                <SmallFolder size={22} />Move to {f.name}
              </button>
            ))}
            {folderLoc && <button className="fx-ios-row" onClick={() => { place(sheet.entry.id, folderLoc, null); setSheet(null); }}>Remove from Folder</button>}
          </div>
          <button className="fx-ios-act sec" onClick={() => setSheet(null)}>Cancel</button>
        </BottomSheet>
      )}
      {lib.error && <div className="fx-toast fx-glass" style={{ bottom: 100 }} role="alert" onClick={lib.clearError}>{lib.error}</div>}
    </div>
  );
}

function NameForm({ title, action, initial, onSubmit, close }: { title: string; action: string; initial: string; onSubmit: (n: string) => void; close: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <form onSubmit={e => (e.preventDefault(), v.trim() && onSubmit(v.trim()))}>
      <h3>{title}</h3>
      <input className="fx-ios-field" autoFocus value={v} placeholder="Name" onChange={e => setV(e.target.value)} />
      <button className="fx-ios-act" type="submit" disabled={!v.trim()} style={{ opacity: v.trim() ? 1 : 0.45 }}>{action}</button>
      <button className="fx-ios-act sec" type="button" onClick={close}>Cancel</button>
    </form>
  );
}
