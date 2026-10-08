"use client";

/** Only shortcuts that are actually wired up. Keep in sync with the key handlers in mac-desktop.tsx and entry-scene.tsx. */
export const SHORTCUTS: { title: string; items: [string, string][] }[] = [
  {
    title: "Finder",
    items: [
      ["New Entry", "⌘N"],
      ["New Folder", "⇧⌘N"],
      ["Open", "⌘↓"],
      ["Rename Folder", "↩"],
      ["Quick Look", "Space"],
      ["as Icons", "⌘1"],
      ["as List", "⌘2"],
      ["Back", "⌘["],
      ["Forward", "⌘]"],
    ],
  },
  {
    title: "Windows",
    items: [
      ["Close Window", "⌘W"],
      ["Minimize", "⌘M"],
      ["Spotlight", "⌘Space"],
      ["Settings", "⌘,"],
      ["Dismiss Menu or Dialog", "esc"],
    ],
  },
  {
    title: "Entry Window",
    items: [
      ["Save", "⌘S"],
      ["Close", "⌘W"],
      ["Close (not while typing notes)", "esc"],
      ["Bold / Italic (editor)", "⌘B / ⌘I"],
      ["Undo / Redo (editor)", "⌘Z / ⇧⌘Z"],
      ["Blocks (editor)", "/"],
    ],
  },
  { title: "Help", items: [["Keyboard Shortcuts", "⌘/"]] },
];

export function ShortcutsOverlay({ held, onClose }: { held: boolean; onClose: () => void }) {
  return (
    <div className="fx-keys-back" data-held={held} onClick={held ? undefined : onClose} role="dialog" aria-label="Keyboard Shortcuts">
      <div className="fx-keys fx-glass" onClick={e => e.stopPropagation()}>
        <h3>Keyboard Shortcuts</h3>
        <div className="fx-keys-cols">
          {SHORTCUTS.map(g => (
            <section key={g.title}>
              <h4>{g.title}</h4>
              {g.items.map(([name, keys]) => (
                <div key={name} className="fx-keys-row"><span>{name}</span><kbd>{keys}</kbd></div>
              ))}
            </section>
          ))}
        </div>
        {!held ? <p>Hold ⌘ for a second at any time to peek at this list. Press esc to close.</p> : null}
      </div>
    </div>
  );
}
