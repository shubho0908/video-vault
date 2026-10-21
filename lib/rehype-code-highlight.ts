import type { Element, ElementContent, Root } from "hast";
import { toText } from "hast-util-to-text";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

/**
 * Syntax highlighting for fenced code in notes. Same output as `rehype-highlight` with its defaults
 * (`hljs` + `hljs-*` classes, `language-*` / `lang-*` fences, `no-highlight` opt-out, no auto-detect),
 * with two differences that only affect cost:
 *
 * - An explicit grammar list instead of highlight.js's ~37-language `common` bundle. rehype-highlight
 *   imports `common` unconditionally, so passing it a smaller `languages` map would not shrink the client
 *   bundle; importing `createLowlight` alone lets the bundler drop the rest.
 * - One lowlight instance for the module. react-markdown builds a fresh unified processor on every render,
 *   and rehype-highlight creates (and re-registers every grammar on) a new highlighter each time, which
 *   also throws away highlight.js's compiled-grammar cache.
 *
 * Each grammar keeps its built-in aliases (js/jsx/mjs, ts/tsx, sh/zsh, html/svg, py, yml, md, …). A fence
 * in any other language renders as a plain code block, as an unregistered language did before.
 */
const lowlight = createLowlight({
  bash,
  c,
  cpp,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  plaintext,
  python,
  rust,
  shell,
  sql,
  typescript,
  xml,
  yaml,
});

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
