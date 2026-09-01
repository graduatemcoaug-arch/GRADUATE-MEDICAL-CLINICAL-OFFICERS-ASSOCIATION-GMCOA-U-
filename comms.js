document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("corr-form").addEventListener("submit", addCorrespondence);
  document.getElementById("stake-form").addEventListener("submit", addStakeholder);
  document.getElementById("tab-corr").addEventListener("click", () => switchTab("corr"));
  document.getElementById("tab-stake").addEventListener("click", () => switchTab("stake"));
});

function switchTab(tab) {
  document.getElementById("tab-corr").classList.toggle("active", tab === "corr");
  document.getElementById("tab-stake").classList.toggle("active", tab === "stake");
  document.getElementById("panel-corr").classList.toggle("active", tab === "corr");
  document.getElementById("panel-stake").classList.toggle("active", tab === "stake");
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) showDashboard();
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  const note = document.getElementById("login-note");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    note.textContent = "Login failed — check your email and password.";
    note.style.color = "#B3261E";
    return;
  }
  showDashboard();
}

async function logout() {
  await supabaseClient.auth.signOut();
  document.getElementById("admin-dashboard").style.display = "none";
  document.getElementById("admin-login").style.display = "block";
}

function showDashboard() {
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-dashboard").style.display = "block";
  loadCorrespondence();
  loadStakeholders();
}

async function addCorrespondence(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    reference_number: form.reference_number.value.trim(),
    direction: form.direction.value,
    correspondence_type: form.correspondence_type.value,
    subject: form.subject.value.trim(),
    counterpart: form.counterpart.value.trim() || null,
    correspondence_date: form.correspondence_date.value || new Date().toISOString().slice(0, 10),
    document_link: form.document_link.value.trim() || null,
    notes: form.notes.value.trim() || null,
  };

  const { error } = await supabaseClient.from("correspondence").insert(payload);
  if (error) { alert("Failed to save: " + error.message); return; }
  form.reset();
  loadCorrespondence();
}

async function loadCorrespondence() {
  const list = document.getElementById("corr-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("correspondence")
    .select("*")
    .order("correspondence_date", { ascending: false });

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong loading correspondence.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No correspondence logged yet.</p>`; return; }

  list.innerHTML = data.map((c) => `
    <div class="corr-card">
      <div class="corr-top">
        <div class="corr-refnum">${escapeHtmlCm(c.reference_number)}</div>
        <span class="direction-badge ${c.direction.toLowerCase()}">${escapeHtmlCm(c.direction)}</span>
      </div>
      <h4>${escapeHtmlCm(c.subject)}</h4>
      <p>${escapeHtmlCm(c.notes || "")}</p>
      <div class="corr-meta">
        <span>${escapeHtmlCm(c.correspondence_type || "")}</span>
        <span>${escapeHtmlCm(c.counterpart || "")}</span>
        <span>${new Date(c.correspondence_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
        <span class="status-pill ${c.status.toLowerCase()}">${escapeHtmlCm(c.status)}</span>
        ${c.document_link ? `<a href="${c.document_link}" target="_blank" rel="noopener">Document →</a>` : ""}
      </div>
    </div>`).join("");
}

async function addStakeholder(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    organization_name: form.organization_name.value.trim(),
    category: form.category.value,
    contact_person: form.contact_person.value.trim() || null,
    contact_email: form.contact_email.value.trim() || null,
    contact_phone: form.contact_phone.value.trim() || null,
    last_engagement_date: form.last_engagement_date.value || null,
    follow_up_date: form.follow_up_date.value || null,
    notes: form.notes.value.trim() || null,
  };

  const { error } = await supabaseClient.from("stakeholders").insert(payload);
  if (error) { alert("Failed to save: " + error.message); return; }
  form.reset();
  loadStakeholders();
}

async function loadStakeholders() {
  const list = document.getElementById("stake-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("stakeholders")
    .select("*")
    .order("organization_name", { ascending: true });

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong loading stakeholders.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No stakeholders logged yet.</p>`; return; }

  list.innerHTML = data.map((s) => `
    <div class="stake-card">
      <div class="card-category">${escapeHtmlCm(s.category || "")}</div>
      <h4>${escapeHtmlCm(s.organization_name)}</h4>
      <p>${escapeHtmlCm(s.notes || "")}</p>
      <div class="stake-meta">
        ${s.contact_person ? `<span>👤 ${escapeHtmlCm(s.contact_person)}</span>` : ""}
        ${s.contact_email ? `<span>✉️ ${escapeHtmlCm(s.contact_email)}</span>` : ""}
        ${s.last_engagement_date ? `<span>Last: ${new Date(s.last_engagement_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>` : ""}
        ${s.follow_up_date ? `<span>📌 Follow up: ${new Date(s.follow_up_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>` : ""}
      </div>
    </div>`).join("");
}

function escapeHtmlCm(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
