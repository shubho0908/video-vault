"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  createFolderAction,
  deletePlaylistAction,
  placeEntryAction,
  renameFolderAction,
} from "@/app/actions";
import { bus } from "./lib-bus";

export type LibEntry = {
  id: string;
  title: string;
  topic: string;
  youtubeId: string;
};
export type LibFolder = { id: string; name: string };
export type Membership = { playlistId: string; entryId: string };
export type LibraryData = {
  entries: LibEntry[];
  folders: LibFolder[];
  memberships: Membership[];
};
export type Location = "all" | "unfiled" | (string & {});

type Result = { ok: boolean; error?: string };
type Commands = {
  create: (name: string) => Promise<{ ok: boolean; id?: string; error?: string }>;
  rename: (id: string, name: string) => Promise<Result>;
  place: (input: { entryId: string; fromId: string | null; toId: string | null }) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
};

export const serverCommands: Commands = {
  create: createFolderAction,
  rename: renameFolderAction,
  place: placeEntryAction,
  remove: deletePlaylistAction,
};

type Op = { apply: (d: LibraryData) => LibraryData };
let tmpN = 0;

// Layer pending operations over confirmed state; rolling back one operation must preserve the others.
export function useLibrary(initial: LibraryData, commands: Commands = serverCommands) {
  const [base, setBase] = useState(initial);
  const [ops, setOps] = useState<Op[]>([]);
  const [error, setError] = useState<string | null>(null);
  const real = useRef(new Map<string, string>());
  const creating = useRef(new Map<string, Promise<string | null>>());
  const ui = useRef(new Map<string, string>());
  const shared = useSyncExternalStore(bus.subscribe, bus.get, bus.get);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    const keep = (id: string) => ui.current.get(id) ?? id;
    setBase({
      entries: initial.entries,
      folders: initial.folders.map(f => ({ ...f, id: keep(f.id) })),
      memberships: initial.memberships.map(m => ({ ...m, playlistId: keep(m.playlistId) })),
    });
    bus.prune(initial.entries);
  }, [initial]);

  const data = useMemo(() => {
    const folded = ops.reduce((d, o) => o.apply(d), base);
    const seen = new Set(folded.entries.map(e => e.id));
    const entries = [
      ...folded.entries.filter(e => !shared.removed.has(e.id)).map(e => (shared.patched[e.id] ? { ...e, ...shared.patched[e.id] } : e)),
      ...shared.added.filter(e => !seen.has(e.id)),
    ];
    return { ...folded, entries };
  }, [base, ops, shared]);

  const run = useCallback((apply: Op["apply"], call: () => Promise<Result>) => {
    const op: Op = { apply };
    setOps(o => [...o, op]);
    call()
      .catch(() => ({ ok: false, error: "Something went wrong." }))
      .then(res => {
        if (res.ok) setBase(apply);
        else setError(res.error ?? "Something went wrong.");
        setOps(o => o.filter(x => x !== op));
      });
  }, []);

  const serverId = useCallback(async (id: string) => (await creating.current.get(id)) ?? real.current.get(id) ?? id, []);

  const filedIds = useMemo(() => new Set(data.memberships.map(m => m.entryId)), [data.memberships]);
  const byFolder = useMemo(() => {
    const m = new Map<string, Set<string>>();
    data.memberships.forEach(x => (m.get(x.playlistId) ?? m.set(x.playlistId, new Set()).get(x.playlistId)!).add(x.entryId));
    return m;
  }, [data.memberships]);

  const entriesIn = useCallback(
    (loc: Location) => {
      if (loc === "all") return data.entries;
      if (loc === "unfiled") return data.entries.filter(e => !filedIds.has(e.id));
      const ids = byFolder.get(loc);
      return ids ? data.entries.filter(e => ids.has(e.id)) : [];
    },
    [data.entries, filedIds, byFolder]
  );

  const createFolder = useCallback(
    async (name: string) => {
      const id = `tmp-${++tmpN}`;
      const add = (d: LibraryData): LibraryData => (d.folders.some(f => f.id === id) ? d : { ...d, folders: [...d.folders, { id, name }] });
      const pending = commands
        .create(name)
        .catch(() => ({ ok: false, id: undefined, error: "Something went wrong." }))
        .then(res => {
          creating.current.delete(id);
          if (res.ok && res.id) {
            real.current.set(id, res.id);
            ui.current.set(res.id, id);
            return res.id;
          }
          setError(res.error ?? "Could not create the folder.");
          return null;
        });
      creating.current.set(id, pending);
      const op: Op = { apply: add };
      setOps(o => [...o, op]);
      pending.then(rid => {
        if (rid) setBase(add);
        setOps(o => o.filter(x => x !== op));
      });
      return id;
    },
    [commands]
  );

  const failMissing = { ok: false, error: "The folder was not created." } as const;

  const renameFolder = (id: string, name: string) =>
    run(
      d => ({ ...d, folders: d.folders.map(f => (f.id === id ? { ...f, name } : f)) }),
      async () => {
        const sid = await serverId(id);
        return sid === id && id.startsWith("tmp-") ? failMissing : commands.rename(sid, name);
      }
    );

  const deleteFolder = (id: string) =>
    run(
      d => ({
        ...d,
        folders: d.folders.filter(f => f.id !== id),
        memberships: d.memberships.filter(m => m.playlistId !== id),
      }),
      async () => {
        const sid = await serverId(id);
        return sid === id && id.startsWith("tmp-") ? failMissing : commands.remove(sid);
      }
    );

  const place = (entryId: string, fromId: string | null, toId: string | null) =>
    run(
      d => ({
        ...d,
        memberships: [
          ...d.memberships.filter(m => !(fromId && fromId !== toId && m.playlistId === fromId && m.entryId === entryId)),
          ...(toId && !d.memberships.some(m => m.playlistId === toId && m.entryId === entryId) ? [{ playlistId: toId, entryId }] : []),
        ],
      }),
      async () => {
        const [from, to] = await Promise.all([fromId ? serverId(fromId) : null, toId ? serverId(toId) : null]);
        if ((fromId && from === fromId && fromId.startsWith("tmp-")) || (toId && to === toId && toId.startsWith("tmp-"))) return failMissing;
        return commands.place({ entryId, fromId: from, toId: to });
      }
    );

  const clearError = useCallback(() => (setError(null), bus.clearError()), []);

  return { data, error: error ?? shared.error, clearError, entriesIn, createFolder, renameFolder, deleteFolder, place };
}

export const thumb = (youtubeId: string) =>
  `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;

export function spring(response: number, damping: number, steps = 40) {
  const w = (2 * Math.PI) / response;
  const z = damping;
  const pts: string[] = [];
  let end = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * response * 2.2;
    const wd = w * Math.sqrt(Math.max(1 - z * z, 0));
    const v =
      z >= 1
        ? 1 - (1 + w * t) * Math.exp(-w * t)
        : 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
    pts.push(v.toFixed(4));
    end = v;
  }
  pts[pts.length - 1] = "1";
  void end;
  return { easing: `linear(${pts.join(",")})`, duration: Math.round(response * 2.2 * 1000) };
}
