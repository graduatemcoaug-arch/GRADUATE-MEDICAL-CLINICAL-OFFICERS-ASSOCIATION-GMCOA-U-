let currentMediaType = "";

document.addEventListener("DOMContentLoaded", () => {
  wireMediaTabs();
  loadMedia();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function wireMediaTabs() {
  document.querySelectorAll(".media-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".media-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMediaType = btn.dataset.type || "";
      loadMedia();
    });
  });
}

async function loadMedia() {
  const grid = document.getElementById("media-grid");
  grid.innerHTML = `<p class="card-empty">Loading…</p>`;

  let query = supabaseClient
    .from("media_items")
    .select("title,media_type,description,thumbnail_url,external_link,published_date")
    .eq("is_published", true)
    .order("published_date", { ascending: false });

  if (currentMediaType) query = query.eq("media_type", currentMediaType);

  const { data, error } = await query;

  if (error) {
    console.error("Media load failed:", error);
    grid.innerHTML = `<p class="card-empty">Something went wrong loading media.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="card-empty">Nothing published here yet — add rows to the "media_items" table in Supabase as videos, photos, and other media become available.</p>`;
    return;
  }

  grid.innerHTML = `<div class="card-grid">${data.map(mediaCard).join("")}</div>`;
}

function mediaCard(m) {
  const typeClass = "type-" + m.media_type.toLowerCase().replace(/\s+/g, "-");
  const date = m.published_date
    ? new Date(m.published_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";
  const inner = `
    <div class="card-media" style="${m.thumbnail_url ? `background-image:url('${m.thumbnail_url}');background-size:cover;background-position:center;` : ""}"></div>
    <div class="card-body">
      <div class="card-category">${escapeHtmlM(m.media_type)}</div>
      <h3>${escapeHtmlM(m.title)}</h3>
      <p>${escapeHtmlM(m.description || "")}</p>
      ${date ? `<p style="margin-top:8px;font-size:0.78rem;">${date}</p>` : ""}
    </div>`;

  return m.external_link
    ? `<a class="media-card ${typeClass}" href="${m.external_link}" target="_blank" rel="noopener" style="text-decoration:none;">${inner}</a>`
    : `<div class="media-card ${typeClass}">${inner}</div>`;
}

function escapeHtmlM(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
