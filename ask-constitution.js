document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ask-form").addEventListener("submit", handleSearch);
  document.querySelectorAll(".sample-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("ask-input").value = btn.textContent;
      runSearch(btn.textContent);
    });
  });
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function handleSearch(e) {
  e.preventDefault();
  const query = document.getElementById("ask-input").value.trim();
  if (query) runSearch(query);
}

function runSearch(query) {
  const resultsBox = document.getElementById("ask-results");
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  if (terms.length === 0) {
    resultsBox.innerHTML = `<p class="verify-empty">Type a question or keyword to search.</p>`;
    return;
  }

  const scored = CONSTITUTION_INDEX.map((entry) => {
    const haystack = (entry.section + " " + entry.keywords + " " + entry.summary).toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { entry, score };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    resultsBox.innerHTML = `
      <p class="verify-empty">No matching provisions found. Try different keywords, or browse the
      <a href="constitution.pdf">full Constitution PDF</a> directly.</p>`;
    return;
  }

  resultsBox.innerHTML = scored.slice(0, 6).map((r) => `
    <div class="research-card">
      <div class="card-category">${escapeHtmlAsk(r.entry.article)}</div>
      <h3>${escapeHtmlAsk(r.entry.section)}</h3>
      <p class="abstract">${escapeHtmlAsk(r.entry.summary)}</p>
    </div>`).join("") +
    `<p style="font-size:0.85rem;color:var(--text-muted);margin-top:16px;">These are summaries for quick reference, not the verbatim legal text. For the exact wording, see the <a href="constitution.pdf">full Constitution PDF</a>.</p>`;
}

function escapeHtmlAsk(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
