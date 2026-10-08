"use client";

import { useSyncExternalStore } from "react";
import { notes as seed } from "@/lib/notes-content";

/** Local-only notes. Source of truth in memory, mirrored to localStorage (debounced). */
export type Note = { id: string; body: string; updated: number };

const KEY = "vv-notes-v1";
const seedNotes: Note[] = seed.map(n => ({ id: n.id, body: n.body, updated: Date.parse(n.updated) || 0 }));

let state: Note[] = seedNotes;
let loaded = false;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

const valid = (v: unknown): v is Note[] =>
  Array.isArray(v) && v.every(n => n && typeof n.id === "string" && typeof n.body === "string" && typeof n.updated === "number");

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (valid(parsed)) state = parsed;
    }
  } catch {
    /* unreadable storage or bad JSON: keep the seed */
  }
  if (!listening) {
    listening = true;
    addEventListener("pagehide", flush);
    addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  }
}

function flush() {
  clearTimeout(timer);
  timer = undefined;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode: the in-memory copy still works */
  }
}

function commit(next: Note[]) {
  state = next;
  subs.forEach(f => f());
  clearTimeout(timer);
  timer = setTimeout(flush, 300);
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
const snapshot = () => (load(), state);
const serverSnapshot = () => seedNotes;

export const noteActions = {
  create(): string {
    load();
    const id = `n-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    commit([{ id, body: "", updated: Date.now() }, ...state]);
    return id;
  },
  update(id: string, body: string) {
    load();
    const cur = state.find(n => n.id === id);
    if (!cur || cur.body === body) return;
    commit([{ id, body, updated: Date.now() }, ...state.filter(n => n.id !== id)]);
  },
  remove(id: string) {
    load();
    if (state.some(n => n.id === id)) commit(state.filter(n => n.id !== id));
  },
};

export const useNotes = () => useSyncExternalStore(subscribe, snapshot, serverSnapshot);

export const noteTitle = (body: string) => body.split("\n").find(l => l.trim())?.replace(/^[#>*\-\s]+/, "").trim().slice(0, 80) || "New Note";
export const notePreview = (body: string) => {
  const ls = body.split("\n").filter(l => l.trim());
  return ls[1]?.replace(/^[#>*\-\s]+/, "").trim().slice(0, 60) || "No additional text";
};
export const noteDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
export const noteShortDate = (t: number) => {
  const d = new Date(t), now = new Date();
  return d.toDateString() === now.toDateString() ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
