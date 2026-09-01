document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }
  window.currentSession = session;

  loadMentors();
  document.getElementById("mentor-form").addEventListener("submit", registerMentor);
  document.getElementById("mentee-form").addEventListener("submit", applyAsMentee);
});

async function registerMentor(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    member_email: window.currentSession.user.email,
    full_name: form.full_name.value.trim(),
    areas_of_expertise: form.areas_of_expertise.value.trim(),
    bio: form.bio.value.trim(),
  };
  const { error } = await supabaseClient.from("mentor_profiles").upsert(payload, { onConflict: "member_email" });
  if (error) { alert("Failed: " + error.message); return; }
  alert("You're registered as a mentor!");
  form.reset();
  loadMentors();
}

async function applyAsMentee(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    member_email: window.currentSession.user.email,
    full_name: form.full_name.value.trim(),
    areas_of_interest: form.areas_of_interest.value.trim(),
    goals: form.goals.value.trim(),
  };
  const { error } = await supabaseClient.from("mentee_applications").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  alert("Application submitted! GMCOA-U will match you with a mentor.");
  form.reset();
}

async function loadMentors() {
  const list = document.getElementById("mentors-list");
  const { data, error } = await supabaseClient.from("mentor_profiles").select("*").eq("is_active", true);
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No mentors registered yet.</p>`; return; }

  list.innerHTML = data.map((m) => `
    <div class="mentor-card">
      <h4>${escapeHtmlMe(m.full_name)}</h4>
      <p style="color:var(--green);font-size:0.85rem;">${escapeHtmlMe(m.areas_of_expertise || "")}</p>
      <p style="color:var(--text-muted);font-size:0.88rem;">${escapeHtmlMe(m.bio || "")}</p>
    </div>`).join("");
}

function escapeHtmlMe(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
