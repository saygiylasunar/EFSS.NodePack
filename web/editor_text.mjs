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
  const newline = source.includes("\r\n") ? "\r\n" :
    source.includes("\r") && !source.includes("\n") ? "\r" : "\n";
  const adaptedPrefix = String(prefix).replace(/\r\n|\r|\n/g, newline);
  return source.replace(/(^|\r\n|\r|\n)/g, (boundary) => boundary + adaptedPrefix);
}
