document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("career-type-filter").addEventListener("change", loadCareers);
  loadCareers();
  wireAlertForm();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function loadCareers() {
  const list = document.getElementById("careers-list");
  const filterVal = document.getElementById("career-type-filter").value;

  list.innerHTML = `<p class="card-empty">Loading opportunities…</p>`;

  let query = supabaseClient
    .from("career_items")
    .select("title,opportunity_type,organization,location,description,deadline,external_link")
    .eq("is_published", true)
    .order("deadline", { ascending: true });

  if (filterVal) query = query.eq("opportunity_type", filterVal);

  const { data, error } = await query;

  if (error) {
    console.error("Careers load failed:", error);
    list.innerHTML = `<p class="card-empty">Debug error: ${escapeHtmlC(error.message || JSON.stringify(error))}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No opportunities posted yet — add rows to the "career_items" table in Supabase.</p>`;
    return;
  }

  list.innerHTML = data.map(careerCard).join("");
}

function careerCard(c) {
  const now = new Date();
  const deadline = c.deadline ? new Date(c.deadline) : null;
  let badgeClass = "open", badgeText = "Open";

  if (deadline) {
    const daysLeft = Math.ceil((deadline - now) / 86400000);
    if (daysLeft < 0) { badgeClass = "closed"; badgeText = "Closed"; }
    else if (daysLeft <= 7) { badgeClass = "soon"; badgeText = `${daysLeft}d left`; }
  }

  const deadlineStr = deadline
    ? deadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Rolling / no deadline";

  return `
    <div class="career-card">
      <div class="career-top">
        <div class="card-category">${escapeHtmlC(c.opportunity_type)}</div>
        <span class="deadline-badge ${badgeClass}">${badgeText}</span>
      </div>
      <h3>${escapeHtmlC(c.title)}</h3>
      ${c.organization ? `<div class="career-org">${escapeHtmlC(c.organization)}</div>` : ""}
      <p class="desc">${escapeHtmlC(c.description || "")}</p>
      <div class="career-meta">
        <span>📍 ${escapeHtmlC(c.location || "Not specified")}</span>
        <span>🗓️ Deadline: ${deadlineStr}</span>
        ${c.external_link ? `<a href="${c.external_link}" target="_blank" rel="noopener">Apply →</a>` : ""}
      </div>
    </div>`;
}

function wireAlertForm() {
  const form = document.getElementById("career-alert-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("[name=name]").value.trim();
    const email = form.querySelector("[name=email]").value.trim();
    const status = form.querySelector(".form-note");

    const { error } = await supabaseClient
      .from("career_alert_subscribers")
      .insert({ name, email });

    if (error) {
      status.textContent = error.code === "23505"
        ? "You're already subscribed to career alerts — thank you!"
        : "Something went wrong. Please try again.";
    } else {
      status.textContent = "Subscribed! We'll email you when new opportunities are posted.";
      form.reset();
    }
  });
}

function escapeHtmlC(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
