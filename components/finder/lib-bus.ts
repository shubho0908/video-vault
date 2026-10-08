import type { LibEntry } from "./library";

/**
 * Tiny shared store so the entry window (rendered in its own route slot) can show
 * creates, edits and deletes in the Finder on the same frame, before the server answers.
 * Module state lives for the browser session only; server refreshes prune it.
 */
type S = { added: LibEntry[]; removed: ReadonlySet<string>; patched: Record<string, Partial<LibEntry>>; error: string | null };
const empty: S = { added: [], removed: new Set(), patched: {}, error: null };
let s: S = empty;
const subs = new Set<() => void>();
const set = (n: Partial<S>) => {
  s = { ...s, ...n };
  subs.forEach(f => f());
};

export const bus = {
  get: () => s,
  subscribe: (f: () => void) => (subs.add(f), () => void subs.delete(f)),
  add: (e: LibEntry) => set({ added: [...s.added.filter(x => x.id !== e.id), e] }),
  settle: (tmp: string, id: string) => set({ added: s.added.map(x => (x.id === tmp ? { ...x, id } : x)) }),
  drop: (id: string) => set({ added: s.added.filter(x => x.id !== id) }),
  remove: (id: string) => set({ removed: new Set(s.removed).add(id) }),
  restore: (id: string) => {
    const r = new Set(s.removed);
    r.delete(id);
    set({ removed: r });
  },
  patch: (id: string, p: Partial<LibEntry>) => set({ patched: { ...s.patched, [id]: { ...s.patched[id], ...p } } }),
  unpatch: (id: string) => {
    const { [id]: _drop, ...rest } = s.patched;
    set({ patched: rest });
  },
  fail: (error: string) => set({ error }),
  clearError: () => s.error && set({ error: null }),
  /** Called when fresh server data arrives: drop whatever the server now confirms. */
  prune: (entries: LibEntry[]) => {
    if (s === empty || (!s.added.length && !s.removed.size && !Object.keys(s.patched).length)) return;
    const ids = new Set(entries.map(e => e.id));
    const patched: S["patched"] = {};
    for (const [id, p] of Object.entries(s.patched)) {
      const cur = entries.find(e => e.id === id);
      if (cur && Object.entries(p).some(([k, v]) => cur[k as keyof LibEntry] !== v)) patched[id] = p;
    }
    set({ added: s.added.filter(x => !ids.has(x.id)), removed: new Set([...s.removed].filter(id => ids.has(id))), patched });
  },
};
