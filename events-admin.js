document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("meeting-link-form").addEventListener("submit", saveMeetingLink);
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
  loadEventSelect();
  loadEventsForLinks();
}

async function loadEventsForLinks() {
  const list = document.getElementById("events-link-list");
  const { data, error } = await supabaseClient.from("events").select("id,title,virtual_meeting_link,virtual_meeting_platform").order("start_time", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No events yet.</p>`; return; }

  list.innerHTML = data.map((e) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlEv(e.title)}</div>
        <div class="dir-meta">${e.virtual_meeting_link ? `${escapeHtmlEv(e.virtual_meeting_platform || "")}: ${escapeHtmlEv(e.virtual_meeting_link)}` : "No virtual link set"}</div>
      </div>
      <button class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);" onclick="editLink('${e.id}','${escapeHtmlEv(e.title)}')">Edit Link</button>
    </div>`).join("");
}

function editLink(id, title) {
  document.getElementById("meeting-link-form").dataset.eventId = id;
  document.getElementById("link-event-title").textContent = title;
  document.getElementById("meeting-link-form").scrollIntoView({ behavior: "smooth" });
}

async function saveMeetingLink(e) {
  e.preventDefault();
  const form = e.target;
  const eventId = form.dataset.eventId;
  if (!eventId) { alert("Tap 'Edit Link' on an event first."); return; }

  const { error } = await supabaseClient.from("events").update({
    virtual_meeting_link: form.virtual_meeting_link.value.trim(),
    virtual_meeting_platform: form.virtual_meeting_platform.value,
  }).eq("id", eventId);

  if (error) { alert("Failed: " + error.message); return; }
  alert("Saved!");
  loadEventsForLinks();
}

async function loadEventSelect() {
  const select = document.getElementById("event-select");
  const { data } = await supabaseClient.from("events").select("id,title").order("start_time", { ascending: false });
  select.innerHTML = `<option value="">Choose an event…</option>` + (data || []).map((e) => `<option value="${e.id}">${escapeHtmlEv(e.title)}</option>`).join("");
  select.addEventListener("change", () => loadRegistrations(select.value));
}

async function loadRegistrations(eventId) {
  const list = document.getElementById("registrations-list");
  if (!eventId) { list.innerHTML = ""; return; }
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient.from("event_registrations").select("*").eq("event_id", eventId);
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No registrations yet.</p>`; return; }

  list.innerHTML = data.map((r) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlEv(r.full_name)}</div>
        <div class="dir-meta">${escapeHtmlEv(r.registration_number)} · ${escapeHtmlEv(r.attendance_type)}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <select class="attendance-select" data-id="${r.id}">
          <option ${r.attendance_status === "Not Checked In" ? "selected" : ""}>Not Checked In</option>
          <option ${r.attendance_status === "Checked In" ? "selected" : ""}>Checked In</option>
        </select>
        <select class="payment-select" data-id="${r.id}">
          <option ${r.payment_status === "Unpaid" ? "selected" : ""}>Unpaid</option>
          <option ${r.payment_status === "Paid" ? "selected" : ""}>Paid</option>
          <option ${r.payment_status === "Waived" ? "selected" : ""}>Waived</option>
          <option ${r.payment_status === "Refunded" ? "selected" : ""}>Refunded</option>
        </select>
      </div>
    </div>`).join("");

  document.querySelectorAll(".attendance-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await supabaseClient.from("event_registrations").update({ attendance_status: sel.value }).eq("id", sel.dataset.id);
    });
  });
  document.querySelectorAll(".payment-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await supabaseClient.from("event_registrations").update({ payment_status: sel.value }).eq("id", sel.dataset.id);
    });
  });
}

function escapeHtmlEv(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
