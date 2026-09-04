# Gökhan Aslan Personal Website

Private source repository for Gökhan Aslan's academic website.

## Local preview

Run a local HTTP server from this directory and open `index.html` through the server address.

## Validation

Run:

```powershell
& "C:\Users\Aslan_Gokhan\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tests\validate_site.py
```

## Publication status

Public deployment is intentionally not configured. The repository can remain private while the website is reviewed and developed.

When publication is approved, a separate deployment step can generate canonical URLs, social-preview metadata, `sitemap.xml`, and the final sitemap entry in `robots.txt`.

Before each public update, verify publication metadata, dated citation metrics, and external coverage links.

The external link audit can be run with `tests\check_external_links.py`. Restricted, rate-limited, and server-error responses are reported separately from confirmed `404` and `410` failures.

The optional browser smoke test is available at `tests\smoke_site.js` and checks the public pages, responsive navigation, portrait loading, and principal interactive controls.
