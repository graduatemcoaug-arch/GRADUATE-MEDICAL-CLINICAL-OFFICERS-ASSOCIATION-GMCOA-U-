const params = new URLSearchParams(location.search);
const courseId = params.get("id");

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }
  if (!courseId) { document.getElementById("course-title").textContent = "Course not found"; return; }

  window.currentEmail = session.user.email;

  // Confirm the member is enrolled — course.html is for active learners,
  // not general browsing (that's cpd.html).
  const { data: enrollment } = await supabaseClient
    .from("cpd_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("email", session.user.email)
    .maybeSingle();

  if (!enrollment) {
    document.getElementById("course-title").textContent = "Not Enrolled";
    document.getElementById("lessons-list").innerHTML = `<p class="card-empty">You need to enroll in this course first from the <a href="cpd.html">CPD Academy</a>.</p>`;
    return;
  }

  const { data: course } = await supabaseClient
    .from("cpd_courses")
    .select("title, category, format, instructor, cpd_points")
    .eq("id", courseId)
    .single();

  if (course) {
    document.getElementById("course-title").textContent = course.title;
    document.getElementById("course-meta").textContent = `${course.category} · ${course.format} · ${course.cpd_points} CPD points`;
    document.getElementById("take-quiz-link").href = `quiz.html?course=${courseId}`;
  }

  loadLessons();
});

function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

async function loadLessons() {
  const list = document.getElementById("lessons-list");
  const { data: lessons, error } = await supabaseClient
    .from("cpd_lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index");

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }

  if (!lessons || lessons.length === 0) {
    list.innerHTML = `<p class="card-empty">No lessons added yet for this course — check the Session/Material Link on the CPD Academy page, or contact the Secretariat.</p>`;
    updateProgress(0, 0);
    return;
  }

  const { data: completions } = await supabaseClient
    .from("cpd_lesson_completions")
    .select("lesson_id")
    .eq("email", window.currentEmail);

  const completedIds = new Set((completions || []).map((c) => c.lesson_id));

  list.innerHTML = lessons.map((l, index) => {
    const done = completedIds.has(l.id);
    const previousLesson = index > 0 ? lessons[index - 1] : null;
    const locked = previousLesson && !completedIds.has(previousLesson.id);
    const embedUrl = !locked ? getEmbedUrl(l.content_url) : null;

    if (locked) {
      return `
      <div class="cpd-course-row" style="opacity:0.55;">
        <h4>🔒 ${escapeHtmlC(l.title)}</h4>
        <div class="cpd-course-meta">${escapeHtmlC(l.content_type)} · Complete the previous lesson to unlock</div>
      </div>`;
    }

    return `
    <div class="cpd-course-row">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h4>${done ? "✅" : "⬜"} ${escapeHtmlC(l.title)}</h4>
          <div class="cpd-course-meta">${escapeHtmlC(l.content_type)}${l.description ? " · " + escapeHtmlC(l.description) : ""}</div>
          ${l.content_url && !embedUrl ? `<a href="${l.content_url}" target="_blank" rel="noopener" style="font-size:0.85rem;">Open ${escapeHtmlC(l.content_type)} →</a>` : ""}
        </div>
        <button class="btn ${done ? "btn-outline" : "btn-primary"}" style="${done ? "color:var(--text-muted);border-color:var(--border);" : ""}padding:8px 14px;font-size:0.8rem;white-space:nowrap;" onclick="toggleLesson('${l.id}', ${done})">
          ${done ? "Mark Incomplete" : "Mark Complete"}
        </button>
      </div>
      ${embedUrl ? `<div style="margin-top:12px;position:relative;padding-bottom:56.25%;height:0;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:8px;" allowfullscreen></iframe></div>` : ""}
    </div>`;
  }).join("");

  updateProgress(completedIds.size, lessons.length);
}

function updateProgress(done, total) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById("course-progress-bar").style.width = pct + "%";
  document.getElementById("course-progress-note").textContent = total > 0 ? `${done} of ${total} lessons complete (${pct}%)` : "No lessons yet.";
  document.getElementById("course-complete-actions").style.display = (total > 0 && done === total) ? "block" : "none";
}

async function toggleLesson(lessonId, currentlyDone) {
  if (currentlyDone) {
    await supabaseClient.from("cpd_lesson_completions").delete().eq("lesson_id", lessonId).eq("email", window.currentEmail);
  } else {
    await supabaseClient.from("cpd_lesson_completions").insert({ lesson_id: lessonId, email: window.currentEmail });
  }
  loadLessons();
}

function escapeHtmlC(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
