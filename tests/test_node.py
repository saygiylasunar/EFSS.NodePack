"""Basic isolated contracts without importing ComfyUI itself."""
import importlib.util
from pathlib import Path
import unittest

MODULE_PATH = Path(__file__).resolve().parents[1] / "__init__.py"
spec = importlib.util.spec_from_file_location("efss_nodepack", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MarkdownNodeTests(unittest.TestCase):
    def test_node_registration(self):
        self.assertIn("EFSSMarkdownNote", module.NODE_CLASS_MAPPINGS)
        self.assertEqual(module.WEB_DIRECTORY, "./web")
        self.assertEqual(module.EFSSMarkdownNote.FUNCTION, "emit")
        self.assertEqual(module.EFSSMarkdownNote.RETURN_TYPES, ("STRING",))

    def test_lossless_crlf_and_extensions(self):
        markdown = "## Hi\r\n\r\n{{efss:unknown}}\r\n\x00"
        result = module.EFSSMarkdownNote().emit("title", markdown)
        self.assertEqual(result, (markdown,))
        self.assertIs(result[0], markdown)

    def test_multiline_native_widget(self):
        inputs = module.EFSSMarkdownNote.INPUT_TYPES()["required"]
        self.assertTrue(inputs["markdown"][1]["multiline"])
        self.assertFalse(inputs["title"][1]["multiline"])

    def test_no_implicit_rendering_or_mutation(self):
        markdown = "<script>hello</script>\n**future-extension**"
        self.assertEqual(module.EFSSMarkdownNote().emit("hello", markdown)[0], markdown)


if __name__ == "__main__":
    unittest.main()
