document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("meeting-form").addEventListener("submit", createMeeting);
  document.getElementById("resolution-form").addEventListener("submit", addResolution);
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
  loadMeetings();
}

async function createMeeting(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    meeting_type: form.meeting_type.value,
    title: form.title.value.trim(),
    meeting_date: form.meeting_date.value || null,
    agenda_document_link: form.agenda_document_link.value.trim() || null,
    virtual_meeting_link: form.virtual_meeting_link.value.trim() || null,
    virtual_meeting_platform: form.virtual_meeting_platform.value,
  };
  const { error } = await supabaseClient.from("general_meetings").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadMeetings();
}

async function loadMeetings() {
  const list = document.getElementById("meetings-admin-list");
  const select = document.getElementById("resolution-meeting-select");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient.from("general_meetings").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No meetings created yet.</p>`; return; }

  select.innerHTML = data.map((m) => `<option value="${m.id}">${escapeHtmlAa(m.title)}</option>`).join("");

  list.innerHTML = data.map((m) => `
    <div class="meeting-card">
      <div class="election-top">
        <div class="card-category">${escapeHtmlAa(m.meeting_type)}</div>
        <select class="meeting-status-select" data-id="${m.id}">
          <option ${m.status === "Notice Published" ? "selected" : ""}>Notice Published</option>
          <option ${m.status === "Registration Open" ? "selected" : ""}>Registration Open</option>
          <option ${m.status === "In Session" ? "selected" : ""}>In Session</option>
          <option ${m.status === "Closed" ? "selected" : ""}>Closed</option>
        </select>
      </div>
      <h3>${escapeHtmlAa(m.title)}</h3>
      <label style="font-size:0.82rem;font-weight:600;margin-top:10px;display:block;">Minutes Document Link</label>
      <input type="url" class="minutes-input" data-id="${m.id}" value="${m.minutes_document_link || ""}" placeholder="https://..." style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);margin-top:4px;">
    </div>`).join("");

  document.querySelectorAll(".meeting-status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await supabaseClient.from("general_meetings").update({ status: sel.value }).eq("id", sel.dataset.id);
    });
  });
  document.querySelectorAll(".minutes-input").forEach((input) => {
    input.addEventListener("blur", async () => {
      await supabaseClient.from("general_meetings").update({ minutes_document_link: input.value.trim() || null }).eq("id", input.dataset.id);
    });
  });
}

async function addResolution(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    meeting_id: form.meeting_id.value,
    resolution_text: form.resolution_text.value.trim(),
    vote_result: form.vote_result.value.trim() || null,
  };
  const { error } = await supabaseClient.from("meeting_resolutions").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  alert("Resolution recorded.");
}

function escapeHtmlAa(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
