document.addEventListener("DOMContentLoaded", () => {
  checkAccess();
  document.getElementById("project-form").addEventListener("submit", registerProject);
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function checkAccess() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "portal.html";
    return;
  }
  document.getElementById("welcome-note").textContent = `Logged in as ${session.user.email}`;
  loadProjects();
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "portal.html";
}

async function registerProject(e) {
  e.preventDefault();
  const form = e.target;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const email = session.user.email;

  const { data: idData, error: idError } = await supabaseClient.rpc("generate_research_id");
  if (idError) {
    alert("Failed to generate research ID: " + idError.message);
    return;
  }

  const payload = {
    research_id: idData,
    title: form.title.value.trim(),
    principal_investigator: form.principal_investigator.value.trim(),
    co_investigators: form.co_investigators.value.trim() || null,
    institution: form.institution.value.trim() || null,
    category: form.category.value,
    study_design: form.study_design.value.trim() || null,
    timeline_start: form.timeline_start.value || null,
    timeline_end: form.timeline_end.value || null,
    funding_source: form.funding_source.value.trim() || null,
    owner_email: email,
  };

  const { error } = await supabaseClient.from("research_projects").insert(payload);

  if (error) {
    alert("Failed to register project: " + error.message);
    return;
  }
  form.reset();
  loadProjects();
}

async function loadProjects() {
  const list = document.getElementById("projects-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("research_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load projects:", error);
    list.innerHTML = `<p class="card-empty">Something went wrong loading your projects.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No research projects registered yet — use the form above to register your first one.</p>`;
    return;
  }

  list.innerHTML = data.map(projectCard).join("");

  document.querySelectorAll(".status-select-project").forEach((sel) => {
    sel.addEventListener("change", () => updateProjectField(sel.dataset.id, "status", sel.value));
  });
  document.querySelectorAll(".ethics-select-project").forEach((sel) => {
    sel.addEventListener("change", () => updateProjectField(sel.dataset.id, "ethics_approval_status", sel.value));
  });
}

function projectCard(p) {
  let ethicsClass = p.ethics_approval_status.toLowerCase().replace(/\s+/g, "-");
  let ethicsNote = "";

  if (p.ethics_approval_status === "Approved" && p.ethics_expiry_date) {
    const daysLeft = Math.ceil((new Date(p.ethics_expiry_date) - new Date()) / 86400000);
    if (daysLeft < 0) {
      ethicsClass = "expired";
      ethicsNote = " (expired)";
    } else if (daysLeft <= 30) {
      ethicsClass = "expiring-soon";
      ethicsNote = ` (${daysLeft}d left)`;
    }
  }

  return `
    <div class="project-card">
      <div class="project-top">
        <div class="project-id">${escapeHtmlR(p.research_id)}</div>
        <select class="status-select-project" data-id="${p.id}">
          <option value="Planning" ${p.status === "Planning" ? "selected" : ""}>Planning</option>
          <option value="Ongoing" ${p.status === "Ongoing" ? "selected" : ""}>Ongoing</option>
          <option value="Completed" ${p.status === "Completed" ? "selected" : ""}>Completed</option>
          <option value="On Hold" ${p.status === "On Hold" ? "selected" : ""}>On Hold</option>
        </select>
      </div>
      <h3>${escapeHtmlR(p.title)}</h3>
      <div class="project-pi">PI: ${escapeHtmlR(p.principal_investigator)}${p.co_investigators ? ` · Co-I: ${escapeHtmlR(p.co_investigators)}` : ""}</div>
      <div class="project-meta">
        ${p.institution ? `<span>🏥 ${escapeHtmlR(p.institution)}</span>` : ""}
        ${p.category ? `<span>${escapeHtmlR(p.category)}</span>` : ""}
        ${p.funding_source ? `<span>💰 ${escapeHtmlR(p.funding_source)}</span>` : ""}
      </div>
      <div class="ethics-row">
        <span class="ethics-badge ${ethicsClass}">Ethics: ${escapeHtmlR(p.ethics_approval_status)}${ethicsNote}</span>
        <select class="ethics-select-project" data-id="${p.id}">
          <option value="Not Submitted" ${p.ethics_approval_status === "Not Submitted" ? "selected" : ""}>Not Submitted</option>
          <option value="Submitted" ${p.ethics_approval_status === "Submitted" ? "selected" : ""}>Submitted</option>
          <option value="Approved" ${p.ethics_approval_status === "Approved" ? "selected" : ""}>Approved</option>
          <option value="Expired" ${p.ethics_approval_status === "Expired" ? "selected" : ""}>Expired</option>
        </select>
      </div>
    </div>`;
}

async function updateProjectField(id, field, value) {
  const { error } = await supabaseClient
    .from("research_projects")
    .update({ [field]: value })
    .eq("id", id);

  if (error) {
    alert("Failed to update: " + error.message);
    return;
  }
  loadProjects();
}

function escapeHtmlR(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
