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
  document.getElementById("gallery-form").addEventListener("submit", uploadGalleryPhoto);
  document.getElementById("leadership-form").addEventListener("submit", saveLeader);
  document.getElementById("leadership-cancel-edit").addEventListener("click", resetLeadershipForm);
  document.getElementById("announcement-form").addEventListener("submit", postAnnouncement);
  document.getElementById("committee-member-form").addEventListener("submit", addCommitteeMember);
  document.getElementById("course-form").addEventListener("submit", saveCourse);
  document.getElementById("course-cancel-edit").addEventListener("click", resetCourseForm);
  document.getElementById("external-status-filter").addEventListener("change", loadExternalCpd);
  document.getElementById("news-form").addEventListener("submit", saveNews);
  document.getElementById("news-cancel-edit").addEventListener("click", resetNewsForm);

  document.querySelectorAll("#cpd-subtabs button").forEach((btn) => {
    btn.addEventListener("click", () => switchCpdSubtab(btn.dataset.subtab));
  });

  document.querySelectorAll("#sec-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
});

function switchCpdSubtab(sub) {
  document.querySelectorAll("#cpd-subtabs button").forEach((b) => b.classList.toggle("active", b.dataset.subtab === sub));
  document.querySelectorAll("#tab-cpd .comms-panel").forEach((p) => p.classList.toggle("active", p.id === "cpdsub-" + sub));
}

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
  loadGallery();
  loadLeadershipAdmin();
  loadAnnouncementsAdmin();
  loadCoursesAdmin();
  loadExternalCpd();
  loadCertificatesAdmin();
  loadNewsAdmin();
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
  document.getElementById("committee-member-select").innerHTML = select.innerHTML;

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

/* ---------------- PHOTO GALLERY ---------------- */

async function uploadGalleryPhoto(e) {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById("gallery-upload-status");
  const files = Array.from(form.photo.files).slice(0, 4);
  if (files.length === 0) return;

  const title = form.title.value.trim();
  const description = form.description.value.trim() || null;
  const mediaType = form.media_type.value;
  const publishedDate = form.published_date.value || new Date().toISOString().slice(0, 10);

  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    status.textContent = `Uploading photo ${i + 1} of ${files.length}…`;
    status.style.color = "var(--text-muted)";

    const path = `${Date.now()}-${i}-${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from("media-photos").upload(path, file);

    if (uploadError) {
      status.textContent = `Photo ${i + 1} failed: ${uploadError.message}`;
      status.style.color = "#B3261E";
      continue;
    }

    const { data: urlData } = supabaseClient.storage.from("media-photos").getPublicUrl(path);

    const { error } = await supabaseClient.from("media_items").insert({
      title: files.length > 1 ? `${title} (${i + 1})` : title,
      description,
      media_type: mediaType,
      thumbnail_url: urlData.publicUrl,
      published_date: publishedDate,
      is_published: true,
    });

    if (!error) successCount++;
  }

  status.textContent = `Uploaded ${successCount} of ${files.length} photo${files.length > 1 ? "s" : ""}.`;
  status.style.color = successCount === files.length ? "var(--green)" : "#B7791F";
  form.reset();
  loadGallery();
}

async function loadGallery() {
  const list = document.getElementById("gallery-list");
  const { data, error } = await supabaseClient
    .from("media_items")
    .select("*")
    .in("media_type", ["Photo Gallery", "Conference Highlight"])
    .order("published_date", { ascending: false });

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No photos uploaded yet.</p>`; return; }

  list.innerHTML = data.map((m) => `
    <div class="dir-row">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;border-radius:8px;background-image:url('${m.thumbnail_url}');background-size:cover;background-position:center;flex-shrink:0;"></div>
        <div>
          <div class="dir-name">${escapeHtmlSt(m.title)}</div>
          <div class="dir-meta">${escapeHtmlSt(m.media_type)} · ${m.published_date ? new Date(m.published_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</div>
        </div>
      </div>
      <button class="delete-entry-btn" onclick="deleteGalleryPhoto('${m.id}')">Delete</button>
    </div>`).join("");
}

async function deleteGalleryPhoto(id) {
  if (!confirm("Delete this photo?")) return;
  const { error } = await supabaseClient.from("media_items").delete().eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadGallery();
}

/* ---------------- LEADERSHIP ---------------- */

async function saveLeader(e) {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById("leadership-status");
  const id = form.id.value;

  let photoUrl = null;
  const file = form.photo.files[0];
  if (file) {
    status.textContent = "Uploading photo…";
    const path = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from("leadership-photos").upload(path, file);
    if (uploadError) {
      status.textContent = "Photo upload failed: " + uploadError.message;
      status.style.color = "#B3261E";
      return;
    }
    const { data: urlData } = supabaseClient.storage.from("leadership-photos").getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  }

  const payload = {
    full_name: form.full_name.value.trim(),
    position: form.position.value.trim(),
    phone: form.phone.value.trim() || null,
    email: form.email.value.trim() || null,
    qualifications: form.qualifications.value.trim() || null,
    bio: form.bio.value.trim() || null,
    welcome_message: form.welcome_message.value.trim() || null,
    display_order: parseInt(form.display_order.value || "0", 10),
  };
  if (photoUrl) payload.photo_url = photoUrl;

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("leadership").update(payload).eq("id", id));
  } else {
    payload.is_active = true;
    ({ error } = await supabaseClient.from("leadership").insert(payload));
  }

  if (error) {
    status.textContent = "Failed: " + error.message;
    status.style.color = "#B3261E";
    return;
  }

  status.textContent = id ? "Updated!" : "Added!";
  status.style.color = "var(--green)";
  resetLeadershipForm();
  loadLeadershipAdmin();
}

function resetLeadershipForm() {
  const form = document.getElementById("leadership-form");
  form.reset();
  form.id.value = "";
  document.getElementById("leadership-form-title").textContent = "Add a Leader";
  document.getElementById("leadership-cancel-edit").style.display = "none";
}

async function loadLeadershipAdmin() {
  const list = document.getElementById("leadership-list");
  const { data, error } = await supabaseClient.from("leadership").select("*").order("display_order");
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No leadership records yet.</p>`; return; }

  list.innerHTML = data.map((p) => `
    <div class="dir-row">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:50%;background-image:url('${p.photo_url || ""}');background-size:cover;background-position:center;background-color:var(--bg-soft);flex-shrink:0;"></div>
        <div>
          <div class="dir-name">${escapeHtmlSt(p.full_name)} ${p.is_active ? "" : "(inactive)"}</div>
          <div class="dir-meta">${escapeHtmlSt(p.position)} · ${escapeHtmlSt(p.phone || "no phone")}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);padding:6px 12px;font-size:0.8rem;" onclick='editLeader(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Edit</button>
      </div>
    </div>`).join("");
}

function editLeader(p) {
  const form = document.getElementById("leadership-form");
  form.id.value = p.id;
  form.full_name.value = p.full_name || "";
  form.position.value = p.position || "";
  form.phone.value = p.phone || "";
  form.email.value = p.email || "";
  form.qualifications.value = p.qualifications || "";
  form.bio.value = p.bio || "";
  form.welcome_message.value = p.welcome_message || "";
  form.display_order.value = p.display_order || 0;
  document.getElementById("leadership-form-title").textContent = "Edit Leader";
  document.getElementById("leadership-cancel-edit").style.display = "inline-block";
  form.scrollIntoView({ behavior: "smooth" });
}

/* ---------------- ANNOUNCEMENTS ---------------- */

async function postAnnouncement(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    title: form.title.value.trim(),
    body: form.body.value.trim(),
    audience: form.audience.value,
  };
  const { error } = await supabaseClient.from("announcements").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadAnnouncementsAdmin();
}

async function loadAnnouncementsAdmin() {
  const list = document.getElementById("announcements-admin-list");
  const { data, error } = await supabaseClient.from("announcements").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No announcements posted yet.</p>`; return; }

  list.innerHTML = data.map((a) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlSt(a.title)}</div>
        <div class="dir-meta">${escapeHtmlSt(a.audience)} · ${new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      </div>
      <button class="delete-entry-btn" onclick="deleteAnnouncement('${a.id}')">Delete</button>
    </div>`).join("");
}

async function deleteAnnouncement(id) {
  if (!confirm("Delete this announcement?")) return;
  const { error } = await supabaseClient.from("announcements").delete().eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadAnnouncementsAdmin();
}

/* ---------------- COMMITTEE MEMBERS ---------------- */

async function addCommitteeMember(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    committee_id: form.committee_id.value,
    member_name: form.member_name.value.trim(),
    member_email: form.member_email.value.trim() || null,
    role: form.role.value.trim() || null,
  };
  const { error } = await supabaseClient.from("committee_members").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  alert("Committee member added.");
}

/* ---------------- CPD: COURSES ---------------- */

async function saveCourse(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;

  const payload = {
    title: form.title.value.trim(),
    category: form.category.value,
    description: form.description.value.trim() || null,
    format: form.format.value,
    instructor: form.instructor.value.trim() || null,
    cpd_points: parseInt(form.cpd_points.value || "0", 10),
    session_link: form.session_link.value.trim() || null,
    start_date: form.start_date.value || null,
    is_published: form.is_published.checked,
  };

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("cpd_courses").update(payload).eq("id", id));
  } else {
    ({ error } = await supabaseClient.from("cpd_courses").insert(payload));
  }

  if (error) { alert("Failed: " + error.message); return; }
  resetCourseForm();
  loadCoursesAdmin();
}

function resetCourseForm() {
  const form = document.getElementById("course-form");
  form.reset();
  form.id.value = "";
  document.getElementById("course-form-title").textContent = "Add a Course";
  document.getElementById("course-cancel-edit").style.display = "none";
}

async function loadCoursesAdmin() {
  const list = document.getElementById("courses-admin-list");
  const { data, error } = await supabaseClient.from("cpd_courses").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No courses yet — add one above.</p>`; return; }

  list.innerHTML = data.map((c) => `
    <div class="cpd-course-row">
      <h4>${escapeHtmlSt(c.title)} ${c.is_published ? "" : '<span style="color:var(--text-muted);font-weight:400;">(unpublished)</span>'}</h4>
      <div class="cpd-course-meta">${escapeHtmlSt(c.category)} · ${escapeHtmlSt(c.format || "")} · ${c.cpd_points} pts</div>
      <div class="cpd-course-actions">
        <button class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);padding:6px 12px;font-size:0.8rem;" onclick='editCourse(${JSON.stringify(c).replace(/'/g, "&apos;")})'>Edit</button>
        <button class="delete-entry-btn" onclick="togglePublishCourse('${c.id}', ${!c.is_published})">${c.is_published ? "Unpublish" : "Publish"}</button>
        <button class="delete-entry-btn" onclick="deleteCourse('${c.id}')">Delete</button>
      </div>
    </div>`).join("");
}

function editCourse(c) {
  const form = document.getElementById("course-form");
  form.id.value = c.id;
  form.title.value = c.title || "";
  form.category.value = c.category || "Clinical Medicine";
  form.description.value = c.description || "";
  form.format.value = c.format || "Self-Paced";
  form.instructor.value = c.instructor || "";
  form.cpd_points.value = c.cpd_points || 0;
  form.session_link.value = c.session_link || "";
  form.start_date.value = c.start_date || "";
  form.is_published.checked = !!c.is_published;
  document.getElementById("course-form-title").textContent = "Edit Course";
  document.getElementById("course-cancel-edit").style.display = "inline-block";
  form.scrollIntoView({ behavior: "smooth" });
}

async function togglePublishCourse(id, publish) {
  const { error } = await supabaseClient.from("cpd_courses").update({ is_published: publish }).eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadCoursesAdmin();
}

async function deleteCourse(id) {
  if (!confirm("Delete this course? This cannot be undone.")) return;
  const { error } = await supabaseClient.from("cpd_courses").delete().eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadCoursesAdmin();
}

/* ---------------- CPD: EXTERNAL APPROVAL ---------------- */

async function loadExternalCpd() {
  const list = document.getElementById("external-cpd-list");
  const statusFilter = document.getElementById("external-status-filter").value;

  let query = supabaseClient.from("external_cpd_submissions").select("*").order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">Nothing here.</p>`; return; }

  list.innerHTML = data.map((s) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlSt(s.activity_title)} — ${escapeHtmlSt(s.member_name)}</div>
        <div class="dir-meta">${escapeHtmlSt(s.provider || "")} · ${s.cpd_points_claimed} pts claimed · ${s.activity_date ? new Date(s.activity_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
        ${s.proof_document_link ? ` · <a href="${s.proof_document_link}" target="_blank" rel="noopener">Proof</a>` : ""}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="status-pill ${s.status.toLowerCase()}">${escapeHtmlSt(s.status)}</span>
        ${s.status === "Pending" ? `
          <button class="btn-approve" style="padding:5px 12px;font-size:0.78rem;" onclick="reviewExternalCpd('${s.id}','Approved')">Approve</button>
          <button class="delete-entry-btn" onclick="reviewExternalCpd('${s.id}','Rejected')">Reject</button>` : ""}
      </div>
    </div>`).join("");
}

async function reviewExternalCpd(id, status) {
  const { error } = await supabaseClient
    .from("external_cpd_submissions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadExternalCpd();
}

/* ---------------- CPD: CERTIFICATES ---------------- */

async function loadCertificatesAdmin() {
  const list = document.getElementById("certificates-admin-list");
  const { data, error } = await supabaseClient.from("certificates").select("*").order("issued_at", { ascending: false }).limit(100);
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No certificates issued yet.</p>`; return; }

  list.innerHTML = data.map((c) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlSt(c.recipient_name)} — ${escapeHtmlSt(c.reference_title)}</div>
        <div class="dir-meta">${escapeHtmlSt(c.certificate_type)} · ${escapeHtmlSt(c.certificate_number)} · ${new Date(c.issued_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      </div>
      <a class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);padding:6px 12px;font-size:0.8rem;" href="certificate.html?verify=${c.certificate_number}" target="_blank" rel="noopener">View</a>
    </div>`).join("");
}

/* ---------------- NEWS MANAGEMENT ---------------- */

async function saveNews(e) {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById("news-status");
  const id = form.id.value;

  let photoUrl = null;
  const file = form.photo.files[0];
  if (file) {
    status.textContent = "Uploading photo…";
    status.style.color = "var(--text-muted)";
    const path = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from("news-photos").upload(path, file);
    if (uploadError) {
      status.textContent = "Photo upload failed: " + uploadError.message;
      status.style.color = "#B3261E";
      return;
    }
    const { data: urlData } = supabaseClient.storage.from("news-photos").getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  }

  const title = form.title.value.trim();
  const payload = {
    title,
    category: form.category.value,
    excerpt: form.excerpt.value.trim() || null,
    body: form.body.value.trim() || null,
    external_link: form.external_link.value.trim() || null,
    is_published: form.is_published.checked,
    published_at: form.is_published.checked ? new Date().toISOString() : null,
  };
  if (photoUrl) payload.image_url = photoUrl;

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("news").update(payload).eq("id", id));
  } else {
    payload.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString().slice(-5);
    ({ error } = await supabaseClient.from("news").insert(payload));
  }

  if (error) {
    status.textContent = "Failed: " + error.message;
    status.style.color = "#B3261E";
    return;
  }

  status.textContent = id ? "Updated!" : "Published!";
  status.style.color = "var(--green)";
  resetNewsForm();
  loadNewsAdmin();
}

function resetNewsForm() {
  const form = document.getElementById("news-form");
  form.reset();
  form.id.value = "";
  document.getElementById("news-form-title").textContent = "Add a News Article";
  document.getElementById("news-cancel-edit").style.display = "none";
}

async function loadNewsAdmin() {
  const list = document.getElementById("news-admin-list");
  const { data, error } = await supabaseClient.from("news").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No articles yet.</p>`; return; }

  list.innerHTML = data.map((n) => `
    <div class="dir-row">
      <div style="display:flex;align-items:center;gap:12px;">
        ${n.image_url ? `<div style="width:44px;height:44px;border-radius:8px;background-image:url('${n.image_url}');background-size:cover;background-position:center;flex-shrink:0;"></div>` : ""}
        <div>
          <div class="dir-name">${escapeHtmlSt(n.title)} ${n.is_published ? "" : '<span style="color:var(--text-muted);font-weight:400;">(unpublished)</span>'}</div>
          <div class="dir-meta">${escapeHtmlSt(n.category)}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);padding:6px 12px;font-size:0.8rem;" onclick='editNews(${JSON.stringify(n).replace(/'/g, "&apos;")})'>Edit</button>
        <button class="delete-entry-btn" onclick="deleteNews('${n.id}')">Delete</button>
      </div>
    </div>`).join("");
}

function editNews(n) {
  const form = document.getElementById("news-form");
  form.id.value = n.id;
  form.title.value = n.title || "";
  form.category.value = n.category || "Association News";
  form.excerpt.value = n.excerpt || "";
  form.body.value = n.body || "";
  form.external_link.value = n.external_link || "";
  form.is_published.checked = !!n.is_published;
  document.getElementById("news-form-title").textContent = "Edit Article";
  document.getElementById("news-cancel-edit").style.display = "inline-block";
  form.scrollIntoView({ behavior: "smooth" });
}

async function deleteNews(id) {
  if (!confirm("Delete this article? This cannot be undone.")) return;
  const { error } = await supabaseClient.from("news").delete().eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadNewsAdmin();
}

function escapeHtmlSt(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
