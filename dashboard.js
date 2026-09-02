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

  if (member?.status === "Pending Payment") {
    container.innerHTML = `<p class="dash-empty-note">Your membership card will be issued once your subscription payment is confirmed. See "Make a Payment" below to pay.</p>`;
    return;
  }

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
      <button class="btn btn-primary" onclick='printMyCard(${JSON.stringify({ full_name: app.full_name, membership_number: app.membership_number, membership_category: app.membership_category, district: app.district_of_residence, region: app.region, status: member?.status || app.status, valid_until: member?.valid_until, verify_url: verifyUrl }).replace(/'/g, "&apos;")})'>Print / Save as PDF</button>
    </div>`;

  new QRCode(document.getElementById("dash-qr-holder"), {
    text: verifyUrl,
    width: 64,
    height: 64,
  });
}

function printMyCard(c) {
  const logoUrl = new URL("logo.png", location.href).href;
  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><title>GMCOA-U Membership Card</title>
    <style>
      body{font-family:sans-serif;display:flex;justify-content:center;padding:40px;background:#f5f5f5;}
      .card{
        max-width:420px;width:100%;background:linear-gradient(135deg,#0B3D62 0%,#082C48 100%);
        border-radius:16px;padding:26px;color:#fff;box-shadow:0 16px 40px rgba(11,61,98,.28);position:relative;overflow:hidden;
      }
      .card::before{content:"";position:absolute;top:-40px;right:-40px;width:140px;height:140px;border-radius:50%;background:rgba(201,154,46,.15);}
      .hdr{display:flex;align-items:center;gap:12px;margin-bottom:18px;position:relative;}
      .hdr img{width:44px;height:44px;border-radius:50%;background:#fff;}
      .org{font-weight:800;font-size:1rem;}
      .sub{font-size:0.7rem;color:#C99A2E;letter-spacing:.5px;}
      .name{font-size:1.25rem;font-weight:800;margin:6px 0 2px;position:relative;}
      .num{font-size:0.85rem;color:#CFE0EA;letter-spacing:.5px;position:relative;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin:18px 0;font-size:0.82rem;position:relative;}
      .lbl{color:#C99A2E;font-size:0.68rem;text-transform:uppercase;letter-spacing:.4px;}
      .val{font-weight:600;}
      .ftr{display:flex;justify-content:space-between;align-items:flex-end;position:relative;}
      .badge{background:rgba(255,255,255,.15);padding:5px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;text-transform:uppercase;}
      .qr{background:#fff;padding:6px;border-radius:8px;}
      @media print { body{background:#fff;padding:0;} }
    </style>
    </head><body>
    <div class="card">
      <div class="hdr">
        <img src="${logoUrl}" alt="GMCOA-U">
        <div><div class="org">GMCOA-U</div><div class="sub">OFFICIAL MEMBERSHIP CARD</div></div>
      </div>
      <div class="name">${c.full_name}</div>
      <div class="num">${c.membership_number}</div>
      <div class="grid">
        <div><div class="lbl">Category</div><div class="val">${c.membership_category}</div></div>
        <div><div class="lbl">Valid Until</div><div class="val">${c.valid_until ? new Date(c.valid_until).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</div></div>
        <div><div class="lbl">District</div><div class="val">${c.district || "—"}</div></div>
        <div><div class="lbl">Region</div><div class="val">${c.region || "—"}</div></div>
      </div>
      <div class="ftr">
        <span class="badge">${c.status}</span>
        <div class="qr" id="pcard-qr"></div>
      </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    <script>
      new QRCode(document.getElementById("pcard-qr"), { text: "${c.verify_url}", width: 64, height: 64 });
      setTimeout(() => window.print(), 300);
    <\/script>
    </body></html>`);
  w.document.close();
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
  document.getElementById("invoice-output").innerHTML = `<p class="dash-empty-note">Invoice generated — <button class="btn btn-primary" style="padding:8px 16px;" onclick='openInvoicePrintWindow(${JSON.stringify(inv).replace(/'/g, "&apos;")})'>View / Print Invoice</button></p>`;
  openInvoicePrintWindow(inv);
}

function openInvoicePrintWindow(inv) {
  const logoUrl = new URL("logo.png", location.href).href;
  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><title>Invoice ${inv.invoice_number}</title>
    <style>
      body{font-family:sans-serif;padding:40px;color:#17242E;max-width:600px;margin:0 auto;}
      .header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0B3D62;padding-bottom:16px;margin-bottom:20px;}
      .header img{width:56px;height:56px;}
      .header h2{margin:0;color:#0B3D62;}
      .header p{margin:2px 0 0;color:#55666F;font-size:0.85rem;}
      h1{color:#0B3D62;font-size:1.3rem;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      td{padding:8px 0;border-bottom:1px solid #E1E8EC;}
    </style>
    </head><body>
    <div class="header">
      <img src="${logoUrl}" alt="GMCOA-U">
      <div>
        <h2>GMCOA-U</h2>
        <p>Graduate Medical Clinical Officers Association of Uganda</p>
        <p>P.O. Box 118044, Wakiso, Uganda</p>
      </div>
    </div>
    <h1>Payment Invoice</h1>
    <table>
      <tr><td><strong>Invoice Number</strong></td><td>${inv.invoice_number}</td></tr>
      <tr><td><strong>Member Name</strong></td><td>${inv.member_name}</td></tr>
      <tr><td><strong>Type</strong></td><td>${inv.payment_type}</td></tr>
      <tr><td><strong>Details</strong></td><td>${inv.reference_note || "—"}</td></tr>
      <tr><td><strong>Amount</strong></td><td>UGX ${Number(inv.amount).toLocaleString()}</td></tr>
      <tr><td><strong>Status</strong></td><td>${inv.status}</td></tr>
      <tr><td><strong>Date</strong></td><td>${new Date(inv.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
    </table>
    <p style="margin-top:30px;color:#55666F;font-size:0.85rem;">Thank you for initiating this payment. Pay via Mobile Money to +256 751 351607 (Dr. Herman Beigana, Treasurer), then message the Secretariat with this invoice number to confirm.</p>
    <script>window.print();</script>
    </body></html>`);
  w.document.close();
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
  const logoUrl = new URL("logo.png", location.href).href;
  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><title>Receipt ${receiptNo}</title>
    <style>
      body{font-family:sans-serif;padding:40px;color:#17242E;max-width:600px;margin:0 auto;}
      .header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0B3D62;padding-bottom:16px;margin-bottom:20px;}
      .header img{width:56px;height:56px;}
      .header h2{margin:0;color:#0B3D62;}
      .header p{margin:2px 0 0;color:#55666F;font-size:0.85rem;}
      h1{color:#0B3D62;font-size:1.3rem;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      td{padding:8px 0;border-bottom:1px solid #E1E8EC;}
    </style>
    </head><body>
    <div class="header">
      <img src="${logoUrl}" alt="GMCOA-U">
      <div>
        <h2>GMCOA-U</h2>
        <p>Graduate Medical Clinical Officers Association of Uganda</p>
        <p>P.O. Box 118044, Wakiso, Uganda</p>
      </div>
    </div>
    <h1>Official Receipt</h1>
    <table>
      <tr><td><strong>Receipt Number</strong></td><td>${receiptNo}</td></tr>
      <tr><td><strong>Category</strong></td><td>${t.category}</td></tr>
      <tr><td><strong>Payment Method</strong></td><td>${t.payment_method || "—"}</td></tr>
      <tr><td><strong>Amount Paid</strong></td><td>UGX ${Number(t.amount).toLocaleString()}</td></tr>
      <tr><td><strong>Date</strong></td><td>${new Date(t.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
      <tr><td><strong>Digital Verification Code</strong></td><td>${verificationCode}</td></tr>
    </table>
    <p style="margin-top:24px;font-size:0.9rem;">Thank you for your payment — your support strengthens GMCOA-U's mission to serve Graduate Medical Clinical Officers across Uganda.</p>
    <div style="margin-top:36px;">
      <img src="${new URL("treasurer-signature.png", location.href).href}" alt="Signature" style="height:60px;">
      <div style="border-top:1px solid #333;width:220px;margin-top:2px;"></div>
      <div style="font-size:0.8rem;color:#55666F;">Dr. Herman Beigana, Treasurer, GMCOA-U</div>
    </div>
    <script>window.print();</script>
    </body></html>`);
  w.document.close();
}

function escapeHtmlD(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
