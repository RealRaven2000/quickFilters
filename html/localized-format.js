/* Shared localized formatting for extension HTML pages. */
/* globals getSaleEndLabel */
/* exported formatAll, parseHTMLFragment, formatLocalizedMarkdown, formatLocalizedElements */
"use strict";

function formatLocalizedMarkdown(element) {
  const parts = replaceNested(element.textContent).split(/(`[^`\r\n]+`|\*\*[^*`]+\*\*|(?<!\*)\*[^*`]+\*(?!\*))/);
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    const bold = /^\*\*[^*]+\*\*$/.test(part);
    const italic = /^\*[^*]+\*$/.test(part);
    const code = /^`[^`\r\n]+`$/.test(part);
    if (code || bold || italic) {
      const formatted = document.createElement(code ? "code" : bold ? "strong" : "em");
      if (code) {
        formatted.className = "inline";
      }
      const markerLength = bold ? 2 : 1;
      formatted.textContent = part.slice(markerLength, -markerLength);
      fragment.appendChild(formatted);
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }
  element.replaceChildren(fragment);
}

function replaceNested(text) {
  let result = text;
  const maxLoops = 5; // prevent infinite recursion

  for (let i = 0; i < maxLoops; i++) {
    let changed = false;

    result = result.replace(/\{\+([\w.]+)\}/g, (_, id) => {
      // replace is streaming results from 1st capturing group:
      // (fullMatch, group1, index, originalString)
      const replacement = messenger.i18n.getMessage(id) || `{+${id}}`;
      if (replacement !== `{+${id}}`) {
        changed = true;
      }
      return replacement;
    });

    if (!changed) {
      break;
    }
  }

  return result;
}

function specialAttributes(str, content) {
  if (!str) {
    return "";
  }

  let out = [];
  let title;

  for (const p of str.split(/\s+/)) {
    const [k, v] = p.split("=");

    if (!k || !v) {
      continue;
    }

    if (k === "class" && v.includes("maintenance")) {
      // for class=maintenance the tag contains the maintenance version number!
      const tooltip = messenger.i18n.getMessage("whats-new-maintenance", [content]);
      title = `title="${tooltip}"`;
    }

    out.push(`${k}="${v}"`);
  }
  if (title) {
    out.push(title);
  }

  return out.join(" ");
}

// eslint-disable-next-line no-unused-vars
function formatAll(txt) {
  if (!txt) {
    return "";
  }
  let localizedMsg = replaceNested(txt)
    .replace(/<(.*?)>/g, "<span class='htmltag'>&lt;$1&gt;</span>")
    .replace(
      // eslint-disable-next-line no-useless-escape
      /\{support(?: ([\w\-]+))?\}/g,
      (dummy, topic) => `<a class='contactsupport' data-topic='${topic || ""}' href='#'>`
    )
    .replace(/\{\/support\}/g, "</a>");

  let salesEnd = "";
  if (typeof getSaleEndLabel === "function") {
    salesEnd = getSaleEndLabel();
  }

  // added simple <tag> support
  return localizedMsg
    .replace(/\{\+([^}]+)\}/g, (_, messageKey) => messenger.i18n.getMessage(messageKey))
    .replace(/\{L(?:\s+([^}]+))?\}/g, (_, attrs) => {
      // attrs will be undefined if no class specified
      return attrs ? `<li ${attrs}>` : "<li>";
    })
    .replace(/\{\/L\}/g, "</li>")
    .replace(/\{salesEnd\}/g, salesEnd)
    .replace(/\{h3\}/g, "<h3>")
    .replace(/\{\/h3\}/g, "</h3>")
    .replace(/\{bold\}/g, "<b>")
    .replace(/\{\/bold\}/g, "</b>")
    .replace(/\{b(?:\s+([^}]+))?\}(.*?)\{\/b\}/g, (_, attrs, content) => {
      const attrStr = attrs ? specialAttributes(attrs, content) : "";
      return attrStr ? `<b ${attrStr}>${content}</b>` : `<b>${content}</b>`;
    })
    .replace(/\{hr\}/g, "<hr>")
    .replace(/\{pre\}/g, "<pre>")
    .replace(/\{preEnd\}/g, "</pre>")
    .replace(/\{italic\}/g, "<i>")
    .replace(/\{\/italic\}/g, "</i>")
    .replace(/\{i\}/g, "<i>")
    .replace(/\{\/i\}/g, "</i>")
    .replace(/\{emph\}/g, "<span class='important'>")
    .replace(/\{\/emph\}/g, "</span>")
    .replace(/\{\{(%.*?%)\}\}/g, "<code>$1</code>")
    .replace(/\{\{(.*?)\}\}/g, "<code param>$1</code>")
    .replace(/\{U\}/g, "<ul>")
    .replace(/\{\/U\}/g, "</ul>")
    .replace(/\{P(?:\s+([^}]+))?\}/g, (_, attrs) => {
      // attrs will be undefined if no class specified
      return attrs ? `<p ${attrs}>` : "<p>";
    })
    .replace(
      /\{ARelease\}/g,
      "<a href='https://blog.thunderbird.net/2025/03/thunderbird-release-channel-update/'>"
    )
    .replace(
      /\{AcompatCheck\}/g,
      "<a href='https://addons.thunderbird.net/thunderbird/addon/addon-compatibility-check/' class='native'>"
    )
    .replace("$news.minimal$", messenger.i18n.getMessage("news.minimal"))
    .replace(/\{\/A\}/g, "</a>")
    .replace(/\{\/P\}/g, "</p>")
    .replace(/\{aSnippets\}/g, "<a class='snippets-settings' href='#'>")
    .replace(/\{a ([^}]+?)\}/g, "<a $1>")
    .replace(/\{\/a\}/gi, "</a>")
    .replace(/\{addonName\}/g, "quickFilters")
    .replace(/\{createFilterFromMessage\}/g, messenger.i18n.getMessage("FromMessage.label"))
    .replace(/\{autoMerge\}/g, messenger.i18n.getMessage("chkMergeAuto.label"))
    .replace(/\{code\}(.*?)\{\/code\}/g, "<code>$1</code>")
    .replace(/\{br\}/g, "<br>")
    .replace(/\{sect\}/g, "</ul> <h3 class='section'>")
    .replace(/\{\/sect\}/g, "</h3> <ul>")
    .replace(/\[issue (\d*)\]/g, "<a class='issue' no='$1' href='#'>[issue $1]</a>")
    .replace(/\[Bugzilla (\d*)\]/g, "<a class='bugzilla' no='$1' href='#'>[Bugzilla $1]</a>")
    .replace(/\[(.)\]/g, "<code class='keystroke'>$1</code>") // single keys [A] [1]
    .replace(/\[\[([^\]]+)\]\]/g, "<code class='keystroke'>$1</code>"); // larger keys [[Cancel]] [[Ctrl]]
  // DANGEROUS .replaceAll("''", '"');
  // {sect}Section title{/sect} starts a new section and list.
}

function parseHTMLFragment(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // Spread childNodes to an array to avoid live list mutation issues
  const nodes = [...doc.body.childNodes];
  const fragment = document.createDocumentFragment();
  // appendChild moves nodes from doc.body to fragment (not cloned)
  nodes.forEach((node) => fragment.appendChild(node));
  return fragment;
}

// Call after i18n.updateDocument(); mark only dedicated text leaves.
// eslint-disable-next-line no-unused-vars
function formatLocalizedElements(root = document) {
  for (const element of root.querySelectorAll(".localized-markup")) {
    element.replaceChildren(parseHTMLFragment(formatAll(element.textContent)));
  }
  for (const element of root.querySelectorAll(".localizedFormatting")) {
    formatLocalizedMarkdown(element);
  }
}
