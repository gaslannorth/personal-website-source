const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const checks = [];

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("http://127.0.0.1:8123/media.html?v=20260815-14", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    });
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(__dirname, `media-${viewport.name}.png`),
      fullPage: true,
    });
    if (viewport.name === "desktop") {
      await page.locator("#giant-landslides").screenshot({ path: path.join(__dirname, "media-theme-landslides.png") });
      await page.locator("#subsidence").screenshot({ path: path.join(__dirname, "media-theme-subsidence.png") });
    } else {
      await page.locator("#giant-landslides").screenshot({ path: path.join(__dirname, "media-theme-landslides-mobile.png") });
    }

    const metrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      pageTitle: document.title,
      h1: document.querySelector("h1")?.textContent.trim(),
      themes: document.querySelectorAll(".media-theme").length,
      navOpenAtStart: document.querySelector("[data-nav]")?.classList.contains("is-open"),
      externalLinks: document.querySelectorAll('a[target="_blank"]').length,
    }));

    if (viewport.name === "mobile") {
      await page.locator("[data-nav-toggle]").click();
      metrics.mobileNavOpen = await page.locator("[data-nav]").evaluate((element) => element.classList.contains("is-open"));
      metrics.mobileNavLinks = await page.locator("[data-nav] a").count();
    }

    checks.push({ viewport: viewport.name, errors, ...metrics });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(checks, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
