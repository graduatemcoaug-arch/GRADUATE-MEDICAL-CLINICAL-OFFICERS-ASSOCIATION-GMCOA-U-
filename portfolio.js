let currentType = "";

document.addEventListener("DOMContentLoaded", () => {
  checkAccess();
  document.getElementById("entry-form").addEventListener("submit", addEntry);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.querySelectorAll(".portfolio-type-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".portfolio-type-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentType = btn.dataset.type || "";
      loadEntries();
    });
  });
});

async function checkAccess() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }
  document.getElementById("welcome-note").textContent = `Logged in as ${session.user.email}`;
  loadEntries();
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "portal.html";
}

async function addEntry(e) {
  e.preventDefault();
  const form = e.target;
  const { data: { session } } = await supabaseClient.auth.getSession();

  const payload = {
    owner_email: session.user.email,
    entry_type: form.entry_type.value,
    title: form.title.value.trim(),
    organization: form.organization.value.trim() || null,
    entry_date: form.entry_date.value || null,
    description: form.description.value.trim() || null,
    is_public: form.is_public.checked,
  };

  const { error } = await supabaseClient.from("portfolio_entries").insert(payload);
  if (error) { alert("Failed to save: " + error.message); return; }
  form.reset();
  loadEntries();
}

async function loadEntries() {
  const list = document.getElementById("portfolio-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  let query = supabaseClient
    .from("portfolio_entries")
    .select("*")
    .order("entry_date", { ascending: false, nullsFirst: false });

  if (currentType) query = query.eq("entry_type", currentType);

  const { data, error } = await query;

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong loading your portfolio.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">Nothing here yet — add an entry above.</p>`; return; }

  list.innerHTML = data.map(entryRow).join("");

  document.querySelectorAll(".delete-entry-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteEntry(btn.dataset.id));
  });
  document.querySelectorAll(".visibility-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => toggleVisibility(cb.dataset.id, cb.checked));
  });
}

function entryRow(p) {
  const date = p.entry_date
    ? new Date(p.entry_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })
    : "";
  return `
    <div class="portfolio-entry">
      <div>
        <h4>${escapeHtmlPf(p.title)}</h4>
        ${p.organization ? `<div class="pe-org">${escapeHtmlPf(p.organization)}</div>` : ""}
        ${date ? `<div class="pe-date">${date}</div>` : ""}
        ${p.description ? `<div class="pe-desc">${escapeHtmlPf(p.description)}</div>` : ""}
        <button class="delete-entry-btn" data-id="${p.id}">Delete</button>
      </div>
      <label class="visibility-toggle">
        <input type="checkbox" class="visibility-checkbox" data-id="${p.id}" ${p.is_public ? "checked" : ""}>
        Public
      </label>
    </div>`;
}

async function toggleVisibility(id, isPublic) {
  const { error } = await supabaseClient
    .from("portfolio_entries")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) alert("Failed to update visibility: " + error.message);
}

async function deleteEntry(id) {
  if (!confirm("Delete this portfolio entry?")) return;
  const { error } = await supabaseClient.from("portfolio_entries").delete().eq("id", id);
  if (error) { alert("Failed to delete: " + error.message); return; }
  loadEntries();
}

function escapeHtmlPf(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
