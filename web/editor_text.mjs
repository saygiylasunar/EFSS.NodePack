/**
 * Pure editor text helpers. No ComfyUI or DOM dependencies.
 * The native Markdown widget remains the single persisted source of truth.
 */
export function originalNewlines(text, original) {
  const source = String(original);
  const updated = String(text);
  // Textarea editing commonly normalizes CRLF and standalone CR to LF.
  // Restore the original convention only for uniform-source documents;
  // mixed newline documents must never be silently rewritten.
  const boundaries = source.match(/\r\n|\r|\n/g) ?? [];
  if (boundaries.length === 0) return updated;
  const convention = boundaries[0];
  if (convention === "\n" || !boundaries.every((item) => item === convention)) {
    return updated;
  }
  return updated.replace(/\r\n|\r|\n/g, convention);
}

/**
 * Prefix selected lines without converting CRLF to LF.
 * This is an editor-only transform, not a Markdown serialization step.
 */
export function prefixSelectedLines(selection, prefix) {
  const source = String(selection);
  // Toolbar callout prefixes contain embedded newlines. Match the selected
  // document's convention instead of introducing mixed endings.
  if (!source) return source;
  const prefixText = String(prefix);
  const boundaries = [...source.matchAll(/\r\n|\r|\n/g)];
  const adapt = (boundary) => prefixText.replace(/\r\n|\r|\n/g, boundary);
  // Use the next actual boundary for each inserted multi-line prefix.
  // A mixed-ending selection must not be silently converted to CRLF.
  const firstBoundary = boundaries[0]?.[0] ?? "\n";
  let result = adapt(firstBoundary) + source.slice(0, boundaries[0]?.index ?? source.length);
  for (let index = 0; index < boundaries.length; index++) {
    const match = boundaries[index];
    const nextStart = match.index + match[0].length;
    const nextEnd = boundaries[index + 1]?.index ?? source.length;
    result += match[0];
    if (nextStart < source.length) {
      result += adapt(boundaries[index + 1]?.[0] ?? match[0]);
      result += source.slice(nextStart, nextEnd);
    }
  }
  return result;
}


/**
 * Normalize textarea content without destroying the original newline map.
 * Browser textareas expose CRLF and CR as LF; unchanged logical boundaries
 * should retain their original bytes even in a mixed-ending document.
 * If line boundaries were added or removed, leave the edited text unchanged
 * instead of guessing where historical CRLF/CR boundaries belonged.
 */
export function preserveMixedNewlines(text, original) {
  const updated = String(text);
  const source = String(original);
  const endings = source.match(/\r\n|\r|\n/g) ?? [];
  if (!endings.length || endings.every((ending) => ending === endings[0])) {
    return originalNewlines(updated, source);
  }
  const sourceLines = source.split(/\r\n|\r|\n/);
  const updatedLines = updated.split(/\r\n|\r|\n/);
  if (sourceLines.length !== updatedLines.length) return updated;
  // Matching line counts alone do not prove matching boundaries. If an
  // unchanged line has moved to another index, historical terminators cannot
  // safely be assigned to the new positions.
  const positions = new Map();
  sourceLines.forEach((line, index) => {
    if (!positions.has(line)) positions.set(line, []);
    positions.get(line).push(index);
  });
  if (updatedLines.some((line, index) =>
    positions.has(line) && !positions.get(line).includes(index)
  )) return updated;
  // If a line boundary moves (a split/merge), its original terminator no
  // longer has a reliable position. Only restore on stable line boundaries.
  const safe = sourceLines.every((line, index) =>
    index === sourceLines.length - 1 ||
    (line.length === 0 ? updatedLines[index].length === 0 : true)
  );
  if (!safe) return updated;
  return updatedLines.map((line, index) =>
    line + (index < endings.length ? endings[index] : "")
  ).join("");
}
