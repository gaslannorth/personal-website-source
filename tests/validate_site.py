from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import sys


DEFAULT_ROOT = Path(__file__).resolve().parents[1]


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.links: list[dict[str, str]] = []
        self.assets: list[str] = []
        self.images: list[dict[str, str]] = []
        self.h1_count = 0
        self.has_title = False
        self.has_description = False
        self.has_main = False
        self._in_title = False
        self._title_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if element_id := values.get("id"):
            self.ids.append(element_id)
        if tag == "a":
            self.links.append(values)
        if tag == "h1":
            self.h1_count += 1
        if tag == "link" and any(
            value in values.get("rel", "").split()
            for value in ("stylesheet", "icon", "apple-touch-icon")
        ):
            self.assets.append(values.get("href", ""))
        if tag == "script" and values.get("src"):
            self.assets.append(values["src"])
        if tag == "img":
            self.images.append(values)
            if values.get("src"):
                self.assets.append(values["src"])
            for candidate in values.get("srcset", "").split(","):
                source = candidate.strip().split(" ", 1)[0]
                if source:
                    self.assets.append(source)
        if tag == "title":
            self._in_title = True
        if tag == "meta" and values.get("name") == "description" and values.get("content"):
            self.has_description = True
        if tag == "main":
            self.has_main = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
            self.has_title = bool("".join(self._title_text).strip())

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_text.append(data)


def parse_page(path: Path) -> SiteParser:
    parser = SiteParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def validate(root: Path = DEFAULT_ROOT) -> list[str]:
    errors: list[str] = []
    html_files = sorted(root.glob("*.html"))
    if not html_files:
        return ["No HTML pages found"]

    pages = {path.name: parse_page(path) for path in html_files}

    for filename, parser in pages.items():
        prefix = f"{filename}: "
        if len(parser.ids) != len(set(parser.ids)):
            errors.append(prefix + "duplicate HTML id values found")
        if not parser.has_title:
            errors.append(prefix + "page title is missing")
        if not parser.has_description:
            errors.append(prefix + "meta description is missing")
        if not parser.has_main:
            errors.append(prefix + "main landmark is missing")
        if parser.h1_count != 1:
            errors.append(prefix + f"expected exactly one h1, found {parser.h1_count}")

        for image in parser.images:
            if not image.get("alt"):
                errors.append(prefix + f"image lacks useful alt text: {image.get('src', '')}")
            if not image.get("width") or not image.get("height"):
                errors.append(prefix + f"image lacks intrinsic dimensions: {image.get('src', '')}")

        known_ids = set(parser.ids)
        for link in parser.links:
            href = link.get("href", "")
            parsed_href = urlparse(href)
            if href.startswith("#") and href[1:] not in known_ids:
                errors.append(prefix + f"broken page anchor: {href}")
            elif not parsed_href.scheme and not href.startswith(("#", "mailto:")):
                target_name = parsed_href.path or filename
                target_path = root / target_name
                if not target_path.is_file():
                    errors.append(prefix + f"missing local link target: {href}")
                elif parsed_href.fragment and target_path.suffix == ".html":
                    target_parser = pages.get(target_path.name)
                    if target_parser and parsed_href.fragment not in set(target_parser.ids):
                        errors.append(prefix + f"broken cross-page anchor: {href}")
            if link.get("target") == "_blank":
                rel_values = set(link.get("rel", "").split())
                if not {"noopener", "noreferrer"}.issubset(rel_values):
                    errors.append(prefix + f"external link lacks safe rel attributes: {href}")

        for asset in parser.assets:
            parsed = urlparse(asset)
            if not parsed.scheme and not (root / parsed.path).is_file():
                errors.append(prefix + f"missing local asset: {asset}")

    return errors


if __name__ == "__main__":
    target_root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_ROOT
    problems = validate(target_root)
    if problems:
        raise SystemExit("\n".join(f"ERROR: {problem}" for problem in problems))
    print("Site validation passed")
