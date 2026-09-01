document.addEventListener("DOMContentLoaded", () => {
  loadAwards();
  wireResearchFilter();
  loadResearch();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function wireResearchFilter() {
  document.getElementById("research-category-filter").addEventListener("change", loadResearch);
}

async function loadAwards() {
  const strip = document.getElementById("awards-strip");
  const { data, error } = await supabaseClient
    .from("research_items")
    .select("title,authors,publication_date")
    .eq("category", "Research Award")
    .eq("is_published", true)
    .order("publication_date", { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    strip.style.display = "none";
    return;
  }

  strip.innerHTML = data
    .map(
      (a) => `
      <div class="award-card">
        <div class="award-tag">Research Award</div>
        <h4>${escapeHtmlR(a.title)}</h4>
        <p>${escapeHtmlR(a.authors || "")}</p>
      </div>`
    )
    .join("");
}

async function loadResearch() {
  const list = document.getElementById("research-list");
  const filterVal = document.getElementById("research-category-filter").value;

  list.innerHTML = `<p class="card-empty">Loading research…</p>`;

  let query = supabaseClient
    .from("research_items")
    .select("title,category,authors,abstract,publication_date,external_link")
    .eq("is_published", true)
    .order("publication_date", { ascending: false });

  if (filterVal) query = query.eq("category", filterVal);

  const { data, error } = await query;

  if (error) {
    console.error("Research load failed:", error);
    list.innerHTML = `<p class="card-empty">Something went wrong loading the research repository.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">Nothing published in this category yet — add rows to the "research_items" table in Supabase.</p>`;
    return;
  }

  list.innerHTML = data.map(researchCard).join("");
}

function researchCard(r) {
  const date = r.publication_date
    ? new Date(r.publication_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";
  return `
    <div class="research-card">
      <div class="card-category">${escapeHtmlR(r.category)}</div>
      <h3>${escapeHtmlR(r.title)}</h3>
      ${r.authors ? `<div class="research-authors">${escapeHtmlR(r.authors)}</div>` : ""}
      <p class="abstract">${escapeHtmlR(r.abstract || "")}</p>
      <div class="research-meta">
        ${date ? `<span>${date}</span>` : ""}
        ${r.external_link ? `<a href="${r.external_link}" target="_blank" rel="noopener">View full paper →</a>` : ""}
      </div>
    </div>`;
}

function escapeHtmlR(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
