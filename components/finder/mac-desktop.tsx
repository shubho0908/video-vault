"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Layers, Inbox } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { SFChevronLeft, SFChevronRight, SFGrid, SFList, SFFolderPlus, SFSearch } from "./sf";
import { FolderIcon, AppleGlyph, SmallFolder } from "./icons";
import { APPS, AppWindow, Dock, ORDER, useWindowManager, type AppId } from "./windows";
import { CalculatorApp, SettingsApp } from "./apps";
import { WallLayer } from "./wall-layer";
import { NotesApp } from "./notes-app";
import { BatteryGlyph, BatteryPanel, ControlCenter, ControlGlyph, DatePanel, Dimmer, MenuClock, Popover, Spotlight, WifiGlyph, WifiPanel, useBattery, type Panel } from "./status";
import { entryPreview } from "./entry-preview";
import { ShortcutsOverlay } from "./shortcuts";
import { thumb, type LibEntry, type Location, type useLibrary } from "./library";

type Lib = ReturnType<typeof useLibrary>;
type Sel = { kind: "folder" | "entry"; id: string } | null;
type Menu = { x: number; y: number; items: MenuItem[] } | null;
type MenuItem = { label: string; keys?: string; run?: () => void; disabled?: boolean } | "sep";

const DRAG = "application/x-vault-entry";

function useStable<A extends unknown[], R>(fn: (...a: A) => R): (...a: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => void (ref.current = fn));
  return useCallback((...a: A) => ref.current(...a), []);
}
const MemoNotes = memo(NotesApp);
const MemoCalculator = memo(CalculatorApp);
const MemoSettings = memo(SettingsApp);

type TileActions = {
  focus: (id: string) => void;
  select: (id: string) => void;
  open: (id: string) => void;
  menu: (id: string, x: number, y: number) => void;
  dragStart: (id: string, dt: DataTransfer) => void;
  dragEnd: () => void;
  rowDrag: (id: string, dt: DataTransfer) => void;
};
type ActRef = { current: TileActions };

const EntryTile = memo(function EntryTile({ e, selected, dragging, act }: { e: LibEntry; selected: boolean; dragging: boolean; act: ActRef }) {
  return (
    <div
      role="option"
      aria-selected={selected}
      className="fx-item"
      data-dragging={dragging}
      draggable
      tabIndex={0}
      onFocus={() => act.current.focus(e.id)}
      onDragStart={ev => act.current.dragStart(e.id, ev.dataTransfer)}
      onDragEnd={() => act.current.dragEnd()}
      onPointerDown={ev => (ev.stopPropagation(), act.current.select(e.id))}
      onDoubleClick={() => act.current.open(e.id)}
      onContextMenu={ev => (ev.preventDefault(), ev.stopPropagation(), act.current.menu(e.id, ev.clientX, ev.clientY))}
    >
      <div className="ic"><img className="fx-thumb" src={thumb(e.youtubeId)} alt="" loading="lazy" decoding="async" draggable={false} /></div>
      <span className="nm">{e.title}</span>
    </div>
  );
});

const EntryRow = memo(function EntryRow({ e, selected, act }: { e: LibEntry; selected: boolean; act: ActRef }) {
  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      draggable
      onFocus={() => act.current.focus(e.id)}
      onDragStart={ev => act.current.rowDrag(e.id, ev.dataTransfer)}
      onPointerDown={() => act.current.select(e.id)}
      onDoubleClick={() => act.current.open(e.id)}
    >
      <td><span><img src={thumb(e.youtubeId)} alt="" width={26} height={16} loading="lazy" decoding="async" style={{ borderRadius: 2, objectFit: "cover" }} />{e.title}</span></td>
      <td>{e.topic}</td><td>--</td>
    </tr>
  );
});

function MenuList({ items, close }: { items: MenuItem[]; close: () => void }) {
  return (
    <>
      {items.map((it, i) =>
        it === "sep" ? (
          <hr key={i} />
        ) : (
          <div
            key={i}
            role="menuitem"
            className="fx-menu-row"
            aria-disabled={it.disabled || undefined}
            onClick={() => {
              if (it.disabled) return;
              close();
              it.run?.();
            }}
          >
            <span>{it.label}</span>
            {it.keys ? <kbd>{it.keys}</kbd> : null}
          </div>
        )
      )}
    </>
  );
}

export function MacDesktop({ lib, userName }: { lib: Lib; userName: string }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { data, entriesIn, createFolder, renameFolder, deleteFolder, place } = lib;
  const wm = useWindowManager();
  const [panel, setPanel] = useState<Panel>(null);
  const [menuX, setMenuX] = useState(0);
  const pick = (name: string | null, e?: React.PointerEvent | React.MouseEvent) => {
    setPanel(null);
    if (e && name) setMenuX((e.currentTarget as HTMLElement).offsetLeft);
    setMenuBar(name);
  };
  const [spot, setSpot] = useState(false);
  const [wifi, setWifi] = useState(true);
  const [keys, setKeys] = useState<null | "sheet" | "hold">(null);
  const [modal, setModal] = useState<null | "about" | "logout" | "sleep" | "shutdown">(null);
  const battery = useBattery();
  const [loc, setLoc] = useState<Location>("all");
  const [history, setHistory] = useState<{ back: Location[]; fwd: Location[] }>({ back: [], fwd: [] });
  const [view, setView] = useState<"icons" | "list">("icons");
  const [sel, setSel] = useState<Sel>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [drop, setDrop] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuBar, setMenuBar] = useState<string | null>(null);
  const [ctx, setCtx] = useState<Menu>(null);
  const [quick, setQuick] = useState<LibEntry | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const openEntry = useCallback(
    (id: string, edit = false) => {
      const e = data.entries.find(x => x.id === id);
      entryPreview.set(e ? { id: e.id, title: e.title, topic: e.topic, youtubeId: e.youtubeId } : null);
      router.push(`/entries/${id}${edit ? "/edit" : ""}`);
    },
    [data.entries, router]
  );

  const go = useCallback(
    (next: Location) => {
      setHistory(h => ({ back: [...h.back, loc], fwd: [] }));
      setLoc(next);
      setSel(null);
      setQuery("");
    },
    [loc]
  );
  const back = () =>
    history.back.length &&
    (setHistory({ back: history.back.slice(0, -1), fwd: [loc, ...history.fwd] }), setLoc(history.back.at(-1)!), setSel(null));
  const fwd = () =>
    history.fwd.length &&
    (setHistory({ back: [...history.back, loc], fwd: history.fwd.slice(1) }), setLoc(history.fwd[0]), setSel(null));

  const folderName = (id: Location) =>
    id === "all" ? "All Videos" : id === "unfiled" ? "Unfiled" : data.folders.find(f => f.id === id)?.name ?? "Folder";
  const inRoot = loc === "all";
  const q = query.trim().toLowerCase();
  const entries = useMemo(
    () => entriesIn(loc === "all" ? "all" : loc).filter(e => !q || e.title.toLowerCase().includes(q) || e.topic.toLowerCase().includes(q)),
    [entriesIn, loc, q]
  );
  const folders = useMemo(() => (inRoot ? data.folders.filter(f => !q || f.name.toLowerCase().includes(q)) : []), [inRoot, data.folders, q]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    data.memberships.forEach(x => m.set(x.playlistId, (m.get(x.playlistId) ?? 0) + 1));
    return m;
  }, [data.memberships]);

  const newFolder = useCallback(async () => {
    const id = await createFolder("untitled folder");
    if (id) {
      if (!inRoot) go("all");
      setSel({ kind: "folder", id });
      setRenaming(id);
    }
  }, [createFolder, inRoot, go]);

  const openSel = () => {
    if (!sel) return;
    if (sel.kind === "folder") go(sel.id);
    else openEntry(sel.id);
  };

  const moveTo = (entryId: string, toId: string | null, copy = false) => {
    const from = loc !== "all" && loc !== "unfiled" ? loc : null;
    place(entryId, copy ? null : from, toId);
  };

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const down = (e: KeyboardEvent) => {
      if (e.key === "Meta" && !e.repeat) t = setTimeout(() => setKeys(k => k ?? "hold"), 1000);
      else if (e.key !== "Meta") clearTimeout(t);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== "Meta") return;
      clearTimeout(t);
      setKeys(k => (k === "hold" ? null : k));
    };
    const blur = () => (clearTimeout(t), setKeys(k => (k === "hold" ? null : k)));
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", blur);
    return () => (clearTimeout(t), removeEventListener("keydown", down), removeEventListener("keyup", up), removeEventListener("blur", blur));
  }, []);

  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "INPUT";
      if (typing) return;
      const mod = e.metaKey || e.ctrlKey;
      const itemFocused = (e.target as HTMLElement)?.matches(".fx-grid > .fx-item, .fx-list tbody tr");
      if (mod && e.key === "/") return (e.preventDefault(), setKeys(k => (k === "sheet" ? null : "sheet")));
      if (e.key === "Escape" && keys) return setKeys(null);
      if (mod && !e.shiftKey && e.key.toLowerCase() === "n") return (e.preventDefault(), router.push("/entries/new"));
      if (mod && e.key === ",") return (e.preventDefault(), wm.launch("settings"));
      if (mod && e.key.toLowerCase() === "w") return (e.preventDefault(), void wm.close(wm.front));
      if (mod && e.key.toLowerCase() === "m") return (e.preventDefault(), void wm.minimize(wm.front));
      if (mod && e.code === "Space") return (e.preventDefault(), setSpot(true));
      if (wm.front !== "finder" || !wm.wins.finder.open) return void (e.key === "Escape" && (setSpot(false), setPanel(null), setMenuBar(null), setCtx(null)));
      if (mod && e.shiftKey && e.key.toLowerCase() === "n") (e.preventDefault(), newFolder());
      else if (mod && e.key === "1") (e.preventDefault(), setView("icons"));
      else if (mod && e.key === "2") (e.preventDefault(), setView("list"));
      else if (mod && e.key === "[") (e.preventDefault(), back());
      else if (mod && e.key === "]") (e.preventDefault(), fwd());
      else if (mod && e.key === "ArrowDown") (e.preventDefault(), openSel());
      else if (e.key === "Enter" && itemFocused && sel?.kind === "entry") (e.preventDefault(), openSel());
      else if (e.key === "Enter" && itemFocused && sel?.kind === "folder") setRenaming(sel.id);
      else if (e.key === " " && itemFocused && sel?.kind === "entry") {
        e.preventDefault();
        setQuick(q => (q ? null : data.entries.find(x => x.id === sel.id) ?? null));
      } else if (e.key === "Escape") (setQuick(null), setCtx(null), setMenuBar(null));
    };
    keyRef.current = onKey;
  });
  useEffect(() => {
    const f = (e: KeyboardEvent) => keyRef.current?.(e);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const act = useRef<TileActions>(null!);
  useEffect(() => {
    act.current = {
      focus: id => (wm.focus("finder"), setSel({ kind: "entry", id })),
      select: id => (setSel({ kind: "entry", id }), router.prefetch(`/entries/${id}`)),
      open: id => openEntry(id),
      menu: (id, x, y) => (setSel({ kind: "entry", id }), setCtx({ x, y, items: itemMenu({ kind: "entry", id }) })),
      dragStart: (id, dt) => (dt.setData(DRAG, id), (dt.effectAllowed = "copyMove"), setDragId(id)),
      dragEnd: () => setDragId(null),
      rowDrag: (id, dt) => dt.setData(DRAG, id),
    };
  });

  const { drag } = wm;
  const dragWindow = useCallback((e: React.PointerEvent) => drag("finder", e), [drag]);
  const dragNotes = useCallback((e: React.PointerEvent) => drag("notes", e), [drag]);
  const dragCalc = useCallback((e: React.PointerEvent) => drag("calculator", e), [drag]);
  const dragSettings = useCallback((e: React.PointerEvent) => drag("settings", e), [drag]);
  const askLogout = useCallback(() => setModal("logout"), []);
  const openDesktopFolder = useStable((id: string) => (wm.launch("finder"), go(id)));
  const signOut = () => authClient.signOut().then(() => router.push("/sign-in"));

  const itemMenu = (s: NonNullable<Sel>): MenuItem[] =>
    s.kind === "folder"
      ? [
          { label: "Open", keys: "⌘↓", run: () => go(s.id) },
          "sep",
          { label: "Rename", run: () => setRenaming(s.id) },
          { label: "Delete Folder…", run: () => setConfirm(s.id) },
        ]
      : [
          { label: "Open", keys: "⌘↓", run: () => openEntry(s.id) },
          { label: "Quick Look", keys: "Space", run: () => setQuick(data.entries.find(x => x.id === s.id) ?? null) },
          { label: "Edit Notes", run: () => openEntry(s.id, true) },
          "sep",
          ...data.folders.map(f => ({ label: `Move to ${f.name}`, run: () => moveTo(s.id, f.id) } as MenuItem)),
          { label: "Remove from Folder", disabled: loc === "all" || loc === "unfiled", run: () => moveTo(s.id, null) },
        ];

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: "New Folder", keys: "⇧⌘N", run: newFolder },
      { label: "Open", keys: "⌘↓", disabled: !sel, run: openSel },
      { label: "New Entry…", keys: "⌘N", run: () => router.push("/entries/new") },
      "sep",
      { label: "Rename", keys: "↩", disabled: sel?.kind !== "folder", run: () => sel && setRenaming(sel.id) },
      { label: "Quick Look", keys: "Space", disabled: sel?.kind !== "entry", run: () => setQuick(data.entries.find(x => x.id === sel?.id) ?? null) },
    ],
    Edit: [{ label: "Select All", keys: "⌘A", disabled: true }],
    View: [
      { label: "as Icons", keys: "⌘1", run: () => setView("icons") },
      { label: "as List", keys: "⌘2", run: () => setView("list") },
    ],
    Go: [
      { label: "Back", keys: "⌘[", disabled: !history.back.length, run: back },
      { label: "Forward", keys: "⌘]", disabled: !history.fwd.length, run: fwd },
      "sep",
      { label: "All Videos", run: () => go("all") },
      { label: "Unfiled", run: () => go("unfiled") },
    ],
    Window: [
      { label: "Minimize", keys: "⌘M", run: () => wm.minimize(wm.front) },
      { label: "Zoom", run: () => wm.zoom(wm.front) },
      "sep",
      { label: "Close", keys: "⌘W", run: () => wm.close(wm.front) },
      "sep",
      ...ORDER.filter(a => wm.wins[a].open).map(a => ({ label: APPS[a].name, run: () => wm.launch(a) } as MenuItem)),
    ],
    Help: [{ label: "Keyboard Shortcuts", keys: "⌘/", run: () => setKeys("sheet") }, { label: "Video Vault Help", disabled: true }],
  };
  const frontApp = APPS[wm.front];
  const appMenu: MenuItem[] = [
    { label: `About ${frontApp.name}`, run: () => setModal("about") },
    "sep",
    { label: "Settings…", keys: "⌘,", run: () => wm.launch("settings") },
    "sep",
    { label: `Hide ${frontApp.name}`, keys: "⌘H", run: () => wm.minimize(wm.front) },
    ...(wm.front === "finder" ? [] : ["sep" as const, { label: `Quit ${frontApp.name}`, keys: "⌘Q", run: () => wm.close(wm.front) }]),
  ];
  const appleMenu: MenuItem[] = [
    { label: "About This Mac", run: () => setModal("about") },
    "sep",
    { label: "System Settings…", run: () => wm.launch("settings") },
    { label: "App Store…", disabled: true },
    "sep",
    { label: "Recent Items", disabled: true },
    "sep",
    { label: "Force Quit…", keys: "⌥⌘⎋", disabled: true },
    "sep",
    { label: "Sleep", run: () => setModal("sleep") },
    { label: "Restart…", run: () => location.reload() },
    { label: "Shut Down…", run: () => setModal("shutdown") },
    "sep",
    { label: "Lock Screen", keys: "^⌘Q", run: () => setModal("sleep") },
    { label: `Log Out ${userName}…`, keys: "⇧⌘Q", run: () => setModal("logout") },
  ];
  const otherMenus: Record<string, MenuItem[]> = {
    File: [{ label: "Close Window", keys: "⌘W", run: () => wm.close(wm.front) }],
    Edit: [{ label: "Undo", keys: "⌘Z", disabled: true }, { label: "Redo", keys: "⇧⌘Z", disabled: true }, "sep", { label: "Cut", keys: "⌘X", disabled: true }, { label: "Copy", keys: "⌘C", disabled: true }, { label: "Paste", keys: "⌘V", disabled: true }],
    View: [{ label: "Enter Full Screen", disabled: true }],
    Window: menus.Window,
    Help: menus.Help,
  };
  const barMenus = wm.front === "finder" ? menus : otherMenus;

  const isDefaultView = loc === "unfiled";

  return (
    <div className="fx fx-desktop" onPointerDown={e => (setMenuBar(null), setCtx(null), setPanel(null), (e.target as HTMLElement).closest(".fx-window,.fx-dock") || wm.focus("finder"))}>
      <WallLayer kind="mac" />
      <DesktopIcons folders={data.folders} onOpen={openDesktopFolder} />
      <div className="fx-menubar" onPointerDown={e => e.stopPropagation()}>
        <div>
          <button className="fx-mb-item" data-open={menuBar === "\u0000apple"} onClick={e => pick(menuBar === "\u0000apple" ? null : "\u0000apple", e)} onPointerEnter={e => menuBar && pick("\u0000apple", e)} aria-label="Apple menu"><AppleGlyph /></button>
          <button className="fx-mb-item bold" data-open={menuBar === "\u0000app"} onClick={e => pick(menuBar === "\u0000app" ? null : "\u0000app", e)} onPointerEnter={e => menuBar && pick("\u0000app", e)}>{frontApp.name}</button>
          {Object.keys(barMenus).map(name => (
            <button
              key={name}
              className="fx-mb-item"
              data-open={menuBar === name}
              onClick={e => pick(menuBar === name ? null : name, e)}
              onPointerEnter={e => menuBar && pick(name, e)}
            >
              {name}
            </button>
          ))}
        </div>
        <div>
          <button className="fx-mb-item" data-open={panel === "battery"} aria-label="Battery" onClick={() => (setMenuBar(null), setPanel(panel === "battery" ? null : "battery"))}>
            {battery ? <span className="fx-mb-pct">{Math.round(battery.level * 100)}%</span> : null}
            <BatteryGlyph level={battery?.level ?? 1} charging={battery?.charging} />
          </button>
          <button className="fx-mb-item" data-open={panel === "wifi"} aria-label="Wi-Fi" onClick={() => (setMenuBar(null), setPanel(panel === "wifi" ? null : "wifi"))}><WifiGlyph off={!wifi} /></button>
          <button className="fx-mb-item" aria-label="Spotlight" onClick={() => (setMenuBar(null), setPanel(null), setSpot(true))}><SearchGlyph /></button>
          <button className="fx-mb-item" data-open={panel === "cc"} aria-label="Control Center" onClick={() => (setMenuBar(null), setPanel(panel === "cc" ? null : "cc"))}><ControlGlyph /></button>
          <MenuClock open={panel === "date"} onClick={() => (setMenuBar(null), setPanel(panel === "date" ? null : "date"))} />
        </div>
      </div>
      {typeof document !== "undefined" && createPortal(
        <div className="fx fx-portal" onPointerDown={e => e.stopPropagation()}>
        {menuBar && (
          <div className="fx-menu" style={{ left: menuX + 10 }} onPointerDown={e => e.stopPropagation()}>
            <MenuList items={menuBar === "\u0000apple" ? appleMenu : menuBar === "\u0000app" ? appMenu : barMenus[menuBar] ?? []} close={() => setMenuBar(null)} />
          </div>
        )}
        {panel === "battery" && <Popover right={150} width={260}><BatteryPanel b={battery} openSettings={() => (setPanel(null), wm.launch("settings"))} /></Popover>}
        {panel === "wifi" && <Popover right={118} width={280}><WifiPanel on={wifi} setOn={() => setWifi(!wifi)} openSettings={() => (setPanel(null), wm.launch("settings"))} /></Popover>}
        {panel === "cc" && (
          <Popover right={8} width={346} cc>
            <ControlCenter dark={resolvedTheme === "dark"} setDark={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} wifi={wifi} setWifi={() => setWifi(!wifi)} openSettings={() => (setPanel(null), wm.launch("settings"))} />
          </Popover>
        )}
      </div>, document.body)}
      {panel === "date" && <DatePanel onClose={() => setPanel(null)} />}

      <AppWindow id="finder" wm={wm}>
          <aside className="fx-sidebar" onPointerDown={dragWindow}>
            <div>
              <div className="fx-side-h">Favorites</div>
              {(["all", "unfiled"] as const).map(id => (
                <button key={id} className="fx-side-row" aria-current={loc === id} onClick={() => go(id)}>
                  {id === "all" ? <Layers size={16} /> : <Inbox size={16} />}
                  <span>{id === "all" ? "All Videos" : "Unfiled"}</span>
                </button>
              ))}
            </div>
            <div>
              <div className="fx-side-h">Folders</div>
              {data.folders.map(f => (
                <button
                  key={f.id}
                  className="fx-side-row"
                  aria-current={loc === f.id}
                  data-drop={drop === `s${f.id}`}
                  onClick={() => go(f.id)}
                  onDragOver={e => (e.preventDefault(), setDrop(`s${f.id}`))}
                  onDragLeave={() => setDrop(null)}
                  onDrop={e => {
                    e.preventDefault();
                    setDrop(null);
                    const id = e.dataTransfer.getData(DRAG);
                    if (id) moveTo(id, f.id, e.altKey);
                  }}
                >
                  <SmallFolder />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </aside>
          <section className="fx-main" onPointerDown={e => e.target === e.currentTarget && setSel(null)}>
            <div className="fx-toolbar" onPointerDown={dragWindow}>
              <div className="fx-navpill fx-glass" data-nodrag>
                <button className="fx-nav" aria-label="Back" disabled={!history.back.length} onClick={back}><SFChevronLeft size={16} /></button>
                <i className="fx-nav-div" aria-hidden />
                <button className="fx-nav" aria-label="Forward" disabled={!history.fwd.length} onClick={fwd}><SFChevronRight size={16} /></button>
              </div>
              <div className="fx-title"><SmallFolder size={20} /><span>{folderName(loc)}</span></div>
              <div className="fx-tb-sp" />
              <div className="fx-seg fx-glass" data-nodrag>
                <button aria-label="as Icons" aria-pressed={view === "icons"} onClick={() => setView("icons")}><SFGrid /></button>
                <button aria-label="as List" aria-pressed={view === "list"} onClick={() => setView("list")}><SFList /></button>
              </div>
              <button className="fx-pill fx-glass" aria-label="New Folder" onClick={newFolder}><SFFolderPlus /></button>
              <Link href="/entries/new" className="fx-pill fx-glass" aria-label="New Entry" style={{ textDecoration: "none" }}><span className="fx-lbl">New Entry</span><span className="fx-plus" aria-hidden>+</span></Link>
              <div className="fx-search-w" data-nodrag>
                <SFSearch />
                <input className="fx-search fx-glass" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
            </div>

            <div
              className="fx-scroll"
              onPointerDown={e => e.target === e.currentTarget && setSel(null)}
              onContextMenu={e => {
                if (e.target !== e.currentTarget) return;
                e.preventDefault();
                setCtx({ x: e.clientX, y: e.clientY, items: [{ label: "New Folder", keys: "⇧⌘N", run: newFolder }, { label: "New Entry…", run: () => router.push("/entries/new") }] });
              }}
            >
              {!folders.length && !entries.length ? (
                <div className="fx-empty">{q ? "No Results" : isDefaultView ? "Everything is in a folder" : "This folder is empty"}</div>
              ) : view === "icons" ? (
                <div className="fx-grid" role="listbox" aria-label={folderName(loc)} onPointerDown={e => e.target === e.currentTarget && setSel(null)}>
                  {folders.map(f => {
                    const s = sel?.kind === "folder" && sel.id === f.id;
                    return (
                      <div
                        key={f.id}
                        role="option"
                        aria-selected={s}
                        className="fx-item"
                        data-drop={drop === f.id}
                        tabIndex={0}
                        onFocus={() => (wm.focus("finder"), setSel({ kind: "folder", id: f.id }))}
                        onPointerDown={e => (e.stopPropagation(), setSel({ kind: "folder", id: f.id }))}
                        onDoubleClick={() => go(f.id)}
                        onContextMenu={e => (e.preventDefault(), e.stopPropagation(), setSel({ kind: "folder", id: f.id }), setCtx({ x: e.clientX, y: e.clientY, items: itemMenu({ kind: "folder", id: f.id }) }))}
                        onDragOver={e => (e.preventDefault(), setDrop(f.id))}
                        onDragLeave={() => setDrop(null)}
                        onDrop={e => {
                          e.preventDefault();
                          setDrop(null);
                          const id = e.dataTransfer.getData(DRAG);
                          if (id) moveTo(id, f.id, e.altKey);
                        }}
                      >
                        <div className="ic"><FolderIcon id={`g${f.id.slice(0, 6)}`} /></div>
                        {renaming === f.id ? (
                          <RenameField initial={f.name} done={n => (setRenaming(null), n && n !== f.name && renameFolder(f.id, n))} />
                        ) : (
                          <span className="nm" onClick={() => s && setRenaming(f.id)}>{f.name}</span>
                        )}
                      </div>
                    );
                  })}
                  {entries.map(e => (
                    <EntryTile key={e.id} e={e} selected={sel?.kind === "entry" && sel.id === e.id} dragging={dragId === e.id} act={act} />
                  ))}
                </div>
              ) : (
                <table className="fx-list" style={{ tableLayout: "fixed" }}>
                  <thead><tr><th style={{ width: "58%" }}>Name</th><th>Kind</th><th style={{ width: 80 }}>Items</th></tr></thead>
                  <tbody>
                    {folders.map(f => (
                      <tr key={f.id} tabIndex={0} onFocus={() => (wm.focus("finder"), setSel({ kind: "folder", id: f.id }))} aria-selected={sel?.kind === "folder" && sel.id === f.id} onPointerDown={() => setSel({ kind: "folder", id: f.id })} onDoubleClick={() => go(f.id)}>
                        <td><span><SmallFolder size={16} />{renaming === f.id ? <RenameField initial={f.name} done={n => (setRenaming(null), n && n !== f.name && renameFolder(f.id, n))} /> : f.name}</span></td>
                        <td>Folder</td><td>{counts.get(f.id) ?? 0}</td>
                      </tr>
                    ))}
                    {entries.map(e => (
                      <EntryRow key={e.id} e={e} selected={sel?.kind === "entry" && sel.id === e.id} act={act} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="fx-status">
              {folders.length + entries.length} items{sel ? `, 1 selected` : ""}
            </div>
          </section>
      </AppWindow>

      <AppWindow id="notes" wm={wm}><MemoNotes drag={dragNotes} /></AppWindow>
      <AppWindow id="calculator" wm={wm} className="fx-calc-win"><MemoCalculator drag={dragCalc} /></AppWindow>
      <AppWindow id="settings" wm={wm}><MemoSettings userName={userName} drag={dragSettings} signOut={askLogout} /></AppWindow>

      <Dock wm={wm} />

      {spot && (
        <Spotlight
          data={data}
          close={() => setSpot(false)}
          openApp={id => wm.launch(id as AppId)}
          openEntry={openEntry}
          openFolder={id => (wm.launch("finder"), go(id))}
          searchFinder={q => (wm.launch("finder"), setQuery(q))}
        />
      )}

      {keys && <ShortcutsOverlay held={keys === "hold"} onClose={() => setKeys(null)} />}
      {modal === "about" && (
        <div className="fx-sheet-back" onClick={() => setModal(null)}>
          <div className="fx-sheet fx-glass" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "4px 0", fontSize: 15 }}>Video Vault</h3>
            <p style={{ margin: "0 0 4px", color: "var(--fx-label-2)", fontSize: 11 }}>{userName}</p>
            <p style={{ margin: "0 0 14px", color: "var(--fx-label-2)", fontSize: 11 }}>{data.entries.length} videos · {data.folders.length} folders</p>
            <button className="fx-btn primary" onClick={() => setModal(null)}>OK</button>
          </div>
        </div>
      )}
      {modal === "logout" && (
        <div className="fx-sheet-back" onClick={() => setModal(null)}>
          <div className="fx-sheet fx-glass" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "4px 0 14px", fontSize: 13 }}>Are you sure you want to log out {userName}?</h3>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="fx-btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="fx-btn primary" onClick={signOut}>Log Out</button>
            </div>
          </div>
        </div>
      )}
      {(modal === "sleep" || modal === "shutdown") && (
        <div className="fx-black" onClick={() => (modal === "shutdown" ? location.reload() : setModal(null))} onKeyDown={() => setModal(null)} tabIndex={0} role="button" aria-label="Wake">
          {modal === "shutdown" ? null : null}
        </div>
      )}

      <Dimmer />

      {ctx && (
        <div className="fx-menu" style={{ left: ctx.x, top: ctx.y }} onPointerDown={e => e.stopPropagation()}>
          <MenuList items={ctx.items} close={() => setCtx(null)} />
        </div>
      )}

      {quick && (
        <div className="fx-ql" onClick={() => setQuick(null)}>
          <div onClick={e => e.stopPropagation()}>
            <header>{quick.title}</header>
            <iframe
              title={quick.title}
              src={`https://www.youtube-nocookie.com/embed/${quick.youtubeId}?rel=0`}
              allow="accelerometer; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {confirm && (
        <div className="fx-sheet-back" onClick={() => setConfirm(null)}>
          <div className="fx-sheet fx-glass" onClick={e => e.stopPropagation()}>
            <FolderIcon size={48} id="cf" />
            <h3 style={{ margin: "10px 0 4px", fontSize: 13 }}>Delete “{folderName(confirm)}”?</h3>
            <p style={{ margin: "0 0 14px", color: "var(--fx-label-2)", fontSize: 11 }}>The videos stay in All Videos. Only the folder is removed.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="fx-btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="fx-btn primary" onClick={() => (deleteFolder(confirm), setConfirm(null), loc === confirm && go("all"))}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {lib.error && (
        <div className="fx-toast fx-glass" role="alert" onClick={lib.clearError}>{lib.error}</div>
      )}
    </div>
  );
}

function RenameField({ initial, done }: { initial: string; done: (name: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      className="fx-rename"
      aria-label="Rename folder"
      defaultValue={initial}
      onPointerDown={e => e.stopPropagation()}
      onBlur={e => done(e.currentTarget.value.trim())}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") (e.currentTarget.value = initial, e.currentTarget.blur());
      }}
    />
  );
}

const SearchGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.350" strokeLinecap="round" aria-hidden>
    <circle cx="6" cy="6" r="4.300" /><path d="m9.300 9.300 3 3" />
  </svg>
);

const DesktopIcons = memo(function DesktopIcons({ folders, onOpen }: { folders: { id: string; name: string }[]; onOpen: (id: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const list = [{ id: "all", name: "All Videos" }, ...folders.slice(0, 4)];
  return (
    <div className="fx-deskicons" onPointerDown={e => (e.stopPropagation(), setSel(null))}>
      {list.map(f => (
        <div key={f.id} className="fx-item" role="button" tabIndex={0} aria-selected={sel === f.id} onPointerDown={e => (e.stopPropagation(), setSel(f.id))} onDoubleClick={() => onOpen(f.id)} onKeyDown={e => e.key === "Enter" && onOpen(f.id)}>
          <div className="ic"><FolderIcon id={`d${f.id.slice(0, 6)}`} /></div>
          <span className="nm">{f.name}</span>
        </div>
      ))}
    </div>
  );
});
