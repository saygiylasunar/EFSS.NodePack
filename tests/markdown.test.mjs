import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml, renderInline, renderMarkdown } from "../web/markdown.mjs";

test("escape-first rendering rejects raw HTML and executable attributes", () => {
  const input = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
  const output = renderMarkdown(input);
  assert.ok(output.includes("&lt;img"));
  assert.ok(output.includes("&lt;script&gt;"));
  assert.ok(!output.includes("<script>"));
  assert.ok(!output.includes("<img"));
});

test("blocks and inline formatting are rendered without source mutation", () => {
  const source = "# Title\n\n**bold** *italic* ~~strike~~ and \x60code\x60\n\n---";
  const copy = source;
  const output = renderMarkdown(source);
  assert.match(output, /<h1>Title<\/h1>/);
  assert.match(output, /<strong>bold<\/strong>/);
  assert.match(output, /<em>italic<\/em>/);
  assert.match(output, /<del>strike<\/del>/);
  assert.match(output, /<code>code<\/code>/);
  assert.match(output, /<hr>/);
  assert.equal(source, copy);
});

test("code spans are not interpreted as other Markdown marks", () => {
  assert.match(renderInline("\x60**raw**\x60"), /<code>\*\*raw\*\*<\/code>/);
});

test("link protocol is restricted and rendered link is inert", () => {
  const output = renderMarkdown("[safe](https://example.org/path?a=1&b=2) [unsafe](javascript:alert(1))");
  assert.match(output, /rel="noopener noreferrer"/);
  assert.match(output, /https:\/\/example.org/);
  assert.ok(!output.includes('href="javascript:'));
  assert.match(output, /javascript:alert\(1\)/);
});

test("lists, tasks, blockquotes and EFSS-compatible callouts", () => {
  const output = renderMarkdown(
    "- one\n- [x] done\n- [ ] todo\n\n1. first\n2. second\n\n> [!NOTE]\n> Reminder\n\n> quote"
  );
  assert.match(output, /<ul>/);
  assert.match(output, /<ol>/);
  assert.match(output, /Completed/);
  assert.match(output, /Not completed/);
  assert.match(output, /efss-callout-note/);
  assert.match(output, /<blockquote>/);
});

test("fenced code keeps raw Markdown and HTML inert", () => {
  const source = "\x60\x60\x60html\n<script>**no**</script>\n\x60\x60\x60";
  const output = renderMarkdown(source);
  assert.match(output, /<pre><code>/);
  assert.ok(output.includes("&lt;script&gt;**no**&lt;/script&gt;"));
  assert.ok(!output.includes("<script>"));
});

test("CRLF preview normalization does not mutate original", () => {
  const source = "# Hello\r\n\r\nA\r\nB";
  assert.match(renderMarkdown(source), /<p>A<br>B<\/p>/);
  assert.equal(source, "# Hello\r\n\r\nA\r\nB");
});

test("future EFSS syntax remains literal and preview is bounded", () => {
  const unknown = "{{efss:special|preserve}}";
  assert.match(renderMarkdown(unknown), /{{efss:special\|preserve}}/);
  assert.match(renderMarkdown("abcdef", 3), /Preview shortened/);
  assert.match(renderMarkdown(""), /Nothing to preview yet/);
});

test("escaping covers angle brackets, quotes and ampersands", () => {
  assert.equal(escapeHtml('<&>"' + "'"),
    "&lt;&amp;&gt;&quot;&#39;");
});
