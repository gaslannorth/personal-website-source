const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const currentYear = document.querySelector("footer [data-year]");

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 16);
};

const closeNavigation = () => {
  nav?.classList.remove("is-open");
  header?.classList.remove("menu-open");
  navToggle?.setAttribute("aria-expanded", "false");
};

navToggle?.addEventListener("click", () => {
  const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(willOpen));
  nav?.classList.toggle("is-open", willOpen);
  header?.classList.toggle("menu-open", willOpen);
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNavigation);
});

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 920) closeNavigation();
});

updateHeader();

if (currentYear) currentYear.textContent = String(new Date().getFullYear());

const researchData = window.RESEARCH_DATA ?? { publications: [], aois: [] };
const publicationData = researchData.publications ?? [];

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]);

const publicationTypeLabels = {
  article: "Journal article",
  proceeding: "Peer-reviewed proceedings",
  abstract: "Conference abstract / presentation",
  preprint: "Preprint",
  report: "Technical report",
  thesis: "Thesis",
};

const renderPublicationRecord = () => {
  const toolbar = document.querySelector(".publication-toolbar");
  const list = document.querySelector("[data-publication-list]");
  if (!toolbar || !list || !publicationData.length) return;

  const filterGroups = [
    ["all", "All", publicationData.length],
    ["article", "Journal articles", publicationData.filter((item) => item.type === "article").length],
    ["proceeding", "Proceedings", publicationData.filter((item) => item.type === "proceeding").length],
    ["abstract", "Abstracts & talks", publicationData.filter((item) => item.type === "abstract").length],
    ["other", "Other outputs", publicationData.filter((item) => ["preprint", "report", "thesis"].includes(item.type)).length],
  ];

  toolbar.innerHTML = filterGroups.map(([type, label, count], index) =>
    `<button type="button" class="publication-filter${index === 0 ? " is-active" : ""}" data-publication-filter="${type}" aria-pressed="${index === 0}">${label} <span>${count}</span></button>`
  ).join("");

  const aoiNames = Object.fromEntries((researchData.aois ?? []).map((aoi) => [aoi.id, `${aoi.name} ${aoi.region}`]));
  list.innerHTML = publicationData.map((item, index) => {
    const authorLine = escapeHtml(item.authors).replace("Gökhan Aslan", "<strong>Gökhan Aslan</strong>");
    const typeClass = item.type === "abstract" ? " conference" : item.type === "proceeding" ? " proceedings" : "";
    const doiMatch = item.url.match(/doi\.org\/(.+)$/i);
    const linkLabel = doiMatch ? `doi:${escapeHtml(doiMatch[1])} ↗` : "Open record ↗";
    const searchText = [item.title, item.authors, item.venue, ...item.themes, ...item.aois.map((id) => aoiNames[id] ?? id)].join(" ");
    return `<article class="publication-entry reveal is-visible" data-publication-id="${escapeHtml(item.id)}" data-publication-type="${escapeHtml(item.type)}" data-publication-year="${item.year}" data-publication-citations="${item.citations}" data-publication-title="${escapeHtml(item.title)}" data-publication-index="${index}" data-publication-search="${escapeHtml(searchText)}"><div class="publication-date">${item.year}</div><div class="publication-entry-main"><span class="publication-kind${typeClass}">${publicationTypeLabels[item.type] ?? "Research output"} · ${escapeHtml(item.venue)}</span><h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3><div class="publication-meta-row"><p class="publication-citation">${authorLine}. <a class="doi-inline" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${linkLabel}</a></p><div class="publication-actions"><button type="button" data-copy-publication="citation" data-publication-id="${escapeHtml(item.id)}">Copy citation</button><button type="button" data-copy-publication="bibtex" data-publication-id="${escapeHtml(item.id)}">BibTeX</button></div></div></div><div class="publication-cited${item.citations === 0 ? " is-zero" : ""}" aria-label="${item.citations} citations, Google Scholar snapshot from 4 September 2026" title="Google Scholar snapshot, 4 September 2026"><strong>${item.citations}</strong><span>citations</span></div></article>`;
  }).join("");
};

renderPublicationRecord();

const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

const publicationFilters = document.querySelectorAll("[data-publication-filter]");
const publicationEntries = document.querySelectorAll("[data-publication-type]");
const publicationList = document.querySelector("[data-publication-list]");
const publicationSearch = document.querySelector("[data-publication-search]");
const publicationSort = document.querySelector("[data-publication-sort]");
const publicationResultCount = document.querySelector("[data-publication-result-count]");
const publicationEmpty = document.querySelector("[data-publication-empty]");
let activePublicationType = "all";

const normaliseSearch = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").trim();

const applyPublicationView = () => {
  const query = normaliseSearch(publicationSearch?.value ?? "");
  const sortMode = publicationSort?.value ?? "newest";
  const entries = [...publicationEntries];
  let visibleCount = 0;

  entries.forEach((entry) => {
    const typeMatch = activePublicationType === "all" || entry.dataset.publicationType === activePublicationType || (activePublicationType === "other" && ["preprint", "report", "thesis"].includes(entry.dataset.publicationType));
    const searchMatch = !query || normaliseSearch(entry.dataset.publicationSearch).includes(query);
    entry.hidden = !(typeMatch && searchMatch);
    if (!entry.hidden) visibleCount += 1;
  });

  entries.sort((a, b) => {
    if (sortMode === "oldest") return Number(a.dataset.publicationYear) - Number(b.dataset.publicationYear) || Number(a.dataset.publicationIndex) - Number(b.dataset.publicationIndex);
    if (sortMode === "cited") return Number(b.dataset.publicationCitations) - Number(a.dataset.publicationCitations) || Number(b.dataset.publicationYear) - Number(a.dataset.publicationYear);
    if (sortMode === "title") return a.dataset.publicationTitle.localeCompare(b.dataset.publicationTitle, "en", { sensitivity: "base" });
    return Number(b.dataset.publicationYear) - Number(a.dataset.publicationYear) || Number(a.dataset.publicationIndex) - Number(b.dataset.publicationIndex);
  });
  publicationList?.append(...entries);

  if (publicationResultCount) publicationResultCount.textContent = `${visibleCount} ${visibleCount === 1 ? "record" : "records"}`;
  if (publicationEmpty) publicationEmpty.hidden = visibleCount !== 0;
};

publicationFilters.forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    activePublicationType = filterButton.dataset.publicationFilter ?? "all";

    publicationFilters.forEach((button) => {
      const active = button === filterButton;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    applyPublicationView();
  });
});

publicationSearch?.addEventListener("input", applyPublicationView);
publicationSort?.addEventListener("change", applyPublicationView);

const formatPlainCitation = (item) => `${item.authors} (${item.year}). ${item.title}. ${item.venue}. ${item.url}`;
const formatBibtex = (item) => {
  const entryType = item.type === "article" ? "article" : item.type === "proceeding" ? "inproceedings" : item.type === "thesis" ? (item.id.includes("masters") ? "mastersthesis" : "phdthesis") : "misc";
  const titleWord = item.title.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).find((word) => word.length > 4) ?? "Output";
  const key = `Aslan${item.year}${titleWord}`;
  const venueField = entryType === "article" ? "journal" : entryType === "inproceedings" ? "booktitle" : ["phdthesis", "mastersthesis"].includes(entryType) ? "school" : "howpublished";
  return `@${entryType}{${key},\n  author = {${item.authors.split(",").map((name) => name.trim()).join(" and ")}},\n  title = {${item.title}},\n  year = {${item.year}},\n  ${venueField} = {${item.venue}},\n  url = {${item.url}}\n}`;
};

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const field = document.createElement("textarea");
  field.value = value;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
};

document.querySelectorAll("[data-copy-publication]").forEach((button) => {
  button.addEventListener("click", async () => {
    const item = publicationData.find((publication) => publication.id === button.dataset.publicationId);
    if (!item) return;
    const originalLabel = button.textContent;
    try {
      await copyText(button.dataset.copyPublication === "bibtex" ? formatBibtex(item) : formatPlainCitation(item));
      button.textContent = "Copied";
      button.classList.add("is-copied");
      window.setTimeout(() => { button.textContent = originalLabel; button.classList.remove("is-copied"); }, 1400);
    } catch {
      button.textContent = "Copy failed";
      window.setTimeout(() => { button.textContent = originalLabel; }, 1400);
    }
  });
});

applyPublicationView();

const citationChart = document.querySelector("[data-citation-chart]");
const chartModeButtons = citationChart?.querySelectorAll("[data-chart-mode]") ?? [];
const chartColumns = citationChart?.querySelectorAll(".chart-column") ?? [];
const chartMaximum = citationChart?.querySelector("[data-chart-maximum]");
const chartMidpoint = citationChart?.querySelector("[data-chart-midpoint]");
const chartNote = citationChart?.querySelector("[data-chart-note]");

chartModeButtons.forEach((modeButton) => {
  modeButton.addEventListener("click", () => {
    const mode = modeButton.dataset.chartMode;
    const cumulative = mode === "cumulative";

    chartModeButtons.forEach((button) => {
      const active = button === modeButton;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    citationChart?.classList.toggle("is-cumulative", cumulative);
    chartColumns.forEach((column) => {
      const value = cumulative ? column.dataset.cumulative : column.dataset.annual;
      const valueLabel = column.querySelector(".chart-value");
      if (valueLabel && value) valueLabel.textContent = value;
    });

    if (chartMaximum) chartMaximum.textContent = cumulative ? "503" : "83";
    if (chartMidpoint) chartMidpoint.textContent = cumulative ? "252" : "42";
    if (chartNote) {
      chartNote.textContent = cumulative
        ? "Cumulative view covers the visible 2018–2026 period; three earlier citations are outside this series."
        : "* 2026 is a partial year. Three citations received before 2018 are outside the visible annual series.";
    }

    const chart = citationChart?.querySelector(".citation-chart");
    chart?.setAttribute(
      "aria-label",
      cumulative
        ? "Cumulative Google Scholar citations from 2018 to 2026: 3, 27, 62, 136, 218, 301, 383, 464, and 503 citations"
        : "Annual Google Scholar citations from 2018 to 2026: 3, 24, 35, 74, 82, 83, 82, 81, and 39 citations"
    );
  });
});

const impactExplorer = document.querySelector("[data-impact-explorer]");
const impactPoints = impactExplorer?.querySelectorAll("[data-impact-point]") ?? [];
const impactModeButtons = impactExplorer?.querySelectorAll("[data-impact-mode]") ?? [];
const impactFilterButtons = impactExplorer?.querySelectorAll("[data-impact-filter]") ?? [];
const impactYMaximum = impactExplorer?.querySelector("[data-impact-y-max]");
const impactYMidpoint = impactExplorer?.querySelector("[data-impact-y-mid]");
const impactYTitle = impactExplorer?.querySelector("[data-impact-y-title]");
const impactDetailTheme = impactExplorer?.querySelector("[data-impact-detail-theme]");
const impactDetailTitle = impactExplorer?.querySelector("[data-impact-detail-title]");
const impactDetailVenue = impactExplorer?.querySelector("[data-impact-detail-venue]");
const impactDetailValue = impactExplorer?.querySelector("[data-impact-detail-value]");
const impactDetailLabel = impactExplorer?.querySelector("[data-impact-detail-label]");
const impactDetailRate = impactExplorer?.querySelector("[data-impact-detail-rate]");
const impactDetailLink = impactExplorer?.querySelector("[data-impact-detail-link]");
let activeImpactMode = "total";
let activeImpactFilter = "all";

const impactThemeLabels = {
  landslides: "Landslides",
  subsidence: "Subsidence",
  tectonics: "Tectonics & seismicity",
};

const positionImpactPoints = () => {
  const maximum = activeImpactMode === "rate" ? 27.6 : 182;
  impactPoints.forEach((point) => {
    const year = Number(point.dataset.year);
    const shift = Number(point.dataset.shift || 0);
    const value = Number(point.dataset[activeImpactMode] || 0);
    const horizontalPosition = ((year - 2018) / 8) * 100 + shift;
    const verticalPosition = (value / maximum) * 94;
    point.style.setProperty("--impact-x", `${Math.max(1, Math.min(99, horizontalPosition))}%`);
    point.style.setProperty("--impact-y", `${verticalPosition}%`);
  });
};

const showImpactPoint = (point) => {
  impactPoints.forEach((candidate) => candidate.classList.toggle("is-selected", candidate === point));
  const theme = point.dataset.theme;
  const total = point.dataset.total ?? "0";
  const rate = point.dataset.rate ?? "0";

  if (impactDetailTheme) {
    impactDetailTheme.textContent = impactThemeLabels[theme] ?? theme;
    impactDetailTheme.className = `impact-selection-theme ${theme}`;
  }
  if (impactDetailTitle) impactDetailTitle.textContent = point.dataset.shortTitle ?? point.dataset.title ?? "";
  if (impactDetailVenue) impactDetailVenue.textContent = `${point.dataset.venue ?? ""} · ${point.dataset.year ?? ""}`;
  if (impactDetailValue) impactDetailValue.textContent = total;
  if (impactDetailLabel) impactDetailLabel.textContent = Number(total) === 1 ? "Citation" : "Citations";
  if (impactDetailRate) impactDetailRate.textContent = rate;
  if (impactDetailLink) impactDetailLink.href = point.dataset.doi ?? "#";
};

impactModeButtons.forEach((modeButton) => {
  modeButton.addEventListener("click", () => {
    activeImpactMode = modeButton.dataset.impactMode ?? "total";
    impactModeButtons.forEach((button) => {
      const active = button === modeButton;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const rateMode = activeImpactMode === "rate";
    if (impactYMaximum) impactYMaximum.textContent = rateMode ? "27.6" : "182";
    if (impactYMidpoint) impactYMidpoint.textContent = rateMode ? "13.8" : "91";
    if (impactYTitle) impactYTitle.textContent = rateMode ? "Average / year" : "Citations";
    positionImpactPoints();
  });
});

impactFilterButtons.forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    activeImpactFilter = filterButton.dataset.impactFilter ?? "all";
    impactFilterButtons.forEach((button) => {
      const active = button === filterButton;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    impactPoints.forEach((point) => {
      const filtered = activeImpactFilter !== "all" && point.dataset.theme !== activeImpactFilter;
      point.classList.toggle("is-filtered", filtered);
      point.setAttribute("aria-hidden", String(filtered));
      point.tabIndex = filtered ? -1 : 0;
    });

    const selectedPoint = impactExplorer?.querySelector("[data-impact-point].is-selected");
    if (selectedPoint?.classList.contains("is-filtered")) {
      const firstVisiblePoint = [...impactPoints].find((point) => !point.classList.contains("is-filtered"));
      if (firstVisiblePoint) showImpactPoint(firstVisiblePoint);
    }
  });
});

impactPoints.forEach((point) => point.addEventListener("click", () => showImpactPoint(point)));
positionImpactPoints();

const themeEvolution = document.querySelector("[data-theme-evolution]");
const themeLanes = themeEvolution?.querySelectorAll("[data-theme-lane]") ?? [];
const themeRows = themeEvolution?.querySelectorAll("[data-theme-row]") ?? [];
const themeTracks = themeEvolution?.querySelectorAll("[data-theme-track]") ?? [];
const themeTotals = themeEvolution?.querySelectorAll("[data-theme-total]") ?? [];
const themeScopeButtons = themeEvolution?.querySelectorAll("[data-theme-scope]") ?? [];
const themeDetailKicker = themeEvolution?.querySelector("[data-theme-detail-kicker]");
const themeDetailRegions = themeEvolution?.querySelector("[data-theme-detail-regions]");
const themeDetailOutputs = themeEvolution?.querySelector("[data-theme-detail-outputs]");
const themeDetailOutputLabel = themeEvolution?.querySelector("[data-theme-detail-output-label]");

let themeTimelineData = {
  landslides: {
    kicker: "Landslides & slope instability",
    title: "From Alpine monitoring to deep-seated Himalayan deformation.",
    copy: "InSAR time series reveal slow-moving landslides, hydrologically modulated motion and potential failure scenarios across sharply contrasting environments.",
    records: [
      { title: "Landslide mapping and monitoring using PSI in the French Alps", year: 2020, type: "article", region: "European Alps", url: "https://doi.org/10.3390/rs12081305" },
      { title: "Transient motion of the largest landslide on earth", year: 2021, type: "article", region: "Central Asia", url: "https://doi.org/10.1038/s41598-021-89899-6" },
      { title: "Dynamics of a giant slow landslide along the coast of the Aral Sea", year: 2021, type: "proceeding", region: "Central Asia", url: "https://doi.org/10.1109/IGARSS47720.2021.9554550" },
      { title: "Transient reactivation of the Kara-Bogaz-Gol coastal landslide", year: 2021, type: "proceeding", region: "Central Asia", url: "https://doi.org/10.1109/IGARSS47720.2021.9554182" },
      { title: "Sentinel-1 monitoring of unstable rock slopes in North Sikkim", year: 2022, type: "abstract", region: "Himalaya", url: "https://doi.org/10.5194/egusphere-egu22-11320" },
      { title: "Dynamics of a giant slow landslide complex along the Aral Sea", year: 2023, type: "article", region: "Central Asia", url: "https://doi.org/10.55730/1300-0985.1876" },
      { title: "Landslide monitoring using SAR interferometry in Gangtok", year: 2023, type: "article", region: "Himalaya", url: "https://doi.org/10.3390/geohazards4010003" },
      { title: "InSAR insights into the massive Himalayan Leo Pargil landslide", year: 2024, type: "abstract", region: "Himalaya", url: "https://doi.org/10.5194/egusphere-egu24-4011" },
      { title: "Building vulnerability exposed to landslide activity in Joshimath", year: 2025, type: "abstract", region: "Himalaya", url: "https://doi.org/10.5194/egusphere-egu25-18213" },
      { title: "Potential failure scenarios in the Santa Cruz range, Argentina", year: 2026, type: "article", region: "Argentina", url: "https://doi.org/10.1007/s10346-026-02790-1" },
      { title: "Kinematic segmentation of the Leo Pargil DSGSD using InSAR", year: 2026, type: "article", region: "Himalaya", url: "https://doi.org/10.1016/j.geomorph.2026.110248" },
      { title: "An earthquake-triggered rock avalanche on Jan Mayen Island", year: 2026, type: "abstract", region: "Arctic", url: "https://doi.org/10.5194/egusphere-egu26-22884" },
    ],
  },
  subsidence: {
    kicker: "Subsidence & resource deformation",
    title: "Long time-series evidence from cities and geothermal fields.",
    copy: "Multi-sensor SAR observations connect urban subsidence, groundwater-related deformation and geothermal-field dynamics across western and central Türkiye.",
    records: [
      { title: "Analysis of secular ground motions in Istanbul", year: 2018, type: "article", region: "Istanbul", url: "https://doi.org/10.3390/rs10030408" },
      { title: "Identification of secular ground motions in Istanbul", year: 2018, type: "abstract", region: "Istanbul", url: "https://meetingorganizer.copernicus.org/EGU2018/EGU2018-18018-1.pdf" },
      { title: "Investigating subsidence in the Bursa Plain using Sentinel-1", year: 2019, type: "article", region: "Bursa", url: "https://doi.org/10.3390/rs11010085" },
      { title: "Investigation of land subsidence in the Konya Plain", year: 2019, type: "abstract", region: "Konya", url: "https://meetingorganizer.copernicus.org/EGU2019/EGU2019-17474.pdf" },
      { title: "Long-term spatiotemporal evolution of land subsidence in Konya", year: 2021, type: "article", region: "Konya", url: "https://doi.org/10.3906/yer-2104-22" },
      { title: "Wide-area ground deformation monitoring in geothermal fields", year: 2022, type: "article", region: "Western Türkiye", url: "https://doi.org/10.55730/1300-0985.1771" },
      { title: "Desalination-related ground deformation in Cape Coral", year: 2023, type: "article", region: "Florida", url: "https://doi.org/10.1016/j.srs.2023.100077" },
    ],
  },
  tectonics: {
    kicker: "Tectonic deformation & seismicity",
    title: "From aseismic fault creep to construction-related seismicity.",
    copy: "High-temporal-resolution InSAR and complementary observations examine shallow creep along the İzmit rupture and a possible trigger mechanism for the Sørfjorden earthquake swarm.",
    records: [
      { title: "Surface creep along the 1999 İzmit earthquake rupture", year: 2018, type: "abstract", region: "İzmit", url: "https://meetingorganizer.copernicus.org/EGU2018/EGU2018-18148-2.pdf" },
      { title: "Shallow creep along the 1999 İzmit earthquake rupture", year: 2019, type: "article", region: "İzmit", url: "https://doi.org/10.1029/2018JB017022" },
      { title: "Characterizing interseismic aseismic slip along the İzmit rupture", year: 2019, type: "abstract", region: "İzmit", url: "https://meetingorganizer.copernicus.org/EGU2019/EGU2019-5788-1.pdf" },
      { title: "Hydropower tunnel leakage and the Sørfjorden earthquake swarm", year: 2026, type: "article", region: "Sørfjorden", url: "https://doi.org/10.1785/0320250045" },
    ],
  },
  services: {
    kicker: "Ground-motion monitoring services",
    title: "Research translated into wide-area operational monitoring.",
    copy: "National and Arctic services turn satellite time series into accessible ground-motion information for systematic geohazard screening and follow-up.",
    records: [
      { title: "InSAR Norway: advancing geohazard understanding through wide-area analysis", year: 2024, type: "abstract", region: "Mainland Norway", url: "https://doi.org/10.5194/egusphere-egu24-4400" },
      { title: "InSAR Svalbard Ground Motion Service", year: 2026, type: "abstract", region: "Svalbard", url: "https://doi.org/10.5194/egusphere-egu26-20200" },
    ],
  },
  arctic: {
    kicker: "Arctic ground dynamics & permafrost",
    title: "An emerging programme for climate-sensitive polar terrain.",
    copy: "Permafrost degradation, freeze–thaw processes, slope creep and earthquake–climate–cryosphere interactions define a growing Arctic research direction.",
    records: [
      { title: "InSAR Svalbard Ground Motion Service", year: 2026, type: "abstract", region: "Svalbard", url: "https://doi.org/10.5194/egusphere-egu26-20200" },
      { title: "An earthquake-triggered rock avalanche on Jan Mayen Island", year: 2026, type: "abstract", region: "Jan Mayen", url: "https://doi.org/10.5194/egusphere-egu26-22884" },
    ],
  },
};

if (publicationData.length) {
  const aoiById = Object.fromEntries((researchData.aois ?? []).map((aoi) => [aoi.id, aoi]));
  Object.keys(themeTimelineData).forEach((themeKey) => {
    themeTimelineData[themeKey].records = publicationData
      .filter((item) => item.year >= 2018 && item.themes.includes(themeKey))
      .map((item) => ({
        title: item.title,
        year: item.year,
        type: item.type,
        region: item.aois.map((id) => aoiById[id]?.region).filter(Boolean).join(" · ") || "Multi-region",
        url: item.url,
      }));
  });
}

let activeThemeKey = "landslides";
let activeThemeYear = null;
let activeThemeScope = "all";

const getThemeRecords = (themeKey) => {
  const theme = themeTimelineData[themeKey];
  if (!theme) return [];
  return theme.records.filter((record) => activeThemeScope === "all" || ["article", "proceeding"].includes(record.type));
};

const renderThemeTracks = () => {
  themeTracks.forEach((track) => {
    const themeKey = track.dataset.themeTrack;
    const records = getThemeRecords(themeKey);
    const countsByYear = records.reduce((counts, record) => {
      counts[record.year] = (counts[record.year] || 0) + 1;
      return counts;
    }, {});

    const nodes = Object.entries(countsByYear).map(([year, count]) => {
      const node = document.createElement("button");
      const countLabel = document.createElement("em");
      node.type = "button";
      node.className = "theme-node";
      node.dataset.themeNode = themeKey;
      node.dataset.themeYear = year;
      node.style.setProperty("--node-x", `${((Number(year) - 2018) / 8) * 100}%`);
      node.style.setProperty("--node-size", count >= 3 ? "26px" : count === 2 ? "21px" : "17px");
      node.setAttribute("aria-label", `${themeTimelineData[themeKey].kicker}, ${year}: ${count} ${count === 1 ? "output" : "outputs"}`);
      node.classList.toggle("is-selected", activeThemeKey === themeKey && activeThemeYear === Number(year));
      countLabel.textContent = count;
      node.append(countLabel);
      node.addEventListener("click", () => showThemeTimelineDetail(themeKey, Number(year)));
      return node;
    });
    track.replaceChildren(...nodes);
  });

  themeTotals.forEach((total) => {
    total.textContent = String(getThemeRecords(total.dataset.themeTotal).length);
  });

  themeLanes.forEach((lane) => {
    const themeKey = lane.dataset.themeLane;
    const count = getThemeRecords(themeKey).length;
    lane.setAttribute("aria-label", `${themeTimelineData[themeKey].kicker}: ${count} ${count === 1 ? "output" : "outputs"} in the selected scope`);
  });

  themeRows.forEach((row) => {
    row.classList.toggle("is-empty", getThemeRecords(row.dataset.themeRow).length === 0);
  });
};

const showThemeTimelineDetail = (themeKey, selectedYear = null) => {
  const theme = themeTimelineData[themeKey];
  if (!theme) return;
  activeThemeKey = themeKey;
  activeThemeYear = selectedYear;
  const scopedRecords = getThemeRecords(themeKey);
  const selectedRecords = selectedYear ? scopedRecords.filter((record) => record.year === selectedYear) : scopedRecords;
  const regions = [...new Set(selectedRecords.map((record) => record.region))];

  themeLanes.forEach((lane) => {
    const active = lane.dataset.themeLane === themeKey;
    lane.closest(".theme-lane")?.classList.toggle("is-active", active);
    lane.setAttribute("aria-pressed", String(active));
  });

  if (themeDetailKicker) {
    themeDetailKicker.textContent = selectedYear ? `${theme.kicker} · ${selectedYear}` : theme.kicker;
    themeDetailKicker.className = `theme-detail-kicker ${themeKey}`;
  }
  if (themeDetailRegions) themeDetailRegions.textContent = regions.length ? regions.join(" · ") : "No outputs in this scope yet";
  if (themeDetailOutputLabel) {
    themeDetailOutputLabel.textContent = selectedYear
      ? `Outputs in ${selectedYear}`
      : activeThemeScope === "peer" ? "Latest peer-reviewed outputs" : "Recent related outputs";
  }

  if (themeDetailOutputs) {
    const sortedRecords = [...selectedRecords].sort((a, b) => b.year - a.year);
    const visibleRecords = selectedYear ? sortedRecords : sortedRecords.slice(0, 3);
    const outputTypeLabels = { article: "Article", proceeding: "Proceedings", abstract: "Abstract", preprint: "Preprint", report: "Report", thesis: "Thesis" };
    const outputItems = visibleRecords.map(({ title, year, type, url }) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const titleElement = document.createElement("span");
      const yearElement = document.createElement("b");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      titleElement.textContent = title;
      yearElement.textContent = `${year} · ${outputTypeLabels[type]} ↗`;
      link.append(titleElement, yearElement);
      item.append(link);
      return item;
    });
    if (!outputItems.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "theme-output-empty";
      emptyItem.textContent = "No peer-reviewed journal or proceedings output is currently recorded for this theme.";
      outputItems.push(emptyItem);
    }
    themeDetailOutputs.replaceChildren(...outputItems);
  }

  renderThemeTracks();
};

themeLanes.forEach((lane) => {
  lane.addEventListener("click", () => showThemeTimelineDetail(lane.dataset.themeLane, null));
});

themeScopeButtons.forEach((scopeButton) => {
  scopeButton.addEventListener("click", () => {
    activeThemeScope = scopeButton.dataset.themeScope ?? "all";
    themeScopeButtons.forEach((button) => {
      const active = button === scopeButton;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const selectedYearStillVisible = activeThemeYear && getThemeRecords(activeThemeKey).some((record) => record.year === activeThemeYear);
    showThemeTimelineDetail(activeThemeKey, selectedYearStillVisible ? activeThemeYear : null);
  });
});

showThemeTimelineDetail(activeThemeKey);

const collaborationNetwork = document.querySelector("[data-collaboration-network]");
const collaborationStage = collaborationNetwork?.querySelector("[data-collaboration-stage]");
const collaborationStageScroll = collaborationNetwork?.querySelector(".collaboration-stage-scroll");
const collaborationEdges = collaborationNetwork?.querySelector("[data-collaboration-edges]");
const collaborationNodes = collaborationNetwork?.querySelector("[data-collaboration-nodes]");
const collaborationScopeButtons = collaborationNetwork?.querySelectorAll("[data-collaboration-scope]") ?? [];
const collaborationCentreCount = collaborationNetwork?.querySelector("[data-collaboration-centre-count]");
const collaborationDetailKicker = collaborationNetwork?.querySelector("[data-collaboration-detail-kicker]");
const collaborationDetailName = collaborationNetwork?.querySelector("[data-collaboration-detail-name]");
const collaborationDetailCopy = collaborationNetwork?.querySelector("[data-collaboration-detail-copy]");
const collaborationDetailCount = collaborationNetwork?.querySelector("[data-collaboration-detail-count]");
const collaborationDetailCountLabel = collaborationNetwork?.querySelector("[data-collaboration-detail-count-label]");
const collaborationDetailTeamCount = collaborationNetwork?.querySelector("[data-collaboration-detail-team-count]");
const collaborationDetailContexts = collaborationNetwork?.querySelector("[data-collaboration-detail-contexts]");
const collaborationOutputLabel = collaborationNetwork?.querySelector("[data-collaboration-output-label]");
const collaborationDetailOutputs = collaborationNetwork?.querySelector("[data-collaboration-detail-outputs]");

let collaborationData = {
  ziyadin: {
    name: "Ziyadin Çakır", initials: "ZÇ", cluster: "tectonics", x: 110, y: 105, all: 15, peer: 11,
    contexts: "Tectonics · Subsidence · Landslide dynamics",
    copy: "A long-running collaboration spanning tectonic deformation, subsidence and landslide dynamics.",
    outputs: [
      { year: 2023, type: "article", title: "Dynamics of a giant slow landslide complex along the Aral Sea", url: "https://doi.org/10.55730/1300-0985.1876" },
      { year: 2023, type: "article", title: "Desalination-related ground deformation in Cape Coral", url: "https://doi.org/10.1016/j.srs.2023.100077" },
      { year: 2022, type: "article", title: "Wide-area ground deformation monitoring in geothermal fields", url: "https://doi.org/10.55730/1300-0985.1771" },
      { year: 2021, type: "article", title: "Transient motion of the largest landslide on earth", url: "https://doi.org/10.1038/s41598-021-89899-6" },
      { year: 2019, type: "article", title: "Shallow creep along the 1999 İzmit earthquake rupture", url: "https://doi.org/10.1029/2018JB017022" },
    ],
  },
  francois: {
    name: "François Renard", initials: "FR", cluster: "tectonics", x: 270, y: 70, all: 8, peer: 5,
    contexts: "Tectonics · Subsidence · Landslide dynamics",
    copy: "A cross-theme partnership connecting fault creep, ground deformation and Central Asian slope dynamics.",
    outputs: [
      { year: 2023, type: "article", title: "Dynamics of a giant slow landslide complex along the Aral Sea", url: "https://doi.org/10.55730/1300-0985.1876" },
      { year: 2021, type: "proceeding", title: "Dynamics of a giant slow landslide along the Aral Sea", url: "https://doi.org/10.1109/IGARSS47720.2021.9554550" },
      { year: 2019, type: "article", title: "Shallow creep along the 1999 İzmit earthquake rupture", url: "https://doi.org/10.1029/2018JB017022" },
      { year: 2018, type: "article", title: "Analysis of secular ground motions in Istanbul", url: "https://doi.org/10.3390/rs10030408" },
    ],
  },
  cecile: {
    name: "Cécile Lasserre", initials: "CL", cluster: "tectonics", x: 75, y: 270, all: 6, peer: 3,
    contexts: "Tectonics · Subsidence · InSAR time series",
    copy: "A recurring collaboration focused on fault creep and long-term urban ground motion in Türkiye.",
    outputs: [
      { year: 2019, type: "article", title: "Shallow creep along the 1999 İzmit earthquake rupture", url: "https://doi.org/10.1029/2018JB017022" },
      { year: 2019, type: "article", title: "Investigating subsidence in the Bursa Plain", url: "https://doi.org/10.3390/rs11010085" },
      { year: 2019, type: "abstract", title: "Characterizing interseismic aseismic slip along the İzmit rupture", url: "https://meetingorganizer.copernicus.org/EGU2019/EGU2019-5788-1.pdf" },
      { year: 2018, type: "article", title: "Analysis of secular ground motions in Istanbul", url: "https://doi.org/10.3390/rs10030408" },
    ],
  },
  semih: {
    name: "Semih Ergintav", initials: "SE", cluster: "tectonics", x: 155, y: 430, all: 5, peer: 2,
    contexts: "Tectonics · Fault creep · Urban deformation",
    copy: "A concentrated research partnership around the İzmit rupture and long-term deformation in Istanbul.",
    outputs: [
      { year: 2019, type: "article", title: "Shallow creep along the 1999 İzmit earthquake rupture", url: "https://doi.org/10.1029/2018JB017022" },
      { year: 2019, type: "abstract", title: "Characterizing interseismic aseismic slip along the İzmit rupture", url: "https://meetingorganizer.copernicus.org/EGU2019/EGU2019-5788-1.pdf" },
      { year: 2018, type: "article", title: "Analysis of secular ground motions in Istanbul", url: "https://doi.org/10.3390/rs10030408" },
    ],
  },
  marcello: {
    name: "Marcello De Michele", initials: "MD", cluster: "landslides", x: 500, y: 72, all: 7, peer: 6,
    contexts: "Landslide dynamics · InSAR methods · Himalaya",
    copy: "A sustained collaboration linking InSAR methodology with slow-moving landslides from the Alps to the Himalaya.",
    outputs: [
      { year: 2026, type: "article", title: "Kinematic segmentation of the Leo Pargil DSGSD using InSAR", url: "https://doi.org/10.1016/j.geomorph.2026.110248" },
      { year: 2023, type: "article", title: "Dynamics of a giant slow landslide complex along the Aral Sea", url: "https://doi.org/10.55730/1300-0985.1876" },
      { year: 2021, type: "article", title: "Transient motion of the largest landslide on earth", url: "https://doi.org/10.1038/s41598-021-89899-6" },
      { year: 2020, type: "article", title: "Landslide mapping and monitoring using PSI in the French Alps", url: "https://doi.org/10.3390/rs12081305" },
    ],
  },
  daniel: {
    name: "Daniel Raucoules", initials: "DR", cluster: "landslides", x: 680, y: 145, all: 5, peer: 5,
    contexts: "Landslide dynamics · InSAR methods · Central Asia",
    copy: "A fully peer-reviewed collaboration centred on InSAR monitoring of large, hydrologically modulated landslides.",
    outputs: [
      { year: 2023, type: "article", title: "Dynamics of a giant slow landslide complex along the Aral Sea", url: "https://doi.org/10.55730/1300-0985.1876" },
      { year: 2021, type: "article", title: "Transient motion of the largest landslide on earth", url: "https://doi.org/10.1038/s41598-021-89899-6" },
      { year: 2021, type: "proceeding", title: "Transient reactivation of the Kara-Bogaz-Gol coastal landslide", url: "https://doi.org/10.1109/IGARSS47720.2021.9554182" },
      { year: 2020, type: "article", title: "Landslide mapping and monitoring using PSI in the French Alps", url: "https://doi.org/10.3390/rs12081305" },
    ],
  },
  severine: {
    name: "Séverine Bernardie", initials: "SB", cluster: "landslides", x: 700, y: 350, all: 3, peer: 3,
    contexts: "Landslide dynamics · Hydrological forcing · InSAR",
    copy: "A focused peer-reviewed partnership on hydrologically modulated landslide motion and Alpine monitoring.",
    outputs: [
      { year: 2021, type: "article", title: "Transient motion of the largest landslide on earth", url: "https://doi.org/10.1038/s41598-021-89899-6" },
      { year: 2021, type: "proceeding", title: "Transient reactivation of the Kara-Bogaz-Gol coastal landslide", url: "https://doi.org/10.1109/IGARSS47720.2021.9554182" },
      { year: 2020, type: "article", title: "Landslide mapping and monitoring using PSI in the French Alps", url: "https://doi.org/10.3390/rs12081305" },
    ],
  },
  john: {
    name: "John Dehls", initials: "JD", cluster: "norway", x: 540, y: 455, all: 10, peer: 5,
    contexts: "Landslides · Norway & Arctic services · Himalaya",
    copy: "A wide-ranging collaboration connecting operational Norwegian InSAR services with landslide research worldwide.",
    outputs: [
      { year: 2026, type: "article", title: "Kinematic segmentation of the Leo Pargil DSGSD using InSAR", url: "https://doi.org/10.1016/j.geomorph.2026.110248" },
      { year: 2026, type: "article", title: "Potential failure scenarios in the Santa Cruz range", url: "https://doi.org/10.1007/s10346-026-02790-1" },
      { year: 2026, type: "abstract", title: "InSAR Svalbard Ground Motion Service", url: "https://doi.org/10.5194/egusphere-egu26-20200" },
      { year: 2023, type: "article", title: "Landslide monitoring using SAR interferometry in Gangtok", url: "https://doi.org/10.3390/geohazards4010003" },
      { year: 2023, type: "article", title: "Desalination-related ground deformation in Cape Coral", url: "https://doi.org/10.1016/j.srs.2023.100077" },
    ],
  },
  reginald: {
    name: "Reginald Hermanns", initials: "RH", cluster: "norway", x: 360, y: 455, all: 6, peer: 2,
    contexts: "Landslides · Norway & Arctic geohazards · Himalaya",
    copy: "A recurring geohazard partnership spanning Norwegian services, Arctic slope failure and deep-seated landslides.",
    outputs: [
      { year: 2026, type: "article", title: "Kinematic segmentation of the Leo Pargil DSGSD using InSAR", url: "https://doi.org/10.1016/j.geomorph.2026.110248" },
      { year: 2026, type: "abstract", title: "An earthquake-triggered rock avalanche on Jan Mayen Island", url: "https://doi.org/10.5194/egusphere-egu26-22884" },
      { year: 2024, type: "abstract", title: "InSAR Norway: advancing geohazard understanding", url: "https://doi.org/10.5194/egusphere-egu24-4400" },
      { year: 2023, type: "article", title: "Dynamics of a giant slow landslide complex along the Aral Sea", url: "https://doi.org/10.55730/1300-0985.1876" },
    ],
  },
  ivanna: {
    name: "Ivanna Penna", initials: "IP", cluster: "norway", x: 570, y: 295, all: 5, peer: 3,
    contexts: "Landslides · InSAR Norway · Himalaya",
    copy: "A recurring collaboration connecting landslide characterisation, national-scale InSAR and international case studies.",
    outputs: [
      { year: 2026, type: "article", title: "Potential failure scenarios in the Santa Cruz range", url: "https://doi.org/10.1007/s10346-026-02790-1" },
      { year: 2024, type: "abstract", title: "InSAR Norway: advancing geohazard understanding", url: "https://doi.org/10.5194/egusphere-egu24-4400" },
      { year: 2023, type: "article", title: "Dynamics of a giant slow landslide complex along the Aral Sea", url: "https://doi.org/10.55730/1300-0985.1876" },
      { year: 2023, type: "article", title: "Desalination-related ground deformation in Cape Coral", url: "https://doi.org/10.1016/j.srs.2023.100077" },
      { year: 2022, type: "abstract", title: "Monitoring unstable rock slopes in North Sikkim", url: "https://doi.org/10.5194/egusphere-egu22-11320" },
    ],
  },
};

let collaborationTeamEdges = [
  { a: "francois", b: "ziyadin", all: 8, peer: 5 },
  { a: "cecile", b: "ziyadin", all: 6, peer: 3 },
  { a: "cecile", b: "francois", all: 6, peer: 3 },
  { a: "john", b: "reginald", all: 5, peer: 2 },
  { a: "daniel", b: "marcello", all: 5, peer: 5 },
  { a: "marcello", b: "ziyadin", all: 5, peer: 5 },
  { a: "daniel", b: "ziyadin", all: 5, peer: 5 },
  { a: "cecile", b: "semih", all: 5, peer: 2 },
  { a: "semih", b: "ziyadin", all: 5, peer: 2 },
  { a: "francois", b: "semih", all: 5, peer: 2 },
  { a: "ivanna", b: "john", all: 5, peer: 3 },
  { a: "ivanna", b: "ziyadin", all: 2, peer: 2 },
  { a: "john", b: "ziyadin", all: 2, peer: 2 },
  { a: "marcello", b: "reginald", all: 3, peer: 2 },
  { a: "john", b: "marcello", all: 3, peer: 2 },
  { a: "ivanna", b: "reginald", all: 3, peer: 1 },
  { a: "marcello", b: "severine", all: 3, peer: 3 },
  { a: "daniel", b: "severine", all: 3, peer: 3 },
  { a: "severine", b: "ziyadin", all: 3, peer: 3 },
];

if (publicationData.length) {
  const canonicalNames = {
    "john f. dehls": "John Dehls", "john dehls": "John Dehls", "ziyadin çakir": "Ziyadin Çakır", "ziyadin çakır": "Ziyadin Çakır",
    "ziyadin cakır": "Ziyadin Çakır", "ziyadin cakir": "Ziyadin Çakır", "marcello de michele": "Marcello De Michele",
    "severine bernardie": "Séverine Bernardie", "séverine bernardie": "Séverine Bernardie", "ugur dogan": "Uğur Doğan", "uğur doğan": "Uğur Doğan",
    "reginald hermanns": "Reginald Hermanns", "jacob bendle": "Jacob M. Bendle", "jacob m. bendle": "Jacob M. Bendle",
  };
  const normaliseName = (name) => canonicalNames[name.trim().toLocaleLowerCase("en")] ?? name.trim();
  const collaboratorIds = {
    "Ziyadin Çakır": "ziyadin", "François Renard": "francois", "Cécile Lasserre": "cecile", "Semih Ergintav": "semih",
    "Marcello De Michele": "marcello", "Daniel Raucoules": "daniel", "Séverine Bernardie": "severine", "John Dehls": "john",
    "Reginald Hermanns": "reginald", "Ivanna Penna": "ivanna",
  };
  const makeId = (name) => collaboratorIds[name] ?? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const people = new Map();
  publicationData.forEach((publication) => {
    publication.authors.split(",").map(normaliseName).filter((name) => name !== "Gökhan Aslan").forEach((name) => {
      if (!people.has(name)) people.set(name, { name, all: 0, peer: 0, outputs: [], themes: {} });
      const person = people.get(name);
      person.all += 1;
      if (["article", "proceeding"].includes(publication.type)) person.peer += 1;
      person.outputs.push(publication);
      publication.themes.forEach((theme) => { person.themes[theme] = (person.themes[theme] || 0) + 1; });
    });
  });

  const positions = [[110,105],[270,70],[75,270],[155,430],[500,72],[680,145],[700,350],[540,455],[360,455],[570,295]];
  const selectedPeople = [...people.values()].sort((a, b) => b.all - a.all || b.peer - a.peer || a.name.localeCompare(b.name)).slice(0, 10);
  const themeContext = { landslides: "Landslide dynamics", subsidence: "Subsidence", tectonics: "Tectonic deformation", services: "Ground-motion services", arctic: "Arctic geohazards" };
  const derivedData = {};
  selectedPeople.forEach((person, index) => {
    const themes = Object.entries(person.themes).sort((a, b) => b[1] - a[1]).map(([theme]) => theme);
    const dominant = themes[0] ?? "landslides";
    const cluster = dominant === "landslides" ? "landslides" : ["arctic", "services"].includes(dominant) ? "norway" : "tectonics";
    const [x, y] = positions[index];
    derivedData[makeId(person.name)] = {
      name: person.name,
      initials: person.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      cluster, x, y, all: person.all, peer: person.peer,
      contexts: themes.slice(0, 3).map((theme) => themeContext[theme]).join(" · "),
      copy: `A recurring collaboration across ${themes.slice(0, 3).map((theme) => themeContext[theme].toLowerCase()).join(", ")}.`,
      outputs: person.outputs.sort((a, b) => b.year - a.year || b.citations - a.citations).slice(0, 5),
    };
  });
  collaborationData = derivedData;

  const selectedIds = new Set(Object.keys(collaborationData));
  const edgeCounts = new Map();
  publicationData.forEach((publication) => {
    const ids = [...new Set(publication.authors.split(",").map(normaliseName).map(makeId).filter((id) => selectedIds.has(id)))];
    for (let a = 0; a < ids.length; a += 1) for (let b = a + 1; b < ids.length; b += 1) {
      const pair = [ids[a], ids[b]].sort();
      const key = pair.join("|");
      if (!edgeCounts.has(key)) edgeCounts.set(key, { a: pair[0], b: pair[1], all: 0, peer: 0 });
      const edge = edgeCounts.get(key);
      edge.all += 1;
      if (["article", "proceeding"].includes(publication.type)) edge.peer += 1;
    }
  });
  collaborationTeamEdges = [...edgeCounts.values()].filter((edge) => edge.all >= 2);
}

let activeCollaborationScope = "all";
let activeCollaborator = "ziyadin";
let collaborationStageHasCentred = false;

const makeCollaborationLine = (x1, y1, x2, y2, className, count, data = {}) => {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", `collaboration-edge ${className}`);
  line.setAttribute("stroke-width", String(className === "primary" ? 1.2 + Math.sqrt(count) * 0.72 : 0.65 + Math.sqrt(count) * 0.42));
  line.style.opacity = className === "primary" ? String(Math.min(0.62, 0.2 + count * 0.028)) : String(Math.min(0.46, 0.1 + count * 0.035));
  Object.entries(data).forEach(([key, value]) => { line.dataset[key] = value; });
  return line;
};

const updateCollaborationSelection = () => {
  if (!collaborationNetwork) return;
  const relatedIds = new Set();
  collaborationTeamEdges.forEach((edge) => {
    const count = edge[activeCollaborationScope];
    if (count < 2) return;
    if (edge.a === activeCollaborator) relatedIds.add(edge.b);
    if (edge.b === activeCollaborator) relatedIds.add(edge.a);
  });

  collaborationNetwork.querySelectorAll("[data-collaborator]").forEach((node) => {
    const selected = node.dataset.collaborator === activeCollaborator;
    const related = relatedIds.has(node.dataset.collaborator);
    node.classList.toggle("is-selected", selected);
    node.classList.toggle("is-related", related);
    node.classList.toggle("is-muted", !selected && !related);
    node.setAttribute("aria-pressed", String(selected));
  });

  collaborationNetwork.querySelectorAll(".collaboration-edge").forEach((edge) => {
    const primarySelected = edge.classList.contains("primary") && edge.dataset.person === activeCollaborator;
    const secondarySelected = edge.classList.contains("secondary") && (edge.dataset.a === activeCollaborator || edge.dataset.b === activeCollaborator);
    edge.classList.toggle("is-selected", primarySelected || secondarySelected);
    edge.classList.toggle("is-muted", !(primarySelected || secondarySelected));
  });
};

const showCollaborator = (collaboratorId) => {
  const collaborator = collaborationData[collaboratorId];
  if (!collaborator) return;
  activeCollaborator = collaboratorId;
  const count = collaborator[activeCollaborationScope];
  const teamCount = collaborationTeamEdges.filter((edge) => edge[activeCollaborationScope] >= 2 && (edge.a === collaboratorId || edge.b === collaboratorId)).length;
  const contextLabel = { tectonics: "Tectonics & subsidence", landslides: "Landslide dynamics", norway: "Norway & Arctic geohazards" };

  if (collaborationDetailKicker) {
    collaborationDetailKicker.textContent = `${contextLabel[collaborator.cluster]} · recurring collaborator`;
    collaborationDetailKicker.className = `collaboration-detail-kicker ${collaborator.cluster}`;
  }
  if (collaborationDetailName) collaborationDetailName.textContent = collaborator.name;
  if (collaborationDetailCopy) collaborationDetailCopy.textContent = collaborator.copy;
  if (collaborationDetailCount) collaborationDetailCount.textContent = String(count);
  if (collaborationDetailCountLabel) collaborationDetailCountLabel.textContent = activeCollaborationScope === "peer" ? "Peer-reviewed outputs" : "Shared outputs";
  if (collaborationDetailTeamCount) collaborationDetailTeamCount.textContent = String(teamCount);
  if (collaborationDetailContexts) collaborationDetailContexts.textContent = collaborator.contexts;
  if (collaborationOutputLabel) collaborationOutputLabel.textContent = activeCollaborationScope === "peer" ? "Selected peer-reviewed outputs" : "Selected shared outputs";

  if (collaborationDetailOutputs) {
    const visibleOutputs = collaborator.outputs.filter((output) => activeCollaborationScope === "all" || ["article", "proceeding"].includes(output.type));
    const typeLabels = { article: "Article", proceeding: "Proceedings", abstract: "Abstract", preprint: "Preprint", report: "Report", thesis: "Thesis" };
    const outputItems = visibleOutputs.map((output) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const title = document.createElement("span");
      const meta = document.createElement("b");
      link.href = output.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      title.textContent = output.title;
      meta.textContent = `${output.year} · ${typeLabels[output.type]} ↗`;
      link.append(title, meta);
      item.append(link);
      return item;
    });
    collaborationDetailOutputs.replaceChildren(...outputItems);
  }

  updateCollaborationSelection();
};

const renderCollaborationNetwork = () => {
  if (!collaborationStage || !collaborationEdges || !collaborationNodes) return;
  const collaborators = Object.entries(collaborationData);
  const maxCount = Math.max(...collaborators.map(([, collaborator]) => collaborator[activeCollaborationScope]));
  const primaryEdges = collaborators.map(([id, collaborator]) => makeCollaborationLine(380, 260, collaborator.x, collaborator.y, "primary", collaborator[activeCollaborationScope], { person: id }));
  const secondaryEdges = collaborationTeamEdges
    .filter((edge) => edge[activeCollaborationScope] >= 2)
    .map((edge) => makeCollaborationLine(
      collaborationData[edge.a].x,
      collaborationData[edge.a].y,
      collaborationData[edge.b].x,
      collaborationData[edge.b].y,
      "secondary",
      edge[activeCollaborationScope],
      { a: edge.a, b: edge.b },
    ));
  collaborationEdges.replaceChildren(...secondaryEdges, ...primaryEdges);

  const nodes = collaborators.map(([id, collaborator]) => {
    const count = collaborator[activeCollaborationScope];
    const node = document.createElement("button");
    const portrait = document.createElement("span");
    const name = document.createElement("strong");
    const countLabel = document.createElement("small");
    node.type = "button";
    node.className = `collaboration-node ${collaborator.cluster}`;
    node.dataset.collaborator = id;
    node.style.setProperty("--node-x", `${(collaborator.x / 760) * 100}%`);
    node.style.setProperty("--node-y", `${(collaborator.y / 520) * 100}%`);
    node.style.setProperty("--node-size", `${46 + Math.sqrt(count / maxCount) * 31}px`);
    node.setAttribute("aria-label", `${collaborator.name}: ${count} shared ${activeCollaborationScope === "peer" ? "peer-reviewed " : ""}outputs`);
    portrait.textContent = collaborator.initials;
    name.textContent = collaborator.name;
    countLabel.textContent = `${count} shared`;
    node.append(portrait, name, countLabel);
    node.addEventListener("click", () => showCollaborator(id));
    return node;
  });
  collaborationNodes.replaceChildren(...nodes);
  if (collaborationCentreCount) collaborationCentreCount.textContent = activeCollaborationScope === "peer" ? `${publicationData.filter((item) => ["article", "proceeding"].includes(item.type)).length} peer-reviewed` : `${publicationData.length} outputs`;
  showCollaborator(activeCollaborator);
  if (collaborationStageScroll && !collaborationStageHasCentred) {
    requestAnimationFrame(() => {
      const overflowWidth = collaborationStageScroll.scrollWidth - collaborationStageScroll.clientWidth;
      if (overflowWidth > 0) collaborationStageScroll.scrollLeft = overflowWidth / 2;
      collaborationStageHasCentred = true;
    });
  }
};

collaborationScopeButtons.forEach((scopeButton) => {
  scopeButton.addEventListener("click", () => {
    activeCollaborationScope = scopeButton.dataset.collaborationScope ?? "all";
    collaborationScopeButtons.forEach((button) => {
      const active = button === scopeButton;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderCollaborationNetwork();
  });
});

renderCollaborationNetwork();

const researchGeography = document.querySelector("[data-research-geography]");
const researchMapElement = researchGeography?.querySelector("[data-research-map]");
const mapScopeButtons = researchGeography?.querySelectorAll("[data-map-scope]") ?? [];
const mapThemeButtons = researchGeography?.querySelectorAll("[data-map-theme]") ?? [];
const mapResetButton = researchGeography?.querySelector("[data-map-reset]");
const mapLoading = researchGeography?.querySelector("[data-map-loading]");
const mapRegionKicker = researchGeography?.querySelector("[data-region-kicker]");
const mapRegionTitle = researchGeography?.querySelector("[data-region-title]");
const mapRegionCopy = researchGeography?.querySelector("[data-region-copy]");
const mapAoiCount = researchGeography?.querySelector("[data-map-aoi-count]");
const mapOutputLabel = researchGeography?.querySelector("[data-map-output-label]");
const mapOutputs = researchGeography?.querySelector("[data-map-outputs]");
const mapLocationButtons = researchGeography?.querySelectorAll("[data-map-location]") ?? [];

let researchAois = [
  {
    id: "istanbul", name: "Istanbul", country: "Türkiye", lat: 41.03, lng: 28.98, theme: "subsidence",
    summary: "Long-term InSAR analysis of secular urban ground motion across the Istanbul metropolitan area.",
    outputs: [
      { year: 2018, type: "article", title: "Analysis of secular ground motions in Istanbul from a long-term InSAR time series", url: "https://doi.org/10.3390/rs10030408" },
      { year: 2018, type: "abstract", title: "Identification of secular ground motions in Istanbul by long-term time-resolved InSAR", url: "https://meetingorganizer.copernicus.org/EGU2018/EGU2018-18018-1.pdf" },
    ],
  },
  {
    id: "izmit", name: "İzmit rupture", country: "Türkiye", lat: 40.75, lng: 29.91, theme: "tectonics",
    summary: "High-temporal-resolution observations of shallow creep and interseismic aseismic slip along the 1999 rupture.",
    outputs: [
      { year: 2019, type: "article", title: "Shallow creep along the 1999 İzmit earthquake rupture", url: "https://doi.org/10.1029/2018JB017022" },
      { year: 2019, type: "abstract", title: "Characterizing interseismic aseismic slip along the İzmit rupture", url: "https://meetingorganizer.copernicus.org/EGU2019/EGU2019-5788-1.pdf" },
      { year: 2018, type: "abstract", title: "Surface creep along the 1999 İzmit earthquake rupture", url: "https://meetingorganizer.copernicus.org/EGU2018/EGU2018-18148-2.pdf" },
    ],
  },
  {
    id: "bursa", name: "Bursa Plain", country: "Türkiye", lat: 40.19, lng: 29.06, theme: "subsidence",
    summary: "Ascending and descending Sentinel-1 time series reveal the spatial pattern of plain-wide subsidence.",
    outputs: [{ year: 2019, type: "article", title: "Investigating subsidence in the Bursa Plain using Sentinel-1", url: "https://doi.org/10.3390/rs11010085" }],
  },
  {
    id: "konya", name: "Konya Plain", country: "Türkiye", lat: 37.87, lng: 32.49, theme: "subsidence",
    summary: "Aquifer-related subsidence assessed from multisensor SAR and hydrogeological observations.",
    outputs: [
      { year: 2021, type: "article", title: "Long-term spatiotemporal evolution of land subsidence in Konya", url: "https://doi.org/10.3906/yer-2104-22" },
      { year: 2019, type: "abstract", title: "Investigation of land subsidence in the Konya Plain", url: "https://meetingorganizer.copernicus.org/EGU2019/EGU2019-17474.pdf" },
    ],
  },
  {
    id: "western-turkiye", name: "Western Türkiye geothermal fields", country: "Türkiye", lat: 38.03, lng: 28.5, theme: "subsidence",
    summary: "Wide-area monitoring of production-related ground deformation across major geothermal fields.",
    outputs: [{ year: 2022, type: "article", title: "Wide-area ground deformation monitoring in geothermal fields", url: "https://doi.org/10.55730/1300-0985.1771" }],
  },
  {
    id: "french-alps", name: "French Alps", country: "France", lat: 45.18, lng: 6.25, theme: "landslides",
    summary: "Persistent-scatterer mapping and temporal monitoring of slow-moving Alpine landslides.",
    outputs: [{ year: 2020, type: "article", title: "Landslide mapping and monitoring using PSI in the French Alps", url: "https://doi.org/10.3390/rs12081305" }],
  },
  {
    id: "aral-sea", name: "Aral Sea coast", country: "Kazakhstan", lat: 44.55, lng: 58.55, theme: "landslides",
    summary: "Hydrologically modulated motion of a giant slow coastal landslide complex.",
    outputs: [
      { year: 2023, type: "article", title: "Dynamics of a giant slow landslide complex along the Aral Sea", url: "https://doi.org/10.55730/1300-0985.1876" },
      { year: 2021, type: "article", title: "Transient motion of the largest landslide on earth", url: "https://doi.org/10.1038/s41598-021-89899-6" },
      { year: 2021, type: "proceeding", title: "Dynamics of a giant slow landslide along the Aral Sea", url: "https://doi.org/10.1109/IGARSS47720.2021.9554550" },
    ],
  },
  {
    id: "kara-bogaz", name: "Kara-Bogaz-Gol coast", country: "Turkmenistan", lat: 41.02, lng: 52.98, theme: "landslides",
    summary: "Transient reactivation of a coastal landslide captured with InSAR and linked to hydrological forcing.",
    outputs: [{ year: 2021, type: "proceeding", title: "Transient reactivation of the Kara-Bogaz-Gol coastal landslide", url: "https://doi.org/10.1109/IGARSS47720.2021.9554182" }],
  },
  {
    id: "gangtok", name: "Gangtok", country: "Sikkim, India", lat: 27.33, lng: 88.61, theme: "landslides",
    summary: "Ground investigation combined with SAR interferometry for urban landslide detection and monitoring.",
    outputs: [{ year: 2023, type: "article", title: "Landslide detection and monitoring using SAR interferometry in Gangtok", url: "https://doi.org/10.3390/geohazards4010003" }],
  },
  {
    id: "north-sikkim", name: "North Sikkim", country: "India", lat: 27.75, lng: 88.5, theme: "landslides",
    summary: "Sentinel-1 time-series monitoring of unstable rock slopes in high Himalayan terrain.",
    outputs: [{ year: 2022, type: "abstract", title: "Monitoring unstable rock slopes in North Sikkim", url: "https://doi.org/10.5194/egusphere-egu22-11320" }],
  },
  {
    id: "joshimath", name: "Joshimath", country: "Uttarakhand, India", lat: 30.56, lng: 79.56, theme: "landslides",
    summary: "Building-vulnerability assessment for settlement exposed to deep-seated landslide activity.",
    outputs: [{ year: 2025, type: "abstract", title: "Vulnerability of buildings exposed to landslide activity in Joshimath", url: "https://doi.org/10.5194/egusphere-egu25-18213" }],
  },
  {
    id: "leo-pargil", name: "Leo Pargil Dome", country: "Himachal Pradesh, India", lat: 31.9, lng: 78.74, theme: "landslides",
    summary: "Kinematic segmentation of a deep-seated gravitational slope deformation on the southwestern dome flank.",
    outputs: [
      { year: 2026, type: "article", title: "Kinematic segmentation of the Leo Pargil DSGSD using InSAR", url: "https://doi.org/10.1016/j.geomorph.2026.110248" },
      { year: 2024, type: "abstract", title: "InSAR insights into the massive Himalayan Leo Pargil landslide", url: "https://doi.org/10.5194/egusphere-egu24-4011" },
    ],
  },
  {
    id: "cape-coral", name: "Cape Coral", country: "Florida, USA", lat: 26.64, lng: -81.99, theme: "subsidence",
    summary: "Ground deformation associated with brackish-water abstraction and injection around desalination wellfields.",
    outputs: [{ year: 2023, type: "article", title: "Brackish-water desalination plant modulates ground deformation in Cape Coral", url: "https://doi.org/10.1016/j.srs.2023.100077" }],
  },
  {
    id: "santa-cruz", name: "Los Erizos · Santa Cruz Range", country: "San Juan, Argentina", lat: -31.69, lng: -70.3, theme: "landslides",
    summary: "Multi-sensor assessment of potential renewed failure above the 2005 landslide-dammed lake.",
    outputs: [{ year: 2026, type: "article", title: "Potential failure scenarios in the Santa Cruz range", url: "https://doi.org/10.1007/s10346-026-02790-1" }],
  },
  {
    id: "norway", name: "Mainland Norway", country: "Norway", lat: 64.5, lng: 11.3, theme: "services", coverage: true,
    summary: "National wide-area persistent-scatterer ground-motion service covering mainland Norway.",
    outputs: [{ year: 2024, type: "abstract", title: "InSAR Norway: advancing geohazard understanding through wide-area analysis", url: "https://doi.org/10.5194/egusphere-egu24-4400" }],
  },
  {
    id: "sorfjorden", name: "Sørfjorden", country: "Nordland, Norway", lat: 68.06, lng: 16.66, theme: "tectonics",
    summary: "Tunnel leakage, satellite-observed subsidence and a nearby earthquake swarm investigated as a connected system.",
    outputs: [{ year: 2026, type: "article", title: "Hydropower tunnel leakage and the Sørfjorden earthquake swarm", url: "https://doi.org/10.1785/0320250045" }],
  },
  {
    id: "svalbard", name: "InSAR Svalbard coverage", country: "Svalbard, Norway", lat: 78.2, lng: 15.65, theme: "arctic", coverage: true,
    summary: "Arctic ground-motion service covering Longyearbyen, Ny-Ålesund, Svea, Hornsund and Kapp Linné.",
    outputs: [
      { year: 2026, type: "abstract", title: "InSAR Svalbard Ground Motion Service", url: "https://doi.org/10.5194/egusphere-egu26-20200" },
    ],
  },
  {
    id: "jan-mayen", name: "Jan Mayen Island", country: "Arctic Ocean, Norway", lat: 71.0, lng: -8.3, theme: "arctic",
    summary: "Earthquake-triggered rock-avalanche research examining the role of climate-conditioned Arctic terrain.",
    outputs: [{ year: 2026, type: "abstract", title: "An earthquake-triggered rock avalanche on Jan Mayen Island", url: "https://doi.org/10.5194/egusphere-egu26-22884" }],
  },
];

if (publicationData.length && researchData.aois?.length) {
  const themeSummaries = {
    landslides: "Satellite observations document slope motion, kinematics and related hazard processes.",
    subsidence: "Time-series analysis reveals urban, aquifer-related or resource-linked ground deformation.",
    tectonics: "Geodetic observations connect surface deformation with fault and seismic processes.",
    services: "Operational wide-area monitoring translates InSAR time series into accessible ground-motion information.",
    arctic: "Arctic observations examine permafrost, cryosphere and climate-sensitive ground dynamics.",
  };
  researchAois = researchData.aois.map((aoi) => {
    const outputs = publicationData.filter((item) => item.aois.includes(aoi.id));
    const themeCounts = outputs.flatMap((item) => item.themes).reduce((counts, theme) => ({ ...counts, [theme]: (counts[theme] || 0) + 1 }), {});
    const theme = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "landslides";
    return {
      ...aoi,
      country: aoi.region,
      theme,
      coverage: ["norway", "svalbard", "northwest-turkey"].includes(aoi.id),
      summary: themeSummaries[theme],
      outputs: outputs.map(({ year, type, title, url }) => ({ year, type, title, url })),
    };
  }).filter((aoi) => aoi.outputs.length);
}

let activeMapScope = "all";
let activeMapTheme = "all";
let researchMap;
let researchMarkerLayer;

const getVisibleAoiOutputs = (aoi) => aoi.outputs.filter((output) => activeMapScope === "all" || output.type === "article" || output.type === "proceeding");

const renderMapDetail = (aoi = null) => {
  const visibleAois = researchAois.filter((item) => (activeMapTheme === "all" || item.theme === activeMapTheme) && getVisibleAoiOutputs(item).length);
  if (!aoi) {
    if (mapRegionKicker) mapRegionKicker.textContent = "Map overview";
    if (mapRegionTitle) mapRegionTitle.innerHTML = `<b data-map-aoi-count>${visibleAois.length}</b> study areas`;
    if (mapRegionCopy) mapRegionCopy.textContent = "Zoom, pan or select a marker to view the related work.";
    if (mapOutputLabel) mapOutputLabel.textContent = "Selected outputs";
    if (mapOutputs) {
      const empty = document.createElement("li");
      empty.className = "region-output-empty";
      empty.textContent = "Select a study area on the map.";
      mapOutputs.replaceChildren(empty);
    }
    return;
  }

  const outputs = [...getVisibleAoiOutputs(aoi)];
  if (mapRegionKicker) mapRegionKicker.textContent = `${aoi.country} · ${outputs.length} ${outputs.length === 1 ? "output" : "outputs"}`;
  if (mapRegionTitle) mapRegionTitle.textContent = aoi.name;
  if (mapRegionCopy) mapRegionCopy.textContent = aoi.summary;
  if (mapOutputLabel) mapOutputLabel.textContent = "Related outputs";
  if (mapOutputs) {
    const typeLabels = { article: "Article", proceeding: "Proceedings", abstract: "Abstract", preprint: "Preprint", report: "Report", thesis: "Thesis" };
    const items = outputs.sort((a, b) => b.year - a.year).map((output) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const title = document.createElement("span");
      const meta = document.createElement("b");
      link.href = output.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      title.textContent = output.title;
      meta.textContent = `${output.year} · ${typeLabels[output.type]} ↗`;
      link.append(title, meta);
      item.append(link);
      return item;
    });
    mapOutputs.replaceChildren(...items);
  }
};

const makeAoiIcon = (aoi, count) => window.L.divIcon({
  className: "research-aoi-icon-wrap",
  html: `<span class="research-aoi-icon ${aoi.theme}${aoi.coverage ? " coverage" : ""}"><i></i>${count > 1 ? `<b>${count}</b>` : ""}</span>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const renderResearchMap = () => {
  if (!researchMap || !researchMarkerLayer || !window.L) return;
  researchMarkerLayer.clearLayers();
  const visibleAois = researchAois.filter((aoi) => (activeMapTheme === "all" || aoi.theme === activeMapTheme) && getVisibleAoiOutputs(aoi).length);
  visibleAois.forEach((aoi) => {
    const outputs = getVisibleAoiOutputs(aoi);
    const marker = window.L.marker([aoi.lat, aoi.lng], { icon: makeAoiIcon(aoi, outputs.length), title: aoi.name, alt: `${aoi.name}, ${outputs.length} outputs` });
    marker.bindTooltip(`<strong>${aoi.name}</strong><span>${aoi.country} · ${outputs.length} ${outputs.length === 1 ? "output" : "outputs"}</span>`, { direction: "top", offset: [0, -12], className: "research-map-tooltip" });
    marker.on("click", () => renderMapDetail(aoi));
    researchMarkerLayer.addLayer(marker);
  });
  if (mapAoiCount) mapAoiCount.textContent = String(visibleAois.length);
  renderMapDetail();
};

if (researchMapElement && window.L) {
  researchMap = window.L.map(researchMapElement, { minZoom: 2, maxZoom: 14, zoomControl: true, worldCopyJump: true, scrollWheelZoom: false }).setView([38, 33], 2);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(researchMap);
  researchMarkerLayer = window.L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 42,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 8,
    iconCreateFunction: (cluster) => window.L.divIcon({ className: "research-cluster-wrap", html: `<span class="research-cluster"><b>${cluster.getChildCount()}</b><i>areas</i></span>`, iconSize: [48, 48] }),
  });
  researchMap.addLayer(researchMarkerLayer);
  renderResearchMap();
  mapLoading?.setAttribute("hidden", "");
  setTimeout(() => researchMap.invalidateSize(), 150);
} else if (mapLoading) {
  mapLoading.textContent = "The interactive map could not load. Publication locations remain available in the research record.";
}

mapScopeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeMapScope = button.dataset.mapScope ?? "all";
    mapScopeButtons.forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active)); });
    renderResearchMap();
  });
});

mapThemeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeMapTheme = button.dataset.mapTheme ?? "all";
    mapThemeButtons.forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active)); });
    renderResearchMap();
  });
});

mapResetButton?.addEventListener("click", () => {
  researchMap?.setView([38, 33], 2);
  renderMapDetail();
});

mapLocationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const aoi = researchAois.find((item) => item.id === button.dataset.mapLocation);
    if (!aoi) return;
    activeMapScope = "all";
    activeMapTheme = "all";
    mapScopeButtons.forEach((item) => {
      const active = item.dataset.mapScope === "all";
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    mapThemeButtons.forEach((item) => {
      const active = item.dataset.mapTheme === "all";
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderResearchMap();
    researchMap?.setView([aoi.lat, aoi.lng], aoi.coverage ? 4 : 7);
    renderMapDetail(aoi);
  });
});

const researchConceptCanvases = [...document.querySelectorAll("[data-concept-figure]")];

const drawResearchConceptFigure = (canvas) => {
  const width = Math.round(canvas.clientWidth);
  const height = Math.round(canvas.clientHeight);
  if (width < 40 || height < 40) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";

  const palette = {
    white: "rgba(255, 255, 255, 0.88)",
    muted: "rgba(255, 255, 255, 0.48)",
    grid: "rgba(255, 255, 255, 0.10)",
    faint: "rgba(255, 255, 255, 0.05)",
    signal: "#9ad7cc",
    signalDark: "#4ea698",
    accent: "#db5b3d",
    earth: "#49666a",
    earthDark: "#29484e",
  };
  const margin = { left: 26, right: 24, top: 27, bottom: 24 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const x = (value) => margin.left + innerWidth * value;
  const y = (value) => margin.top + innerHeight * value;

  const path = (points, { stroke = palette.white, fill = null, lineWidth = 1.4, dash = [] } = {}) => {
    context.save();
    context.beginPath();
    points.forEach(([pointX, pointY], index) => {
      const method = index ? "lineTo" : "moveTo";
      context[method](x(pointX), y(pointY));
    });
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    context.setLineDash(dash);
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
    context.restore();
  };

  const arrow = (fromX, fromY, toX, toY, color = palette.accent, lineWidth = 2) => {
    const startX = x(fromX);
    const startY = y(fromY);
    const endX = x(toX);
    const endY = y(toY);
    const angle = Math.atan2(endY - startY, endX - startX);
    const head = 7;
    context.save();
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.lineTo(endX - head * Math.cos(angle - Math.PI / 6), endY - head * Math.sin(angle - Math.PI / 6));
    context.moveTo(endX, endY);
    context.lineTo(endX - head * Math.cos(angle + Math.PI / 6), endY - head * Math.sin(angle + Math.PI / 6));
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
    context.restore();
  };

  const dot = (pointX, pointY, radius = 4, color = palette.accent) => {
    context.beginPath();
    context.arc(x(pointX), y(pointY), radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  };

  const label = (text, pointX, pointY, { color = palette.muted, align = "left", size = 9, weight = 700 } = {}) => {
    context.save();
    context.fillStyle = color;
    context.font = `${weight} ${size}px Aptos, Segoe UI, sans-serif`;
    context.textAlign = align;
    context.textBaseline = "middle";
    context.fillText(text.toUpperCase(), x(pointX), y(pointY));
    context.restore();
  };

  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  [0.28, 0.55, 0.82].forEach((gridX) => {
    context.beginPath();
    context.moveTo(x(gridX), y(0));
    context.lineTo(x(gridX), y(1));
    context.stroke();
  });
  label("Conceptual", 0, -0.075, { color: palette.signal, size: 9, weight: 800 });

  const figure = canvas.dataset.conceptFigure;

  if (figure === "slopes") {
    const terrain = [[0, 0.78], [0.15, 0.67], [0.31, 0.42], [0.45, 0.19], [0.62, 0.55], [0.78, 0.68], [1, 0.78], [1, 1], [0, 1]];
    path(terrain, { stroke: palette.signal, fill: palette.earthDark, lineWidth: 1.6 });
    path([[0.29, 0.45], [0.43, 0.24], [0.58, 0.52], [0.49, 0.58], [0.35, 0.52], [0.29, 0.45]], { stroke: palette.accent, fill: "rgba(219, 91, 61, 0.15)", lineWidth: 1.8 });
    [[0.37, 0.46], [0.45, 0.41], [0.52, 0.5]].forEach(([pointX, pointY]) => dot(pointX, pointY, 3.5));
    [[0.83, 0.06, 0.49, 0.42], [0.92, 0.17, 0.56, 0.51]].forEach((beam) => arrow(...beam, palette.signal, 1.5));
    arrow(0.43, 0.35, 0.55, 0.55, palette.accent, 2.2);
    label("InSAR line of sight", 0.98, 0.06, { align: "right" });
    label("Moving slope unit", 0.29, 0.67, { color: palette.white });
    label("Slope geometry", 0.72, 0.9);
  }

  if (figure === "subsidence") {
    path([[0, 0.35], [0.2, 0.35], [0.36, 0.41], [0.5, 0.54], [0.64, 0.41], [0.8, 0.35], [1, 0.35]], { stroke: palette.white, lineWidth: 2 });
    path([[0, 0.67], [1, 0.67]], { stroke: palette.signal, lineWidth: 1.5, dash: [7, 6] });
    path([[0, 0.82], [1, 0.82]], { stroke: palette.grid, lineWidth: 1.2 });
    [[0.23, 0.35, 0.23, 0.45], [0.37, 0.39, 0.37, 0.56], [0.5, 0.47, 0.5, 0.72], [0.63, 0.39, 0.63, 0.56], [0.77, 0.35, 0.77, 0.45]].forEach((motion) => arrow(...motion));
    path([[0.87, 0.18], [0.87, 0.75]], { stroke: palette.white, lineWidth: 2 });
    path([[0.84, 0.18], [0.9, 0.18]], { stroke: palette.white, lineWidth: 2 });
    dot(0.87, 0.67, 4, palette.signal);
    label("Subsidence bowl", 0.5, 0.18, { align: "center", color: palette.white });
    label("Groundwater level", 0.02, 0.62, { color: palette.signal });
    label("Operational well", 0.98, 0.87, { align: "right" });
  }

  if (figure === "tectonics") {
    path([[0, 0.3], [0.43, 0.3], [0.55, 0.72], [0, 0.72], [0, 0.3]], { stroke: palette.earth, fill: palette.earthDark, lineWidth: 1.4 });
    path([[0.43, 0.3], [1, 0.3], [1, 0.72], [0.55, 0.72], [0.43, 0.3]], { stroke: palette.earth, fill: "rgba(73, 102, 106, 0.56)", lineWidth: 1.4 });
    path([[0.43, 0.24], [0.56, 0.78]], { stroke: palette.accent, lineWidth: 2.4 });
    arrow(0.34, 0.18, 0.17, 0.18, palette.signal, 2);
    arrow(0.62, 0.18, 0.8, 0.18, palette.signal, 2);
    path([[0.05, 0.9], [0.28, 0.86], [0.42, 0.75], [0.57, 0.91], [0.76, 0.87], [0.96, 0.84]], { stroke: palette.white, lineWidth: 1.7 });
    dot(0.42, 0.75, 3.5);
    dot(0.57, 0.91, 3.5);
    label("Surface motion", 0.5, 0.05, { align: "center", color: palette.signal });
    label("Creeping fault", 0.61, 0.55, { color: palette.white });
    label("Displacement profile", 0.02, 0.98);
  }

  if (figure === "arctic") {
    const terrain = [[0, 0.72], [0.18, 0.58], [0.37, 0.26], [0.55, 0.43], [0.73, 0.6], [1, 0.73], [1, 1], [0, 1]];
    path(terrain, { stroke: palette.signal, fill: palette.earthDark, lineWidth: 1.6 });
    path([[0.11, 0.75], [0.3, 0.59], [0.47, 0.42], [0.66, 0.6], [0.82, 0.69]], { stroke: palette.signal, lineWidth: 1.2, dash: [5, 5] });
    path([[0.42, 0.43], [0.51, 0.48], [0.61, 0.55], [0.71, 0.63], [0.79, 0.69]], { stroke: palette.accent, fill: "rgba(219, 91, 61, 0.12)", lineWidth: 1.8 });
    arrow(0.51, 0.49, 0.64, 0.61, palette.accent, 2.1);
    arrow(0.62, 0.57, 0.75, 0.68, palette.accent, 2.1);
    [[0.43, 0.26], [0.55, 0.35], [0.67, 0.47]].forEach(([pointX, pointY]) => dot(pointX, pointY, 3.2, palette.signal));
    label("Seasonal motion", 0.51, 0.12, { align: "center", color: palette.signal });
    label("Active layer", 0.07, 0.82, { color: palette.white });
    label("Rock-glacier lobe", 0.98, 0.56, { align: "right" });
  }
};

const drawResearchConceptFigures = () => {
  researchConceptCanvases.forEach(drawResearchConceptFigure);
};

if (researchConceptCanvases.length) {
  if ("ResizeObserver" in window) {
    const conceptFigureObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => drawResearchConceptFigure(entry.target));
    });
    researchConceptCanvases.forEach((canvas) => conceptFigureObserver.observe(canvas));
  } else {
    window.addEventListener("resize", drawResearchConceptFigures, { passive: true });
  }
  requestAnimationFrame(drawResearchConceptFigures);
}

const researchThemeExplorer = document.querySelector("[data-research-explorer]");

if (researchThemeExplorer) {
  const themeTabs = [...researchThemeExplorer.querySelectorAll("[data-research-theme]")];
  const themePanels = [...researchThemeExplorer.querySelectorAll("[data-research-panel]")];
  const themeIds = new Set(themeTabs.map((tab) => tab.dataset.researchTheme));

  const activateResearchTheme = (themeId, { focus = false, updateHash = true } = {}) => {
    if (!themeIds.has(themeId)) return;

    themeTabs.forEach((tab) => {
      const isActive = tab.dataset.researchTheme === themeId;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      if (isActive && focus) tab.focus();
    });

    themePanels.forEach((panel) => {
      panel.hidden = panel.dataset.researchPanel !== themeId;
    });

    requestAnimationFrame(drawResearchConceptFigures);

    if (updateHash && window.history?.replaceState) {
      window.history.replaceState(null, "", `#theme-${themeId}`);
    }
  };

  themeTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateResearchTheme(tab.dataset.researchTheme));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (["ArrowDown", "ArrowRight"].includes(event.key)) nextIndex = (index + 1) % themeTabs.length;
      else if (["ArrowUp", "ArrowLeft"].includes(event.key)) nextIndex = (index - 1 + themeTabs.length) % themeTabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = themeTabs.length - 1;
      else return;

      event.preventDefault();
      activateResearchTheme(themeTabs[nextIndex].dataset.researchTheme, { focus: true });
    });
  });

  const requestedTheme = window.location.hash.startsWith("#theme-")
    ? window.location.hash.replace("#theme-", "")
    : "landslides";
  activateResearchTheme(themeIds.has(requestedTheme) ? requestedTheme : "landslides", { updateHash: false });
}

const careerExplorer = document.querySelector("[data-career-explorer]");

if (careerExplorer) {
  const careerTabList = careerExplorer.querySelector(".career-tabs");
  const careerPanelHome = careerExplorer.querySelector(".career-panels");
  const careerTabs = [...careerExplorer.querySelectorAll("[data-career-tab]")];
  const careerPanels = [...careerExplorer.querySelectorAll("[data-career-panel]")];
  const compactCareer = window.matchMedia("(max-width: 640px)");
  let activeCareerId = "ngu";

  const activateCareer = (careerId, { focus = false } = {}) => {
    activeCareerId = careerId;
    careerTabs.forEach((tab) => {
      const isActive = tab.dataset.careerTab === careerId;
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("aria-expanded", String(isActive));
      tab.tabIndex = compactCareer.matches || isActive ? 0 : -1;
      if (isActive && focus) tab.focus();
    });

    careerPanels.forEach((panel) => {
      panel.hidden = panel.dataset.careerPanel !== careerId;
    });
  };

  const collapseCareer = () => {
    activeCareerId = "";
    careerTabs.forEach((tab) => {
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("aria-expanded", "false");
      tab.tabIndex = 0;
    });
    careerPanels.forEach((panel) => {
      panel.hidden = true;
    });
  };

  const syncCareerLayout = () => {
    if (compactCareer.matches) {
      careerTabList.setAttribute("role", "group");
      careerTabs.forEach((tab) => {
        tab.removeAttribute("role");
        const panel = careerPanels.find((item) => item.dataset.careerPanel === tab.dataset.careerTab);
        if (panel) {
          panel.setAttribute("role", "region");
          tab.after(panel);
        }
      });
    } else {
      if (!activeCareerId) activeCareerId = "ngu";
      careerTabList.setAttribute("role", "tablist");
      careerTabs.forEach((tab) => tab.setAttribute("role", "tab"));
      careerPanels.forEach((panel) => {
        panel.setAttribute("role", "tabpanel");
        careerPanelHome.append(panel);
      });
    }

    activateCareer(activeCareerId);
  };

  careerTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      const isOpen = tab.getAttribute("aria-expanded") === "true";
      if (compactCareer.matches && isOpen) collapseCareer();
      else activateCareer(tab.dataset.careerTab);
    });
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (index + 1) % careerTabs.length;
      else if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (index - 1 + careerTabs.length) % careerTabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = careerTabs.length - 1;
      else return;

      event.preventDefault();
      activateCareer(careerTabs[nextIndex].dataset.careerTab, { focus: true });
    });
  });

  compactCareer.addEventListener("change", syncCareerLayout);
  syncCareerLayout();
}
