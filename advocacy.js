document.addEventListener("DOMContentLoaded", () => {
  wireAdvocacyFilters();
  loadAdvocacy();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function wireAdvocacyFilters() {
  document.getElementById("advocacy-category-filter").addEventListener("change", loadAdvocacy);
  document.getElementById("advocacy-status-filter").addEventListener("change", loadAdvocacy);
}

async function loadAdvocacy() {
  const list = document.getElementById("advocacy-list");
  const categoryVal = document.getElementById("advocacy-category-filter").value;
  const statusVal = document.getElementById("advocacy-status-filter").value;

  list.innerHTML = `<p class="card-empty">Loading advocacy work…</p>`;

  let query = supabaseClient
    .from("advocacy_items")
    .select("title,category,summary,status,event_date,external_link")
    .eq("is_published", true)
    .order("event_date", { ascending: false });

  if (categoryVal) query = query.eq("category", categoryVal);
  if (statusVal) query = query.eq("status", statusVal);

  const { data, error } = await query;

  if (error) {
    console.error("Advocacy load failed:", error);
    list.innerHTML = `<p class="card-empty">Debug error: ${escapeHtmlA(error.message || JSON.stringify(error))}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">Nothing matches this filter yet — add rows to the "advocacy_items" table in Supabase.</p>`;
    return;
  }

  list.innerHTML = data.map(advocacyCard).join("");
}

function advocacyCard(a) {
  const status = (a.status || "Ongoing").toLowerCase();
  const date = a.event_date
    ? new Date(a.event_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";
  return `
    <div class="advocacy-card status-${status}">
      <div class="advocacy-top">
        <div class="card-category">${escapeHtmlA(a.category)}</div>
        <span class="advocacy-status ${status}">${escapeHtmlA(a.status)}</span>
      </div>
      <h3>${escapeHtmlA(a.title)}</h3>
      <p>${escapeHtmlA(a.summary || "")}</p>
      <div class="advocacy-meta">
        ${date}
        ${a.external_link ? ` · <a href="${a.external_link}" target="_blank" rel="noopener">Read more →</a>` : ""}
      </div>
    </div>`;
}

function escapeHtmlA(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
