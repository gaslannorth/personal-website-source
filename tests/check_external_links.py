from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PAGES = (
    "index.html",
    "research.html",
    "projects.html",
    "itas.html",
    "publications.html",
    "media.html",
)


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.urls: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        if urlparse(href).scheme in {"http", "https"}:
            self.urls.add(href)


def collect_urls() -> list[str]:
    urls: set[str] = set()
    for filename in PUBLIC_PAGES:
        parser = LinkParser()
        parser.feed((ROOT / filename).read_text(encoding="utf-8"))
        urls.update(parser.urls)
    return sorted(urls)


def check(url: str) -> tuple[str, int | None, str]:
    request = Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 academic-portfolio-link-check/1.0"},
    )
    try:
        with urlopen(request, timeout=18) as response:
            return url, response.status, response.geturl()
    except HTTPError as exc:
        return url, exc.code, exc.geturl()
    except (URLError, TimeoutError, OSError) as exc:
        return url, None, exc.__class__.__name__


def main() -> None:
    urls = collect_urls()
    failures: list[str] = []
    restrictions: list[str] = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(check, url): url for url in urls}
        for future in as_completed(futures):
            url, status, destination = future.result()
            if status in {404, 410}:
                failures.append(f"{status} {url}")
            elif status is None or status in {401, 403, 429} or (status and status >= 500):
                restrictions.append(f"{status or 'ERR'} {url} [{destination}]")

    print(f"Checked {len(urls)} external links")
    if restrictions:
        print("Restricted or inconclusive responses:")
        print("\n".join(f"  {item}" for item in sorted(restrictions)))
    if failures:
        raise SystemExit("Confirmed broken links:\n" + "\n".join(f"  {item}" for item in sorted(failures)))
    print("No confirmed 404 or 410 responses")


if __name__ == "__main__":
    main()
