/**
 * Pure editor text helpers. No ComfyUI or DOM dependencies.
 * The native Markdown widget remains the single persisted source of truth.
 */
export function originalNewlines(text, original) {
  const source = String(original);
  const updated = String(text);
  // Only normalize documents with consistent CRLF line endings.
  const usesCRLF = source.includes("\r\n") && !/(?<!\r)\n/.test(source);
  return usesCRLF ? updated.replace(/\r?\n/g, "\r\n") : updated;
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
