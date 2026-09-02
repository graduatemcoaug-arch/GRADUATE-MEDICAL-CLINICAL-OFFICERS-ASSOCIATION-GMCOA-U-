document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function logout() {
  await supabaseClient.auth.signOut();
  location.href = "portal.html";
}

async function loadDashboard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    location.href = "portal.html";
    return;
  }

  const email = session.user.email;
  document.getElementById("welcome-email").textContent = email;

  const { data: app, error: appError } = await supabaseClient
    .from("membership_applications")
    .select("full_name,membership_category,membership_number,status,district_of_residence,region,employer")
    .eq("email", email)
    .maybeSingle();

  if (appError) {
    console.error("Failed to load profile:", appError);
  }

  if (!app) {
    document.getElementById("no-application-note").style.display = "block";
    document.getElementById("profile-card").style.display = "none";
  } else {
    renderProfile(app);
    if (app.membership_number) {
      loadMembershipStatus(app.membership_number);
      loadSubscriptionStatus(app.membership_number);
    }
  }

  loadCpd(email);
  loadMyEvents(email);
  loadMyResearchSummary(email);
  loadMyCommittees(email);
  loadAnnouncements();
  if (app && app.membership_number) {
    loadElectionEligibility(app.membership_category, app.membership_number);
  } else {
    document.getElementById("election-eligibility").innerHTML = `<p class="dash-empty-note">Not eligible — no approved membership on file yet.</p>`;
  }
}

async function loadSubscriptionStatus(membershipNumber) {
  const year = new Date().getFullYear();
  const box = document.getElementById("subscription-status-card");
  if (!box) return;

  const { data, error } = await supabaseClient
    .from("finance_transactions")
    .select("amount,transaction_date,payment_method")
    .eq("membership_number", membershipNumber)
    .eq("category", "Membership Fees")
    .gte("transaction_date", `${year}-01-01`)
    .lte("transaction_date", `${year}-12-31`);

  if (error) {
    console.error("Failed to load subscription status:", error);
    return;
  }

  box.style.display = "block";

  if (!data || data.length === 0) {
    document.getElementById("subscription-status-display").innerHTML = `<span class="status-pill pending">Unpaid</span>`;
    document.getElementById("subscription-history").innerHTML = `<p class="dash-empty-note">No payment recorded for ${year} yet.</p>`;
    return;
  }

  document.getElementById("subscription-status-display").innerHTML = `<span class="status-pill approved">Paid</span>`;
  document.getElementById("subscription-history").innerHTML = data.map((t) => `
    <div class="dash-row">
      <span class="dr-label">${new Date(t.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${escapeHtmlD(t.payment_method)}</span>
      <span class="dr-value">UGX ${Number(t.amount).toLocaleString()}</span>
    </div>`).join("");
}

function renderProfile(app) {
  document.getElementById("profile-name").textContent = app.full_name;
  document.getElementById("profile-category").textContent = app.membership_category || "—";
  document.getElementById("profile-status").textContent = app.status;
  document.getElementById("profile-location").textContent =
    [app.district_of_residence, app.region].filter(Boolean).join(", ") || "—";
  document.getElementById("profile-employer").textContent = app.employer || "—";
}

async function loadMembershipStatus(membershipNumber) {
  const { data: member, error } = await supabaseClient
    .from("member_directory")
    .select("status,valid_until,membership_number")
    .eq("membership_number", membershipNumber)
    .maybeSingle();

  if (error || !member) {
    console.error("Failed to load membership status:", error);
    return;
  }

  document.getElementById("membership-number-display").textContent = member.membership_number;
  document.getElementById("membership-status-display").textContent = member.status;
  document.getElementById("membership-expiry-display").textContent = member.valid_until
    ? new Date(member.valid_until).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  document.getElementById("membership-status-card").style.display = "block";
}

async function loadCpd(email) {
  const { data, error } = await supabaseClient
    .from("cpd_enrollments")
    .select("course_id, completed, cpd_courses(title, cpd_points)")
    .eq("email", email);

  const listEl = document.getElementById("cpd-enrollment-list");

  const { data: targetData } = await supabaseClient.from("cpd_targets").select("annual_points_required").eq("id", 1).single();
  const annualTarget = targetData?.annual_points_required || 20;

  if (error) {
    console.error("Failed to load CPD data:", error);
    listEl.innerHTML = `<p class="card-empty">Something went wrong loading your CPD record.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("cpd-points-total").textContent = "0";
    listEl.innerHTML = `<p class="card-empty">No CPD enrollments yet — browse the <a href="cpd.html">CPD Academy</a> to get started.</p>`;
    return;
  }

  const totalPoints = data
    .filter((e) => e.completed)
    .reduce((sum, e) => sum + (e.cpd_courses?.cpd_points || 0), 0);

  document.getElementById("cpd-points-total").textContent = totalPoints;

  const targetNote = document.getElementById("cpd-target-note");
  if (targetNote) {
    const met = totalPoints >= annualTarget;
    targetNote.textContent = met
      ? `You've met this year's target of ${annualTarget} CPD points.`
      : `${annualTarget - totalPoints} more points needed to reach this year's target of ${annualTarget}.`;
    targetNote.style.color = met ? "var(--green)" : "var(--text-muted)";
  }

  listEl.innerHTML = data.map((e) => `
    <div class="dash-row">
      <span class="dr-label">${escapeHtmlD(e.cpd_courses?.title || "Untitled course")}</span>
      <span class="dr-value">
        ${e.completed
          ? `✓ ${e.cpd_courses?.cpd_points || 0} pts · <a href="quiz.html?course=${e.course_id}">Retake Quiz</a> · <a href="certificate.html?type=course&ref=${e.course_id}">Certificate</a>`
          : `Enrolled · <a href="quiz.html?course=${e.course_id}">Take Quiz</a>`}
      </span>
    </div>`).join("");
}

async function loadMyEvents(email) {
  const box = document.getElementById("my-events-list");
  const { data, error } = await supabaseClient
    .from("event_registrations")
    .select("event_title, attendance_type, registration_number, registered_at")
    .eq("email", email)
    .order("registered_at", { ascending: false });

  if (error) {
    console.error("Failed to load event registrations:", error);
    box.innerHTML = `<p class="dash-empty-note">Something went wrong loading your event registrations.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p class="dash-empty-note">No event registrations yet — browse <a href="events.html">upcoming events</a>.</p>`;
    return;
  }

  box.innerHTML = data.map((r) => `
    <div class="dash-row">
      <span class="dr-label">${escapeHtmlD(r.event_title)}</span>
      <span class="dr-value">${escapeHtmlD(r.attendance_type)} · <a href="event-pass.html">View Pass</a></span>
    </div>`).join("");
}

async function loadMyResearchSummary(email) {
  const box = document.getElementById("my-research-summary");
  const { data, error } = await supabaseClient
    .from("research_projects")
    .select("title, status, research_id")
    .eq("owner_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load research projects:", error);
    box.innerHTML = `<p class="dash-empty-note">Something went wrong loading your research projects.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p class="dash-empty-note">No research projects registered yet — <a href="my-research.html">register one</a>.</p>`;
    return;
  }

  box.innerHTML = data.map((r) => `
    <div class="dash-row">
      <span class="dr-label">${escapeHtmlD(r.title)}</span>
      <span class="dr-value">${escapeHtmlD(r.status)}</span>
    </div>`).join("") + `<p class="dash-empty-note" style="margin-top:10px;"><a href="my-research.html">Manage all projects →</a></p>`;
}

async function loadMyCommittees(email) {
  const box = document.getElementById("my-committees-list");
  const { data, error } = await supabaseClient
    .from("committee_members")
    .select("role, committees(name)")
    .eq("member_email", email);

  if (error) {
    console.error("Failed to load committee memberships:", error);
    box.innerHTML = `<p class="dash-empty-note">Something went wrong.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p class="dash-empty-note">Not currently on any Standing Committee.</p>`;
    return;
  }

  box.innerHTML = data.map((c) => `
    <div class="dash-row">
      <span class="dr-label">${escapeHtmlD(c.committees?.name || "Committee")}</span>
      <span class="dr-value">${escapeHtmlD(c.role || "Member")}</span>
    </div>`).join("");
}

async function loadElectionEligibility(category, membershipNumber) {
  const box = document.getElementById("election-eligibility");

  const { data: member } = await supabaseClient
    .from("member_directory")
    .select("status")
    .eq("membership_number", membershipNumber)
    .maybeSingle();

  const isActive = member?.status === "Active";
  const isEligibleCategory = category === "Full" || category === "Ordinary" || category === "Honorary";
  const eligible = isActive && isEligibleCategory;

  box.innerHTML = `
    <p class="dash-empty-note" style="margin-bottom:8px;">${eligible ? "✅ You currently meet the basic criteria to stand for or vote in elections." : "❌ You don't currently meet the basic criteria."}</p>
    <p class="dash-empty-note" style="font-size:0.78rem;">Based on active status and membership category. Per Article 9.1, candidates for Executive office also need at least two consecutive years of good standing — this isn't tracked automatically here, so check with the Secretariat to confirm full eligibility.</p>`;
}

async function loadAnnouncements() {
  const box = document.getElementById("announcements-list");
  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to load announcements:", error);
    box.innerHTML = `<p class="dash-empty-note">Something went wrong.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p class="dash-empty-note">No announcements right now.</p>`;
    return;
  }

  box.innerHTML = data.map((a) => `
    <div class="dash-row" style="display:block;">
      <div style="display:flex;justify-content:space-between;">
        <span class="dr-label" style="font-weight:700;">${escapeHtmlD(a.title)}</span>
        <span class="dr-value" style="font-size:0.78rem;">${new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
      <p style="margin:6px 0 0;font-size:0.86rem;color:var(--text-muted);">${escapeHtmlD(a.body)}</p>
    </div>`).join("");
}

function escapeHtmlD(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
