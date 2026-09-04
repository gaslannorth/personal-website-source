from __future__ import annotations

import html
import sys
from datetime import date
from pathlib import Path


PAGES = (
    "index.html",
    "research.html",
    "projects.html",
    "itas.html",
    "publications.html",
    "media.html",
)


def page_url(base_url: str, filename: str) -> str:
    return f"{base_url}/" if filename == "index.html" else f"{base_url}/{filename}"


def inject_metadata(site_dir: Path, base_url: str) -> None:
    social_image = f"{base_url}/assets/social-preview.png"
    for filename in PAGES:
        path = site_dir / filename
        url = page_url(base_url, filename)
        block = (
            f'    <link rel="canonical" href="{html.escape(url, quote=True)}">\n'
            f'    <meta property="og:url" content="{html.escape(url, quote=True)}">\n'
            f'    <meta property="og:image" content="{html.escape(social_image, quote=True)}">\n'
            '    <meta property="og:image:width" content="1200">\n'
            '    <meta property="og:image:height" content="630">\n'
            '    <meta property="og:image:alt" content="Gökhan Aslan, Remote Sensing, InSAR, and Ground Deformation">\n'
            f'    <meta name="twitter:image" content="{html.escape(social_image, quote=True)}">\n'
        )
        source = path.read_text(encoding="utf-8")
        path.write_text(source.replace("  </head>", f"{block}  </head>", 1), encoding="utf-8")

    not_found = site_dir / "404.html"
    source = not_found.read_text(encoding="utf-8")
    base = f'    <base href="{html.escape(base_url, quote=True)}/">\n'
    not_found.write_text(source.replace("  </head>", f"{base}  </head>", 1), encoding="utf-8")


def write_sitemap(site_dir: Path, base_url: str) -> None:
    today = date.today().isoformat()
    entries = "\n".join(
        f"  <url><loc>{html.escape(page_url(base_url, filename))}</loc><lastmod>{today}</lastmod></url>"
        for filename in PAGES
    )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n"
        "</urlset>\n"
    )
    (site_dir / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    robots = (site_dir / "robots.txt").read_text(encoding="utf-8").rstrip()
    (site_dir / "robots.txt").write_text(
        f"{robots}\n\nSitemap: {base_url}/sitemap.xml\n",
        encoding="utf-8",
    )


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: prepare_release.py SITE_DIRECTORY BASE_URL")
    site_dir = Path(sys.argv[1]).resolve()
    base_url = sys.argv[2].rstrip("/")
    inject_metadata(site_dir, base_url)
    write_sitemap(site_dir, base_url)


if __name__ == "__main__":
    main()
