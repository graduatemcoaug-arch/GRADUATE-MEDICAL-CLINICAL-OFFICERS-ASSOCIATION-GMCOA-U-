document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("meeting-link-form").addEventListener("submit", saveMeetingLink);
  document.getElementById("event-form").addEventListener("submit", saveEvent);
  document.getElementById("event-cancel-edit").addEventListener("click", resetEventForm);
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
  loadAllEvents();
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

async function saveEvent(e) {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById("event-form-status");
  const id = form.id.value;

  let photoUrl = null;
  const file = form.photo.files[0];
  if (file) {
    status.textContent = "Uploading photo…";
    status.style.color = "var(--text-muted)";
    const path = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from("event-photos").upload(path, file);
    if (uploadError) {
      status.textContent = "Photo upload failed: " + uploadError.message;
      status.style.color = "#B3261E";
      return;
    }
    const { data: urlData } = supabaseClient.storage.from("event-photos").getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  }

  const payload = {
    title: form.title.value.trim(),
    event_type: form.event_type.value.trim() || null,
    description: form.description.value.trim() || null,
    start_time: new Date(form.start_time.value).toISOString(),
    end_time: form.end_time.value ? new Date(form.end_time.value).toISOString() : null,
    location: form.location.value.trim() || null,
    is_virtual: form.is_virtual.checked,
    registration_url: form.registration_url.value.trim() || null,
  };
  if (photoUrl) payload.image_url = photoUrl;

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("events").update(payload).eq("id", id));
  } else {
    ({ error } = await supabaseClient.from("events").insert(payload));
  }

  if (error) {
    status.textContent = "Failed: " + error.message;
    status.style.color = "#B3261E";
    return;
  }

  status.textContent = id ? "Updated!" : "Event created!";
  status.style.color = "var(--green)";
  resetEventForm();
  loadAllEvents();
  loadEventSelect();
  loadEventsForLinks();
}

function resetEventForm() {
  const form = document.getElementById("event-form");
  form.reset();
  form.id.value = "";
  document.getElementById("event-form-title").textContent = "Add a New Event";
  document.getElementById("event-cancel-edit").style.display = "none";
}

async function loadAllEvents() {
  const list = document.getElementById("all-events-list");
  const { data, error } = await supabaseClient.from("events").select("*").order("start_time", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No events yet — create one above.</p>`; return; }

  list.innerHTML = data.map((e) => `
    <div class="dir-row">
      <div style="display:flex;align-items:center;gap:12px;">
        ${e.image_url ? `<div style="width:44px;height:44px;border-radius:8px;background-image:url('${e.image_url}');background-size:cover;background-position:center;flex-shrink:0;"></div>` : ""}
        <div>
          <div class="dir-name">${escapeHtmlEv(e.title)}</div>
          <div class="dir-meta">${new Date(e.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${escapeHtmlEv(e.location || (e.is_virtual ? "Virtual" : ""))}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);padding:6px 12px;font-size:0.8rem;" onclick='editEvent(${JSON.stringify(e).replace(/'/g, "&apos;")})'>Edit</button>
        <button class="delete-entry-btn" onclick="deleteEvent('${e.id}')">Delete</button>
      </div>
    </div>`).join("");
}

function toLocalDatetimeInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function editEvent(e) {
  const form = document.getElementById("event-form");
  form.id.value = e.id;
  form.title.value = e.title || "";
  form.event_type.value = e.event_type || "";
  form.description.value = e.description || "";
  form.start_time.value = toLocalDatetimeInput(e.start_time);
  form.end_time.value = toLocalDatetimeInput(e.end_time);
  form.location.value = e.location || "";
  form.is_virtual.checked = !!e.is_virtual;
  form.registration_url.value = e.registration_url || "";
  document.getElementById("event-form-title").textContent = "Edit Event";
  document.getElementById("event-cancel-edit").style.display = "inline-block";
  form.scrollIntoView({ behavior: "smooth" });
}

async function deleteEvent(id) {
  if (!confirm("Delete this event? This cannot be undone, and existing registrations will remain but lose their event link.")) return;
  const { error } = await supabaseClient.from("events").delete().eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadAllEvents();
  loadEventSelect();
  loadEventsForLinks();
}

function escapeHtmlEv(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
