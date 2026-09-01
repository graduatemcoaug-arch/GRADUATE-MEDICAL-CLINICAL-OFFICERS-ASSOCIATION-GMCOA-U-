document.addEventListener("DOMContentLoaded", () => {
  wireVerifyForm();
  wireNavToggleVerify();
  autoSearchFromUrl();
});

function wireNavToggleVerify() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => links.classList.toggle("open"));
}

function autoSearchFromUrl() {
  const params = new URLSearchParams(location.search);
  const number = params.get("number");
  if (!number) return;
  document.getElementById("verify-query").value = number;
  runVerifySearch(number);
}

function wireVerifyForm() {
  const form = document.getElementById("verify-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = form.querySelector("[name=query]").value.trim();
    if (!query) return;
    runVerifySearch(query);
  });
}

async function runVerifySearch(query) {
  const resultBox = document.getElementById("verify-result");
  resultBox.innerHTML = `<p class="verify-empty">Searching…</p>`;

  // Try an exact membership-number match first, then fall back to a
  // partial name search — covers both ways someone might look a member up.
  const byNumber = await supabaseClient
    .from("member_directory")
    .select("full_name,membership_number,membership_category,district,region,status,valid_until")
    .eq("membership_number", query);

  let data = byNumber.data;

  if (!data || data.length === 0) {
    const byName = await supabaseClient
      .from("member_directory")
      .select("full_name,membership_number,membership_category,district,region,status,valid_until")
      .ilike("full_name", `%${query}%`)
      .limit(10);
    data = byName.data;
  }

  renderResults(data);
}

function renderResults(data) {
  const resultBox = document.getElementById("verify-result");

  if (!data || data.length === 0) {
    resultBox.innerHTML = `
      <div class="verify-empty">
        <strong>No matching member found.</strong><br>
        Double-check the membership number or spelling, or contact GMCOA-U directly to confirm membership status.
      </div>`;
    return;
  }

  resultBox.innerHTML = data.map((m) => memberCard(m)).join("");
}

function memberCard(m) {
  const status = (m.status || "Active").toLowerCase();
  const icon = status === "active" ? "✓" : status === "expired" ? "!" : "•";
  const validUntil = m.valid_until
    ? new Date(m.valid_until).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return `
    <div class="verify-card">
      <div class="verify-badge ${status}">${icon}</div>
      <div>
        <div class="verify-name">${escapeHtmlV(m.full_name)}</div>
        <span class="verify-status ${status}">${escapeHtmlV(m.status)}</span>
        <div class="verify-meta">
          <span><strong>Membership No.:</strong> ${escapeHtmlV(m.membership_number)}</span>
          <span><strong>Category:</strong> ${escapeHtmlV(m.membership_category)}</span><br>
          <span><strong>District:</strong> ${escapeHtmlV(m.district || "—")}</span>
          <span><strong>Region:</strong> ${escapeHtmlV(m.region || "—")}</span><br>
          <span><strong>Valid Until:</strong> ${validUntil}</span>
        </div>
      </div>
    </div>`;
}

function escapeHtmlV(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
