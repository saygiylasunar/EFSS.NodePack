"""EFSS.NodePack — a small, dependency-free ComfyUI note node.

The original Markdown source is the persisted value. No parsing or HTML
rendering is performed on the Python side.
"""


class EFSSMarkdownNote:
    """Workflow annotation with an optional STRING output."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "title": (
                    "STRING",
                    {"default": "Workflow note", "multiline": False},
                ),
                "markdown": (
                    "STRING",
                    {
                        "default": "# Note\n\nWrite **Markdown** here.",
                        "multiline": True,
                        "dynamicPrompts": False,
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("markdown",)
    FUNCTION = "emit"
    CATEGORY = "EFSS/Notes"
    DESCRIPTION = (
        "Keep Markdown notes in the workflow. The output is the untouched "
        "Markdown source; right-click for the optional EFSS editor."
    )

    def emit(self, title, markdown):
        # The title is an annotation; neither it nor the source is interpreted.
        return (markdown,)


NODE_CLASS_MAPPINGS = {
    "EFSSMarkdownNote": EFSSMarkdownNote,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "EFSSMarkdownNote": "EFSS Markdown Note",
}

WEB_DIRECTORY = "./web"

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
