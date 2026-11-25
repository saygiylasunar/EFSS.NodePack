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

test("link attribute ampersands are escaped without corrupting the source label", () => {
  const result = renderInline("[query](https://example.org/?a=1&b=2)");
  assert.match(result, /href="https:\/\/example\.org\/\?a=1&amp;b=2"/);
  assert.match(result, />query<\/a>/);
});

test("URL-like text without a Markdown link is never promoted into an anchor", () => {
  const result = renderInline("javascript:alert(1) and <svg/onload=alert(1)>");
  assert.ok(!result.includes("<a "));
  assert.ok(!result.includes("<svg"));
});

test("invalid preview limits safely fall back to the default cap", () => {
  assert.match(renderMarkdown("# Heading", Number.NaN), /<h1>Heading<\/h1>/);
  assert.match(renderMarkdown("# Heading", Number.POSITIVE_INFINITY), /<h1>Heading<\/h1>/);
  assert.match(renderMarkdown("# Heading", -1), /Preview shortened/);
});

test("preview length cap never modifies input or returned Python node source", () => {
  const original = "x".repeat(200);
  assert.match(renderMarkdown(original, 10), /Preview shortened/);
  assert.equal(original.length, 200);
});

test("literal private-use placeholders cannot substitute protected inline HTML", () => {
  const fake = "\uE0000\uE001";
  const input = "[safe](https://example.org/) " + fake + " `<img src=x>`";
  const output = renderInline(input);
  assert.equal((output.match(/<a /g) ?? []).length, 1);
  assert.equal((output.match(/<code>/g) ?? []).length, 1);
  assert.ok(output.includes(fake));
  assert.ok(output.includes("&lt;img src=x&gt;"));
  assert.ok(!output.includes("<img "));
});

test("private-use characters in Markdown source survive safe preview rendering", () => {
  const input = "\uE000\uE001 **bold** [link](https://example.org/)";
  const output = renderMarkdown(input);
  assert.ok(output.includes("\uE000\uE001"));
  assert.match(output, /<strong>bold<\/strong>/);
  assert.match(output, /<a href="https:\/\/example.org\/"/);
  assert.equal(input, "\uE000\uE001 **bold** [link](https://example.org/)");
});


test("inline code in link labels is restored without leaking placeholders", () => {
  const html = renderMarkdown("[`<tag>`](https://example.com)");
  assert.match(html, /<a href="https:\/\/example\.com"[^>]*><code>&lt;tag&gt;<\/code><\/a>/);
});

test("code placeholders in link destinations do not become anchors", () => {
  const html = renderMarkdown("[label](https://example.com/`code`)");
  assert.doesNotMatch(html, /<a href=/);
});


test("long private-use runs remain literal alongside inline code", () => {
  const run = "\uE000".repeat(4096);
  const html = renderMarkdown(run + " `safe`");
  assert.ok(html.includes(run + " <code>safe</code>"));
});
