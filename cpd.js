let selectedCourseId = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("cpd-category-filter").addEventListener("change", loadCourses);
  loadCourses();
  wireEnrollModal();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function loadCourses() {
  const list = document.getElementById("courses-list");
  const filterVal = document.getElementById("cpd-category-filter").value;

  list.innerHTML = `<p class="card-empty">Loading courses…</p>`;

  let query = supabaseClient
    .from("cpd_courses")
    .select("id,title,category,description,format,instructor,cpd_points,start_date")
    .eq("is_published", true)
    .order("start_date", { ascending: true });

  if (filterVal) query = query.eq("category", filterVal);

  const { data, error } = await query;

  if (error) {
    console.error("Courses load failed:", error);
    list.innerHTML = `<p class="card-empty">Something went wrong loading courses.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No courses published yet — add rows to the "cpd_courses" table in Supabase.</p>`;
    return;
  }

  list.innerHTML = data.map(courseCard).join("");

  document.querySelectorAll(".enroll-btn").forEach((btn) => {
    btn.addEventListener("click", () => openEnrollModal(btn.dataset.id, btn.dataset.title));
  });
}

function courseCard(c) {
  const date = c.start_date
    ? new Date(c.start_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Self-paced — start anytime";

  return `
    <div class="course-card">
      <div class="course-top">
        <div class="card-category">${escapeHtmlCpd(c.category)}</div>
        <span class="cpd-points-badge">${c.cpd_points || 0} CPD pts</span>
      </div>
      <h3>${escapeHtmlCpd(c.title)}</h3>
      <div class="course-format">${escapeHtmlCpd(c.format || "")}</div>
      <p class="desc">${escapeHtmlCpd(c.description || "")}</p>
      <div class="course-meta">
        ${c.instructor ? `Instructor: ${escapeHtmlCpd(c.instructor)} · ` : ""}${date}
      </div>
      <button class="btn btn-primary enroll-btn" data-id="${c.id}" data-title="${escapeHtmlCpd(c.title)}">Enroll Interest</button>
    </div>`;
}

function wireEnrollModal() {
  document.getElementById("enroll-cancel").addEventListener("click", closeEnrollModal);
  document.getElementById("enroll-form").addEventListener("submit", submitEnrollment);
}

function openEnrollModal(courseId, title) {
  selectedCourseId = courseId;
  document.getElementById("enroll-course-title").textContent = title;
  document.getElementById("enroll-modal-bg").classList.add("open");
}

function closeEnrollModal() {
  document.getElementById("enroll-modal-bg").classList.remove("open");
  document.getElementById("enroll-form").reset();
}

async function submitEnrollment(e) {
  e.preventDefault();
  const form = e.target;
  const note = document.getElementById("enroll-note");

  const { error } = await supabaseClient.from("cpd_enrollments").insert({
    course_id: selectedCourseId,
    full_name: form.full_name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim() || null,
  });

  if (error) {
    note.textContent = "Something went wrong. Please try again.";
    note.style.color = "#B3261E";
    return;
  }

  note.textContent = "";
  closeEnrollModal();
  alert("You're enrolled! GMCOA-U will contact you with joining details closer to the course date.");
}

function escapeHtmlCpd(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
