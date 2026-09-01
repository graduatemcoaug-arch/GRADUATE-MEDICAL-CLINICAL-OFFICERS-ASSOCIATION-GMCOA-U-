document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("decision-form").addEventListener("submit", addDecision);
});

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
  loadDecisions();
}

async function addDecision(e) {
  e.preventDefault();
  const form = e.target;

  const payload = {
    resolution_number: form.resolution_number.value.trim(),
    decision_title: form.decision_title.value.trim(),
    description: form.description.value.trim() || null,
    responsible_person: form.responsible_person.value.trim() || null,
    deadline: form.deadline.value || null,
    supporting_document_link: form.supporting_document_link.value.trim() || null,
  };

  const { error } = await supabaseClient.from("executive_decisions").insert(payload);

  if (error) {
    alert("Failed to save: " + error.message);
    return;
  }
  form.reset();
  loadDecisions();
}

async function loadDecisions() {
  const list = document.getElementById("decisions-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("executive_decisions")
    .select("*")
    .order("deadline", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Failed to load decisions:", error);
    list.innerHTML = `<p class="card-empty">Something went wrong loading decisions.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No decisions logged yet — add one above.</p>`;
    return;
  }

  list.innerHTML = data.map(decisionCard).join("");

  document.querySelectorAll(".decision-status-select").forEach((sel) => {
    sel.addEventListener("change", () => updateStatus(sel.dataset.id, sel.value, sel));
  });
}

function decisionCard(d) {
  const statusClass = d.status.toLowerCase().replace(" ", "-");
  const deadline = d.deadline
    ? new Date(d.deadline).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "No deadline set";

  return `
    <div class="decision-card">
      <div class="decision-top">
        <div class="decision-resnum">${escapeHtmlG(d.resolution_number)}</div>
        <select class="decision-status-select ${statusClass}" data-id="${d.id}">
          <option value="Pending" ${d.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="In Progress" ${d.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option value="Completed" ${d.status === "Completed" ? "selected" : ""}>Completed</option>
          <option value="Overdue" ${d.status === "Overdue" ? "selected" : ""}>Overdue</option>
        </select>
      </div>
      <h3>${escapeHtmlG(d.decision_title)}</h3>
      <p>${escapeHtmlG(d.description || "")}</p>
      <div class="decision-meta">
        <span>👤 ${escapeHtmlG(d.responsible_person || "Unassigned")}</span>
        <span>🗓️ ${deadline}</span>
        ${d.supporting_document_link ? `<a href="${d.supporting_document_link}" target="_blank" rel="noopener">Document →</a>` : ""}
      </div>
    </div>`;
}

async function updateStatus(id, newStatus, selectEl) {
  const payload = { status: newStatus };
  if (newStatus === "Completed") payload.completion_date = new Date().toISOString().slice(0, 10);

  const { error } = await supabaseClient
    .from("executive_decisions")
    .update(payload)
    .eq("id", id);

  if (error) {
    alert("Failed to update status: " + error.message);
    return;
  }

  selectEl.className = "decision-status-select " + newStatus.toLowerCase().replace(" ", "-");
}

function escapeHtmlG(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
