import type { Element, ElementContent, Root } from "hast";
import { toText } from "hast-util-to-text";
import { common, createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

// Reuse registered grammars across Markdown renders instead of rebuilding the highlighter each time.
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
