let courseId = null;
let questions = [];
let currentEmail = null;

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  courseId = params.get("course");
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }
  currentEmail = session.user.email;

  const { data: course } = await supabaseClient.from("cpd_courses").select("title,cpd_points").eq("id", courseId).single();
  if (course) document.getElementById("quiz-title").textContent = course.title;

  const { data, error } = await supabaseClient.from("quiz_questions").select("*").eq("course_id", courseId).order("display_order");
  if (error || !data || data.length === 0) {
    document.getElementById("quiz-body").innerHTML = `<p class="card-empty">No quiz has been set up for this course yet.</p>`;
    return;
  }
  questions = data;
  renderQuiz();

  document.getElementById("submit-quiz-btn").addEventListener("click", submitQuiz);
});

function renderQuiz() {
  document.getElementById("quiz-body").innerHTML = questions.map((q, i) => `
    <div class="quiz-question" data-qid="${q.id}">
      <h4>${i + 1}. ${escapeHtmlQ(q.question_text)}</h4>
      ${(q.question_type === "True/False" ? ["True", "False"] : q.options || []).map((opt) => `
        <label class="quiz-option">
          <input type="radio" name="q-${q.id}" value="${escapeHtmlQ(opt)}">
          ${escapeHtmlQ(opt)}
        </label>`).join("")}
    </div>`).join("") + `<button class="btn btn-primary" id="submit-quiz-btn" style="margin-top:10px;">Submit Quiz</button>`;

  document.getElementById("submit-quiz-btn").addEventListener("click", submitQuiz);
}

async function submitQuiz() {
  let correct = 0;
  questions.forEach((q) => {
    const selected = document.querySelector(`input[name="q-${q.id}"]:checked`);
    if (selected && selected.value === q.correct_answer) correct++;
  });

  const scorePercent = Math.round((correct / questions.length) * 100);
  const passed = scorePercent >= 70;

  const { error } = await supabaseClient.from("quiz_attempts").insert({
    course_id: courseId,
    member_email: currentEmail,
    score_percent: scorePercent,
    passed,
  });

  if (!error && passed) {
    await supabaseClient.from("cpd_enrollments").update({ completed: true }).eq("course_id", courseId).eq("email", currentEmail);
  }

  document.getElementById("quiz-body").style.display = "none";
  const result = document.getElementById("quiz-result");
  result.style.display = "block";
  result.innerHTML = `
    <div class="quiz-result-banner ${passed ? "pass" : "fail"}">
      You scored ${scorePercent}% (${correct}/${questions.length} correct) — ${passed ? "Passed! Course marked complete." : "Not passed. You need 70% to pass — try again."}
    </div>
    ${passed ? `<p style="text-align:center;"><a class="btn btn-primary" href="certificate.html?type=course&ref=${courseId}">Get Certificate</a></p>` : `<p style="text-align:center;"><a class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);" href="quiz.html?course=${courseId}">Try Again</a></p>`}
  `;
}

function escapeHtmlQ(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
