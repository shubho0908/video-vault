"use client";

import { useEffect, useRef, useState } from "react";

import { noteActions, noteDate, notePreview, noteShortDate, noteTitle, useNotes, type Note } from "@/lib/notes-store";
import { SmallFolder } from "./icons";
import { SFChevronLeft, SFCompose, SFTrash } from "./sf";

type Drag = (e: React.PointerEvent) => void;

function useDiscardEmpty(id: string | null | undefined, notes: Note[]) {
  const prev = useRef<string | null | undefined>(undefined);
  const live = useRef(notes);
  live.current = notes;
  useEffect(() => {
    const p = prev.current;
    prev.current = id;
    if (p && p !== id && live.current.find(n => n.id === p)?.body.trim() === "") noteActions.remove(p);
  }, [id]);
  useEffect(() => () => {
    const p = prev.current;
    if (p && live.current.find(n => n.id === p)?.body.trim() === "") noteActions.remove(p);
  }, []);
}

export function NotesApp({ drag }: { drag: Drag }) {
  const notes = useNotes();
  const [sel, setSel] = useState<string | null>(null);
  const cur = notes.find(n => n.id === sel) ?? notes[0];
  useDiscardEmpty(cur?.id, notes);
  const ta = useRef<HTMLTextAreaElement>(null);
  const add = () => { setSel(noteActions.create()); requestAnimationFrame(() => ta.current?.focus()); };
  const del = () => {
    if (!cur) return;
    const i = notes.findIndex(n => n.id === cur.id);
    setSel(notes[i + 1]?.id ?? notes[i - 1]?.id ?? null);
    noteActions.remove(cur.id);
  };
  return (
    <>
      <aside className="fx-sidebar" style={{ width: 190 }} onPointerDown={drag}>
        <div>
          <div className="fx-side-h">iCloud</div>
          <button className="fx-side-row" aria-current="true" style={{ width: "100%" }}><SmallFolder /><span>All Notes</span><small style={{ marginLeft: "auto", color: "var(--fx-label-2)" }}>{notes.length}</small></button>
        </div>
      </aside>
      <section className="fx-notes-list" onPointerDown={drag}>
        <div className="fx-notes-h">All Notes<small>{notes.length} note{notes.length === 1 ? "" : "s"}</small></div>
        <div>
          {notes.map(n => (
            <button key={n.id} className="fx-notes-row" aria-selected={n.id === cur?.id} onClick={() => setSel(n.id)} data-nodrag>
              <b>{noteTitle(n.body)}</b>
              <span>{noteShortDate(n.updated)} · {notePreview(n.body)}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="fx-main fx-notes-editor">
        <div className="fx-notes-tools" data-nodrag>
          <button className="fx-pill" aria-label="Delete Note" disabled={!cur} onClick={del}><SFTrash /></button>
          <button className="fx-pill" aria-label="New Note" onClick={add}><SFCompose /></button>
        </div>
        {cur ? (
          <>
            <div className="fx-md-date">{noteDate(cur.updated)}</div>
            <textarea ref={ta} key={cur.id} className="fx-notes-ta" data-nodrag value={cur.body} placeholder="New Note" spellCheck
              onChange={e => noteActions.update(cur.id, e.target.value)} />
          </>
        ) : (
          <div className="fx-empty">No Note Selected</div>
        )}
      </section>
    </>
  );
}

export function NotesIos() {
  const notes = useNotes();
  const [id, setId] = useState<string | null>(null);
  const n = notes.find(x => x.id === id);
  useDiscardEmpty(id, notes);
  if (n) {
    return (
      <div className="fx-ios-app-page fx-ios-notepage">
        <button className="fx-ios-back" onClick={() => setId(null)}><SFChevronLeft size={15} /> Notes</button>
        <button className="fx-ios-trash" aria-label="Delete Note" onClick={() => { noteActions.remove(n.id); setId(null); }}><SFTrash size={20} /></button>
        <div className="fx-md-date">{noteDate(n.updated)}</div>
        <textarea autoFocus={n.body === ""} className="fx-notes-ta fx-notes-ta-ios" value={n.body} placeholder="New Note" onChange={e => noteActions.update(n.id, e.target.value)} />
      </div>
    );
  }
  return (
    <div className="fx-ios-app-page">
      <h1 className="fx-ios-large">Notes</h1>
      <div className="fx-ios-group">
        {notes.map(x => <button key={x.id} className="fx-ios-nrow" onClick={() => setId(x.id)}><b>{noteTitle(x.body)}</b><span>{noteShortDate(x.updated)} · {notePreview(x.body)}</span></button>)}
        {notes.length === 0 && <div className="fx-ios-nrow"><span>No Notes</span></div>}
      </div>
      <button className="fx-ios-compose" aria-label="New Note" onClick={() => setId(noteActions.create())}><SFCompose size={22} /></button>
    </div>
  );
}
