document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("document-form").addEventListener("submit", addDocument);
  document.getElementById("task-form").addEventListener("submit", addTask);
  document.getElementById("committee-meeting-form").addEventListener("submit", addCommitteeMeeting);
  document.getElementById("goal-form").addEventListener("submit", addGoal);
  document.getElementById("admin-back-to-threads").addEventListener("click", showAdminThreadList);
  document.getElementById("admin-reply-form").addEventListener("submit", sendAdminReply);

  document.querySelectorAll("#sec-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
});

function switchTab(tab) {
  document.querySelectorAll("#sec-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".comms-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tab));
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
  if (error) { note.textContent = "Login failed."; note.style.color = "#B3261E"; return; }
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
  loadDocuments();
  loadTasks();
  loadCommittees();
  loadGoals();
  loadAdminThreads();
}

/* ---------------- DOCUMENTS ---------------- */
async function addDocument(e) {
  e.preventDefault();
  const form = e.target;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const payload = {
    title: form.title.value.trim(),
    category: form.category.value,
    version_number: form.version_number.value.trim() || "1.0",
    file_link: form.file_link.value.trim(),
    uploaded_by: session?.user?.email || null,
    approval_status: form.approval_status.value,
  };
  const { error } = await supabaseClient.from("documents").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadDocuments();
}

async function loadDocuments() {
  const list = document.getElementById("documents-list");
  const { data, error } = await supabaseClient.from("documents").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No documents uploaded yet.</p>`; return; }

  list.innerHTML = data.map((d) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlSt(d.title)} <span style="color:var(--text-muted);font-weight:400;">v${escapeHtmlSt(d.version_number)}</span></div>
        <div class="dir-meta">${escapeHtmlSt(d.category || "")} · ${escapeHtmlSt(d.approval_status)}</div>
      </div>
      <a class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);" href="${d.file_link}" target="_blank" rel="noopener">Open</a>
    </div>`).join("");
}

/* ---------------- TASKS ---------------- */
async function addTask(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    title: form.title.value.trim(),
    description: form.description.value.trim() || null,
    assigned_to: form.assigned_to.value.trim() || null,
    due_date: form.due_date.value || null,
    priority: form.priority.value,
    related_area: form.related_area.value.trim() || null,
  };
  const { error } = await supabaseClient.from("tasks").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadTasks();
}

async function loadTasks() {
  const list = document.getElementById("tasks-list");
  const { data, error } = await supabaseClient.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No tasks yet.</p>`; return; }

  list.innerHTML = data.map((t) => `
    <div class="decision-card">
      <div class="decision-top">
        <div class="decision-resnum">${escapeHtmlSt(t.priority)} priority</div>
        <select class="task-status-select" data-id="${t.id}">
          <option ${t.status === "Not Started" ? "selected" : ""}>Not Started</option>
          <option ${t.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option ${t.status === "Completed" ? "selected" : ""}>Completed</option>
          <option ${t.status === "Overdue" ? "selected" : ""}>Overdue</option>
        </select>
      </div>
      <h3>${escapeHtmlSt(t.title)}</h3>
      <p>${escapeHtmlSt(t.description || "")}</p>
      <div class="decision-meta">
        <span>👤 ${escapeHtmlSt(t.assigned_to || "Unassigned")}</span>
        <span>🗓️ ${t.due_date ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}</span>
        ${t.related_area ? `<span>${escapeHtmlSt(t.related_area)}</span>` : ""}
      </div>
    </div>`).join("");

  document.querySelectorAll(".task-status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await supabaseClient.from("tasks").update({ status: sel.value }).eq("id", sel.dataset.id);
    });
  });
}

/* ---------------- COMMITTEES ---------------- */
async function loadCommittees() {
  const list = document.getElementById("committees-list");
  const select = document.getElementById("committee-meeting-select");
  const { data, error } = await supabaseClient.from("committees").select("*").order("name");
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }

  select.innerHTML = (data || []).map((c) => `<option value="${c.id}">${escapeHtmlSt(c.name)}</option>`).join("");

  const cards = [];
  for (const c of data || []) {
    const { data: meetings } = await supabaseClient.from("committee_meetings").select("*").eq("committee_id", c.id).order("meeting_date", { ascending: false });
    cards.push(`
      <div class="dash-card">
        <h3>${escapeHtmlSt(c.name)}</h3>
        ${(meetings || []).length === 0
          ? `<p class="dash-empty-note">No meetings logged yet.</p>`
          : meetings.map((m) => `<div class="dash-row"><span class="dr-label">${m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span><span class="dr-value">${m.minutes_link ? `<a href="${m.minutes_link}" target="_blank" rel="noopener">Minutes</a>` : "No minutes yet"}</span></div>`).join("")}
      </div>`);
  }
  list.innerHTML = `<div class="dash-grid">${cards.join("")}</div>`;
}

async function addCommitteeMeeting(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    committee_id: form.committee_id.value,
    meeting_date: form.meeting_date.value || null,
    agenda: form.agenda.value.trim() || null,
    minutes_link: form.minutes_link.value.trim() || null,
    virtual_meeting_platform: form.virtual_meeting_platform.value,
    virtual_meeting_link: form.virtual_meeting_link.value.trim() || null,
  };
  const { error } = await supabaseClient.from("committee_meetings").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadCommittees();
}

/* ---------------- STRATEGIC PLANNING ---------------- */
async function addGoal(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    goal: form.goal.value.trim(),
    category: form.category.value.trim() || null,
    target_date: form.target_date.value || null,
    progress_percent: parseInt(form.progress_percent.value || "0", 10),
    notes: form.notes.value.trim() || null,
  };
  const { error } = await supabaseClient.from("strategic_goals").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadGoals();
}

async function loadGoals() {
  const list = document.getElementById("goals-list");
  const { data, error } = await supabaseClient.from("strategic_goals").select("*").order("target_date", { ascending: true, nullsFirst: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No strategic goals set yet.</p>`; return; }

  list.innerHTML = data.map((g) => `
    <div class="budget-row">
      <div class="budget-top"><span class="b-cat">${escapeHtmlSt(g.goal)}</span><span class="b-year">${g.target_date ? new Date(g.target_date).getFullYear() : ""}</span></div>
      <div class="budget-bar"><div class="budget-bar-fill" style="width:${g.progress_percent}%;"></div></div>
      <div class="budget-nums"><span>${g.category || ""}</span><span>${g.progress_percent}% · ${g.status}</span></div>
    </div>`).join("");
}

/* ---------------- MESSAGES ---------------- */
let adminCurrentThreadId = null;

async function loadAdminThreads() {
  const list = document.getElementById("admin-threads-list");
  const { data, error } = await supabaseClient.from("message_threads").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No member messages yet.</p>`; return; }

  list.innerHTML = data.map((t) => `
    <div class="thread-row" data-id="${t.id}" data-subject="${escapeHtmlSt(t.subject)}">
      <h4>${escapeHtmlSt(t.subject)}</h4>
      <div class="tr-meta">${escapeHtmlSt(t.member_name)} · ${t.status} · ${new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
    </div>`).join("");

  document.querySelectorAll("#admin-threads-list .thread-row").forEach((row) => {
    row.addEventListener("click", () => openAdminThread(row.dataset.id, row.dataset.subject));
  });
}

function openAdminThread(threadId, subject) {
  adminCurrentThreadId = threadId;
  document.getElementById("admin-threads-list").style.display = "none";
  document.getElementById("admin-thread-detail").style.display = "block";
  document.getElementById("admin-thread-subject").textContent = subject;
  loadAdminMessages();
}

function showAdminThreadList() {
  document.getElementById("admin-thread-detail").style.display = "none";
  document.getElementById("admin-threads-list").style.display = "block";
  loadAdminThreads();
}

async function loadAdminMessages() {
  const box = document.getElementById("admin-messages-box");
  box.innerHTML = `<p class="card-empty">Loading…</p>`;
  const { data, error } = await supabaseClient.from("thread_messages").select("*").eq("thread_id", adminCurrentThreadId).order("created_at", { ascending: true });
  if (error) { box.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }

  box.innerHTML = (data || []).map((m) => `
    <div class="msg-bubble ${m.sender_role === "Member" ? "secretariat" : "member"}">
      ${escapeHtmlSt(m.body)}
      <div class="msg-meta">${m.sender_role} · ${new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
    </div>`).join("");
}

async function sendAdminReply(e) {
  e.preventDefault();
  const form = e.target;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const { error } = await supabaseClient.from("thread_messages").insert({
    thread_id: adminCurrentThreadId,
    sender_email: session.user.email,
    sender_role: "Secretariat",
    body: form.body.value.trim(),
  });
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadAdminMessages();
}

function escapeHtmlSt(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
