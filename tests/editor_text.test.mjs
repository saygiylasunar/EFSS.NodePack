import assert from "node:assert/strict";
import test from "node:test";
import { originalNewlines, prefixSelectedLines } from "../web/editor_text.mjs";

test("unchanged CRLF source survives editor round trip", () => {
  const original = "# Heading\r\n\r\n> [!NOTE]\r\n> Text\r\n";
  assert.equal(originalNewlines(original, original), original);
});

test("CRLF documents retain original newline convention after editing", () => {
  const original = "one\r\ntwo\r\n";
  assert.equal(originalNewlines("one\nthree\ntwo\n", original), "one\r\nthree\r\ntwo\r\n");
});

test("mixed newline documents are not silently normalized", () => {
  const original = "one\r\ntwo\nthree";
  assert.equal(originalNewlines("one\r\ntwo\nthree", original), original);
});

test("LF-only and empty source remain unchanged", () => {
  assert.equal(originalNewlines("a\nb", "a\nb"), "a\nb");
  assert.equal(originalNewlines("", ""), "");
});

test("prefix operation preserves CRLF, LF and standalone CR boundaries", () => {
  assert.equal(prefixSelectedLines("a\r\nb\r\nc", "> "), "> a\r\n> b\r\n> c");
  assert.equal(prefixSelectedLines("a\nb", "- "), "- a\n- b");
  assert.equal(prefixSelectedLines("a\rb", "## "), "## a\r## b");
});

test("prefix operation does not interpret or strip unsupported EFSS syntax", () => {
  const source = "{{efss:unknown}}\r\n<script>not executed</script>\r\n🧪";
  assert.equal(prefixSelectedLines(source, "> "), "> {{efss:unknown}}\r\n> <script>not executed</script>\r\n> 🧪");
  assert.equal(source, "{{efss:unknown}}\r\n<script>not executed</script>\r\n🧪");
});
