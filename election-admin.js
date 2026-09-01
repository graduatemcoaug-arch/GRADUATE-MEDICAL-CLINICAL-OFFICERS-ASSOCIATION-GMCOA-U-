document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("election-form").addEventListener("submit", createElection);
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
  loadElections();
}

async function createElection(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    election_cycle: form.election_cycle.value.trim(),
    position_contested: form.position_contested.value.trim(),
    election_type: form.election_type.value,
    nomination_open_date: form.nomination_open_date.value || null,
    nomination_close_date: form.nomination_close_date.value || null,
    voting_open_date: form.voting_open_date.value || null,
    voting_close_date: form.voting_close_date.value || null,
  };

  const { error } = await supabaseClient.from("elections").insert(payload);
  if (error) { alert("Failed to create election: " + error.message); return; }
  form.reset();
  loadElections();
}

async function loadElections() {
  const list = document.getElementById("elections-admin-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("elections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No elections created yet.</p>`; return; }

  for (const el of data) {
    const { count: turnout } = await supabaseClient
      .from("voting_log")
      .select("*", { count: "exact", head: true })
      .eq("election_id", el.id);

    const { data: candidates } = await supabaseClient
      .from("candidates")
      .select("id,full_name,nomination_reference,status")
      .eq("election_id", el.id);

    const card = document.createElement("div");
    card.className = "election-card";
    card.innerHTML = `
      <div class="election-top">
        <div class="card-category">${escapeHtmlEa(el.election_type || "")}</div>
        <select class="election-status-select" data-id="${el.id}">
          <option value="Nominations Open" ${el.status === "Nominations Open" ? "selected" : ""}>Nominations Open</option>
          <option value="Nominations Closed" ${el.status === "Nominations Closed" ? "selected" : ""}>Nominations Closed</option>
          <option value="Voting Open" ${el.status === "Voting Open" ? "selected" : ""}>Voting Open</option>
          <option value="Closed" ${el.status === "Closed" ? "selected" : ""}>Closed</option>
          <option value="Results Declared" ${el.status === "Results Declared" ? "selected" : ""}>Results Declared</option>
        </select>
      </div>
      <h3>${escapeHtmlEa(el.position_contested)}</h3>
      <p style="color:var(--text-muted);font-size:0.88rem;">${escapeHtmlEa(el.election_cycle)} · Turnout: ${turnout ?? 0} votes</p>
      <div class="nom-review-list" style="margin-top:14px;"></div>`;

    list.appendChild(card);

    card.querySelector(".election-status-select").addEventListener("change", (e) => updateElectionStatus(el.id, e.target.value));

    const nomBox = card.querySelector(".nom-review-list");
    if (candidates && candidates.length > 0) {
      nomBox.innerHTML = candidates.map((c) => `
        <div class="dir-row">
          <div>
            <div class="dir-name">${escapeHtmlEa(c.full_name)}</div>
            <div class="dir-meta">${escapeHtmlEa(c.nomination_reference)}</div>
          </div>
          <select class="candidate-status-select" data-id="${c.id}">
            <option value="Pending" ${c.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Pending Clarification" ${c.status === "Pending Clarification" ? "selected" : ""}>Pending Clarification</option>
            <option value="Approved" ${c.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Rejected" ${c.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>
        </div>`).join("");

      nomBox.querySelectorAll(".candidate-status-select").forEach((sel) => {
        sel.addEventListener("change", () => updateCandidateStatus(sel.dataset.id, sel.value));
      });
    } else {
      nomBox.innerHTML = `<p class="card-empty">No nominations yet.</p>`;
    }
  }
}

async function updateElectionStatus(id, status) {
  const { error } = await supabaseClient.from("elections").update({ status }).eq("id", id);
  if (error) { alert("Failed to update: " + error.message); return; }
  loadElections();
}

async function updateCandidateStatus(id, status) {
  const { error } = await supabaseClient.from("candidates").update({ status }).eq("id", id);
  if (error) { alert("Failed to update: " + error.message); return; }
  loadElections();
}

function escapeHtmlEa(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
