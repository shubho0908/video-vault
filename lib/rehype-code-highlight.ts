import type { Element, ElementContent, Root } from "hast";
import { toText } from "hast-util-to-text";
import { common, createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

/**
 * Syntax highlighting for fenced code in notes. Same output and the same language set as
 * `rehype-highlight` with its defaults (highlight.js `common`: `hljs` + `hljs-*` classes, `language-*` /
 * `lang-*` fences, `no-highlight` opt-out, no auto-detect). The difference is cost: one lowlight instance
 * for the module. react-markdown builds a fresh unified processor on every render, and rehype-highlight
 * created (and re-registered every grammar on) a new highlighter each time, which also threw away
 * highlight.js's compiled-grammar cache.
 */
const lowlight = createLowlight(common);

function fenceLanguage(node: Element): string | false | undefined {
  const list = node.properties.className;
  if (!Array.isArray(list)) return undefined;
  let name: string | undefined;
  for (const item of list) {
    const value = String(item);
    if (value === "no-highlight" || value === "nohighlight") return false;
    if (!name && value.startsWith("lang-")) name = value.slice(5);
    if (!name && value.startsWith("language-")) name = value.slice(9);
  }
  return name;
}

export function rehypeCodeHighlight() {
  return function transform(tree: Root) {
    visit(tree, "element", (node, _index, parent) => {
      if (
        node.tagName !== "code" ||
        !parent ||
        parent.type !== "element" ||
        parent.tagName !== "pre"
      ) {
        return;
      }

      const lang = fenceLanguage(node);
      if (!lang) return;

      if (!Array.isArray(node.properties.className))
        node.properties.className = [];
      if (!node.properties.className.includes("hljs")) {
        node.properties.className.unshift("hljs");
      }
      // Unregistered language: keep the `hljs` class but leave the text unhighlighted, like
      // rehype-highlight (which only records a file message in that case).
      if (!lowlight.registered(lang)) return;

      const result = lowlight.highlight(
        lang,
        toText(node, { whitespace: "pre" })
      );
      if (result.children.length > 0) {
        node.children = result.children as ElementContent[];
      }
    });
  };
}
