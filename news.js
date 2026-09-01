const PAGE_SIZE = 9;
let currentOffset = 0;
let currentCategory = "";
let currentSearch = "";

document.addEventListener("DOMContentLoaded", () => {
  wireFilters();
  loadNewsPage(true);
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function wireFilters() {
  const categorySelect = document.getElementById("category-filter");
  const searchInput = document.getElementById("news-search");
  const loadMoreBtn = document.getElementById("load-more");

  categorySelect.addEventListener("change", () => {
    currentCategory = categorySelect.value;
    loadNewsPage(true);
  });

  let debounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      loadNewsPage(true);
    }, 350);
  });

  loadMoreBtn.addEventListener("click", () => loadNewsPage(false));
}

async function loadNewsPage(reset) {
  const grid = document.getElementById("news-grid-full");
  const countLabel = document.getElementById("news-count");
  const loadMoreBtn = document.getElementById("load-more");

  if (reset) {
    currentOffset = 0;
    grid.innerHTML = `<p class="card-empty">Loading news…</p>`;
  }

  let query = supabaseClient
    .from("news")
    .select("title,slug,category,excerpt,image_url,published_at", { count: "exact" })
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(currentOffset, currentOffset + PAGE_SIZE - 1);

  if (currentCategory) query = query.eq("category", currentCategory);
  if (currentSearch) query = query.ilike("title", `%${currentSearch}%`);

  const { data, count, error } = await query;

  if (error) {
    console.error("News load failed:", error);
    grid.innerHTML = `<p class="card-empty">Something went wrong loading news.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    if (reset) {
      grid.innerHTML = `<p class="card-empty">No news articles match your filters yet — add rows to the "news" table in Supabase, or try a different category/search.</p>`;
      countLabel.textContent = "";
    }
    loadMoreBtn.style.display = "none";
    return;
  }

  const cardsHtml = data.map(newsCardFull).join("");
  grid.innerHTML = reset ? cardsHtml : grid.innerHTML + cardsHtml;

  currentOffset += data.length;
  countLabel.textContent = `Showing ${currentOffset} of ${count ?? data.length} articles`;
  loadMoreBtn.style.display = currentOffset < (count ?? 0) ? "inline-block" : "none";
}

function newsCardFull(n) {
  const date = n.published_at
    ? new Date(n.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";
  return `
    <article class="news-card-full">
      <div class="card-media" style="${n.image_url ? `background-image:url('${n.image_url}');background-size:cover;background-position:center;` : ""}"></div>
      <div class="card-body">
        <div class="card-category">${escapeHtmlN(n.category)}</div>
        <h3>${escapeHtmlN(n.title)}</h3>
        <p>${escapeHtmlN(n.excerpt || "")}</p>
        <div class="news-date">${date}</div>
      </div>
    </article>`;
}

function escapeHtmlN(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
