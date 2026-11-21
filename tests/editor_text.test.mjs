import assert from "node:assert/strict";
import test from "node:test";
import { originalNewlines, prefixSelectedLines, preserveMixedNewlines } from "../web/editor_text.mjs";

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


test("multiline callout toolbar prefixes do not introduce mixed line endings", () => {
  const original = "first\r\nsecond";
  const result = prefixSelectedLines(original, "> [!NOTE]\n> ");
  assert.equal(result, "> [!NOTE]\r\n> first\r\n> [!NOTE]\r\n> second");
  assert.ok(!/(?<!\r)\n/.test(result));
});

test("LF-only callout toolbar prefixes remain LF-only", () => {
  assert.equal(
    prefixSelectedLines("first\nsecond", "> [!NOTE]\n> "),
    "> [!NOTE]\n> first\n> [!NOTE]\n> second"
  );
});

test("standalone CR documents recover original line endings after textarea edits", () => {
  const source = "# Old\rParagraph\r";
  assert.equal(originalNewlines("# New\nParagraph\n", source), "# New\rParagraph\r");
  assert.equal(originalNewlines(source, source), source);
});

test("mixed CRLF, standalone CR and LF documents are never normalized wholesale", () => {
  const source = "one\r\ntwo\rthree\nfour";
  assert.equal(originalNewlines(source, source), source);
  assert.equal(originalNewlines("changed\none\rtwo", source), "changed\none\rtwo");
});

test("uniform LF and no-newline sources do not gain synthetic CR characters", () => {
  assert.equal(originalNewlines("one\ntwo", "old\ntext"), "one\ntwo");
  assert.equal(originalNewlines("new", "old"), "new");
});


test("mixed line endings survive a textarea edit with stable line boundaries", () => {
  const source = "alpha\r\nbeta\rgamma\nomega";
  const edited = "alpha\nBETA\ngamma\nomega";
  assert.equal(preserveMixedNewlines(edited, source), "alpha\r\nBETA\rgamma\nomega");
});

test("mixed line endings are not guessed after insertion or deletion of lines", () => {
  const source = "alpha\r\nbeta\rgamma\nomega";
  const edited = "alpha\nnew\nbeta\ngamma\nomega";
  assert.equal(preserveMixedNewlines(edited, source), edited);
  assert.equal(preserveMixedNewlines("alpha\nomega", source), "alpha\nomega");
});

test("uniform line endings and empty source retain existing behavior", () => {
  assert.equal(preserveMixedNewlines("a\nB\n", "a\r\nb\r\n"), "a\r\nB\r\n");
  assert.equal(preserveMixedNewlines("new", ""), "new");
});


test("terminal newline selections do not create an extra empty list item", () => {
  assert.equal(prefixSelectedLines("one\n", "- "), "- one\n");
  assert.equal(prefixSelectedLines("one\r\n", "> "), "> one\r\n");
  assert.equal(prefixSelectedLines("one\r", "## "), "## one\r");
  assert.equal(prefixSelectedLines("", "- "), "");
});

test("intentional internal empty lines still receive Markdown prefixes", () => {
  assert.equal(prefixSelectedLines("one\n\ntwo", "> "), "> one\n> \n> two");
});
