document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  }
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  const note = document.getElementById("login-note");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    note.textContent = "Login failed — check your email and password.";
    note.style.color = "#B3261E";
    return;
  }
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
  loadApplications();
}

async function loadApplications() {
  const list = document.getElementById("applications-list");
  list.innerHTML = `<p class="card-empty">Loading applications…</p>`;

  const { data, error } = await supabaseClient
    .from("membership_applications")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Failed to load applications:", error);
    list.innerHTML = `<p class="card-empty">Something went wrong loading applications. Make sure you're logged in with the admin account.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No applications submitted yet.</p>`;
    return;
  }

  list.innerHTML = data.map(appCard).join("");

  document.querySelectorAll(".btn-approve").forEach((btn) => {
    btn.addEventListener("click", () => approveApp(btn.dataset.id));
  });
  document.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", () => rejectApp(btn.dataset.id));
  });
}

function appCard(a) {
  const statusClass = a.status.toLowerCase();
  const submitted = new Date(a.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const canAct = a.status === "Pending";

  return `
    <div class="app-review-card">
      <div class="app-review-top">
        <div>
          <span class="status-pill ${statusClass}">${escapeHtmlAd(a.status)}</span>
          <h3>${escapeHtmlAd(a.full_name)}</h3>
        </div>
      </div>
      <div class="app-review-meta">
        Tracking #: ${escapeHtmlAd(a.tracking_number || "—")}<br>
        ${escapeHtmlAd(a.email)} · ${escapeHtmlAd(a.mobile_number || "")}<br>
        Category: ${escapeHtmlAd(a.membership_category)} · Submitted: ${submitted}<br>
        ${a.employer ? `Employer: ${escapeHtmlAd(a.employer)} (${escapeHtmlAd(a.employment_sector || "")})<br>` : ""}
        ${a.district_of_residence ? `District: ${escapeHtmlAd(a.district_of_residence)}, ${escapeHtmlAd(a.region || "")}` : ""}
      </div>
      ${canAct ? `
        <div class="app-review-actions">
          <button class="btn-approve" data-id="${a.id}">Approve</button>
          <button class="btn-reject" data-id="${a.id}">Reject</button>
        </div>` : ""}
    </div>`;
}

async function approveApp(id) {
  if (!confirm("Approve this application? This generates a membership number and adds them to the public directory.")) return;

  const { data: app } = await supabaseClient
    .from("membership_applications")
    .select("email,full_name")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabaseClient.rpc("approve_application", { p_id: id });

  if (error) {
    alert("Approval failed: " + error.message);
    return;
  }
  alert("Approved! Membership number: " + data);

  if (app && app.email) {
    sendEmail(
      app.email,
      "Welcome to GMCOA-U — Your Membership Application is Approved",
      `<p>Dear ${escapeHtmlAd(app.full_name)},</p>
       <p>Congratulations! Your application to join the Graduate Medical Clinical Officers Association of Uganda has been <strong>approved</strong>.</p>
       <p><strong>Your Membership Number:</strong> ${data}</p>
       <p>Your membership will become fully active once your subscription payment is confirmed. You can log in to your member portal and pay directly from your dashboard.</p>
       <p>Welcome aboard!</p>
       <p>— GMCOA-U Secretariat</p>`
    );
  }

  loadApplications();
}

async function sendEmail(to, subject, html) {
  try {
    await fetch("https://oxcefktkqqjxmekuyvwd.supabase.co/functions/v1/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

function escapeHtmlAd(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function rejectApp(id) {
  if (!confirm("Reject this application?")) return;

  const { error } = await supabaseClient.rpc("reject_application", { p_id: id });

  if (error) {
    alert("Rejection failed: " + error.message);
    return;
  }
  loadApplications();
}

function escapeHtmlAd(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
