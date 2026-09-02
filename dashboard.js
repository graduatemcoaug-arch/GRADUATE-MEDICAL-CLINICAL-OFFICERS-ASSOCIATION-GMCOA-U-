document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("invoice-form").addEventListener("submit", generateInvoice);
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
  window.currentEmail = email;
  document.getElementById("welcome-email").textContent = email;

  const { data: app, error: appError } = await supabaseClient
    .from("membership_applications")
    .select("full_name,membership_category,membership_number,status,district_of_residence,region,employer")
    .eq("email", email)
    .maybeSingle();

  window.currentApp = app;

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
  loadMyInvoices(email);
  if (app && app.membership_number) {
    loadElectionEligibility(app.membership_category, app.membership_number);
    loadMyCard(app, email);
    loadFullPaymentHistory(app.membership_number);
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

async function loadMyCard(app, email) {
  const section = document.getElementById("my-card-section");
  const container = document.getElementById("my-card-container");
  section.style.display = "block";

  const { data: member } = await supabaseClient
    .from("member_directory")
    .select("status,valid_until")
    .eq("membership_number", app.membership_number)
    .maybeSingle();

  const verifyUrl = `${location.origin}${location.pathname.replace("dashboard.html", "verify.html")}?number=${encodeURIComponent(app.membership_number)}`;

  container.innerHTML = `
    <div class="membership-card" id="member-card">
      <div class="mc-header">
        <img src="logo.png" alt="GMCOA-U">
        <div>
          <div class="mc-org">GMCOA-U</div>
          <div class="mc-sub">OFFICIAL MEMBERSHIP CARD</div>
        </div>
      </div>
      <div class="mc-name">${escapeHtmlD(app.full_name)}</div>
      <div class="mc-number">${escapeHtmlD(app.membership_number)}</div>
      <div class="mc-grid">
        <div><div class="mc-label">Category</div><div class="mc-value">${escapeHtmlD(app.membership_category)}</div></div>
        <div><div class="mc-label">Valid Until</div><div class="mc-value">${member?.valid_until ? new Date(member.valid_until).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</div></div>
        <div><div class="mc-label">District</div><div class="mc-value">${escapeHtmlD(app.district_of_residence || "—")}</div></div>
        <div><div class="mc-label">Region</div><div class="mc-value">${escapeHtmlD(app.region || "—")}</div></div>
      </div>
      <div class="mc-footer">
        <span class="mc-status-badge">${escapeHtmlD(member?.status || app.status)}</span>
        <div class="mc-qr" id="dash-qr-holder"></div>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
    </div>`;

  new QRCode(document.getElementById("dash-qr-holder"), {
    text: verifyUrl,
    width: 64,
    height: 64,
  });
}

async function loadFullPaymentHistory(membershipNumber) {
  const list = document.getElementById("full-payments-list");

  const { data, error } = await supabaseClient
    .from("finance_transactions")
    .select("amount,transaction_date,category,payment_method")
    .eq("membership_number", membershipNumber)
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("Failed to load payment history:", error);
    list.innerHTML = `<p class="dash-empty-note">Something went wrong loading your payment history.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("payments-total").textContent = "UGX 0";
    list.innerHTML = `<p class="dash-empty-note">No payments recorded yet.</p>`;
    return;
  }

  const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
  document.getElementById("payments-total").textContent = `UGX ${total.toLocaleString()}`;

  list.innerHTML = data.map((t) => `
    <div class="dash-row">
      <span class="dr-label">${new Date(t.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} — ${escapeHtmlD(t.category)}</span>
      <span class="dr-value">UGX ${Number(t.amount).toLocaleString()} · ${escapeHtmlD(t.payment_method || "")}</span>
    </div>`).join("");
}

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `INV-${year}-${rand}`;
}

async function generateInvoice(e) {
  e.preventDefault();
  const form = e.target;
  const app = window.currentApp;
  const email = window.currentEmail;

  const payload = {
    invoice_number: generateInvoiceNumber(),
    member_email: email,
    member_name: app?.full_name || email,
    membership_number: app?.membership_number || null,
    payment_type: form.payment_type.value,
    reference_note: form.reference_note.value.trim() || form.payment_type.value,
    amount: parseFloat(form.amount.value),
  };

  const { data: invoice, error } = await supabaseClient.from("payment_invoices").insert(payload).select().single();

  if (error) {
    document.getElementById("invoice-output").innerHTML = `<p class="dash-empty-note">Failed to generate invoice: ${escapeHtmlD(error.message)}</p>`;
    return;
  }

  form.reset();
  renderInvoicePreview(invoice);
  loadMyInvoices(email);
}

function renderInvoicePreview(inv) {
  document.getElementById("invoice-output").innerHTML = `
    <div class="cert-preview" style="max-width:420px;padding:26px 22px;">
      <div class="cert-org">GMCOA-U Payment Invoice</div>
      <h2 style="font-size:1.1rem;">${escapeHtmlD(inv.invoice_number)}</h2>
      <div style="text-align:left;margin-top:14px;font-size:0.88rem;">
        <div class="dash-row"><span class="dr-label">Type</span><span class="dr-value">${escapeHtmlD(inv.payment_type)}</span></div>
        <div class="dash-row"><span class="dr-label">Details</span><span class="dr-value">${escapeHtmlD(inv.reference_note || "—")}</span></div>
        <div class="dash-row"><span class="dr-label">Amount</span><span class="dr-value">UGX ${Number(inv.amount).toLocaleString()}</span></div>
        <div class="dash-row"><span class="dr-label">Status</span><span class="dr-value">${escapeHtmlD(inv.status)}</span></div>
        <div class="dash-row"><span class="dr-label">Date</span><span class="dr-value">${new Date(inv.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div>
      </div>
    </div>
    <div class="card-actions"><button class="btn btn-primary" onclick="window.print()">Print Invoice</button></div>`;
}

async function loadMyInvoices(email) {
  const list = document.getElementById("my-invoices-list");
  const { data, error } = await supabaseClient
    .from("payment_invoices")
    .select("*")
    .eq("member_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load invoices:", error);
    list.innerHTML = `<p class="dash-empty-note">Something went wrong.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="dash-empty-note">No invoices yet — generate one above.</p>`;
    return;
  }

  list.innerHTML = data.map((inv) => `
    <div class="dash-row">
      <span class="dr-label">${escapeHtmlD(inv.invoice_number)} — ${escapeHtmlD(inv.payment_type)}</span>
      <span class="dr-value">UGX ${Number(inv.amount).toLocaleString()} · <span class="status-pill ${inv.status.toLowerCase()}">${escapeHtmlD(inv.status)}</span>${inv.status === "Paid" && inv.finance_transaction_id ? ` · <button class="delete-entry-btn" style="color:var(--deep-blue);" onclick="printMyReceipt('${inv.finance_transaction_id}')">Print Receipt</button>` : ""}</span>
    </div>`).join("");
}

async function printMyReceipt(transactionId) {
  const { data: t, error } = await supabaseClient.from("finance_transactions").select("*").eq("id", transactionId).single();
  if (error || !t) { alert("Could not load receipt."); return; }

  const receiptNo = "RCT-" + t.id.slice(0, 8).toUpperCase();
  const verificationCode = t.id.slice(-6).toUpperCase();
  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><title>Receipt ${receiptNo}</title>
    <style>body{font-family:sans-serif;padding:40px;color:#17242E;} h1{color:#0B3D62;} table{width:100%;border-collapse:collapse;margin-top:20px;} td{padding:8px 0;border-bottom:1px solid #E1E8EC;}</style>
    </head><body>
    <h1>GMCOA-U Official Receipt</h1>
    <table>
      <tr><td><strong>Receipt Number</strong></td><td>${receiptNo}</td></tr>
      <tr><td><strong>Category</strong></td><td>${t.category}</td></tr>
      <tr><td><strong>Payment Method</strong></td><td>${t.payment_method || "—"}</td></tr>
      <tr><td><strong>Amount Paid</strong></td><td>UGX ${Number(t.amount).toLocaleString()}</td></tr>
      <tr><td><strong>Date</strong></td><td>${new Date(t.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
      <tr><td><strong>Digital Verification Code</strong></td><td>${verificationCode}</td></tr>
    </table>
    <p style="margin-top:30px;color:#55666F;font-size:0.85rem;">Graduate Medical Clinical Officers Association of Uganda</p>
    <script>window.print();</script>
    </body></html>`);
  w.document.close();
}

function escapeHtmlD(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
