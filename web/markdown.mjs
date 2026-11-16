/**
 * EFSS Markdown preview subset.
 * Rendering is escape-first; Markdown source is never rewritten by this module.
 * Intentionally no HTML passthrough, image loading, scripting or dependencies.
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  })[char]);
}

export function renderInline(source) {
  const protectedFragments = [];
  const protect = (html) => {
    const index = protectedFragments.push(html) - 1;
    return "\uE000" + index + "\uE001";
  };
  let text = escapeHtml(source);

  // Protected tokens prevent formatting inside links and code spans.
  text = text.replace(/(\x60+)([^\n]*?)\1/g, (_, marks, code) =>
    protect("<code>" + code + "</code>")
  );
  text = text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s()<>"']+)\)/gi,
    (match, label, url) =>
      /^https?:\/\//i.test(url)
        ? protect('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + "</a>")
        : match
  );

  text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  text = text.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  text = text.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");

  return text.replace(/\uE000(\d+)\uE001/g, (match, index) =>
    protectedFragments[Number(index)] ?? match
  );
}

const CALLOUTS = new Set(["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]);
const FENCE = /^\s{0,3}(\x60{3,}|~{3,})(.*)$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.+)$/;
const RULE = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const BULLET = /^\s{0,3}[-*+]\s+(.*)$/;
const NUMBERED = /^\s{0,3}\d+[.)]\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;

function startsBlock(line) {
  return Boolean(
    FENCE.test(line) || HEADING.test(line) || RULE.test(line)
    || BULLET.test(line) || NUMBERED.test(line) || QUOTE.test(line)
  );
}

function renderList(lines, start, ordered) {
  const parts = [];
  const pattern = ordered ? NUMBERED : BULLET;
  let i = start;
  while (i < lines.length) {
    const match = lines[i].match(pattern);
    if (!match) break;
    const task = !ordered && match[1].match(/^\[([ xX])\]\s+(.*)$/);
    if (task) {
      const done = task[1].toLowerCase() === "x";
      parts.push('<li class="efss-task"><span aria-label="' +
        (done ? "Completed" : "Not completed") + '">' +
        (done ? "☑" : "☐") + "</span> " + renderInline(task[2]) + "</li>");
    } else {
      parts.push("<li>" + renderInline(match[1]) + "</li>");
    }
    i++;
  }
  const tag = ordered ? "ol" : "ul";
  return { html: "<" + tag + ">" + parts.join("") + "</" + tag + ">", end: i };
}

/**
 * Render a restricted Markdown subset into safe HTML.
 * Maximum preview length is capped; the persisted source is NOT capped.
 */
export function renderMarkdown(source, maxChars = 120000) {
  const original = String(source ?? "");
  const cap = Math.max(0, Math.min(maxChars, 500000));
  const truncated = original.length > cap;
  const text = original.slice(0, cap).replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(FENCE);
    if (fence) {
      const mark = fence[1][0];
      const count = fence[1].length;
      const code = [];
      i++;
      const close = new RegExp("^\\s{0,3}" + (mark === "\x60" ? "\\x60" : "~") +
        "{" + count + ",}\\s*$");
      while (i < lines.length && !close.test(lines[i])) {
        code.push(lines[i++]);
      }
      if (i < lines.length) i++;
      result.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      result.push("<h" + level + ">" + renderInline(heading[2]) + "</h" + level + ">");
      i++;
      continue;
    }
    if (RULE.test(line)) { result.push("<hr>"); i++; continue; }

    const quote = line.match(QUOTE);
    if (quote) {
      const calloutMatch = quote[1].match(/^\[!([A-Za-z]+)\]\s*(.*)$/);
      const kind = calloutMatch?.[1]?.toUpperCase();
      if (kind && CALLOUTS.has(kind)) {
        const body = [];
        if (calloutMatch[2]) body.push(calloutMatch[2]);
        i++;
        while (i < lines.length && QUOTE.test(lines[i])) {
          body.push(lines[i].match(QUOTE)[1]); i++;
        }
        const slug = kind.toLowerCase();
        result.push('<aside class="efss-callout efss-callout-' + slug +
          '" role="note"><strong>' + kind + "</strong><p>" +
          body.map(renderInline).join("<br>") + "</p></aside>");
      } else {
        const body = [];
        while (i < lines.length && QUOTE.test(lines[i])) {
          body.push(lines[i].match(QUOTE)[1]); i++;
        }
        result.push("<blockquote>" + body.map(renderInline).join("<br>") + "</blockquote>");
      }
      continue;
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line);
      const list = renderList(lines, i, ordered);
      result.push(list.html);
      i = list.end;
      continue;
    }

    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      paragraph.push(lines[i++]);
    }
    result.push("<p>" + paragraph.map(renderInline).join("<br>") + "</p>");
  }

  if (truncated) {
    result.push('<p class="efss-preview-warning">Preview shortened for performance; complete source is preserved.</p>');
  }
  return result.join("\n") || '<p class="efss-empty">Nothing to preview yet.</p>';
}
