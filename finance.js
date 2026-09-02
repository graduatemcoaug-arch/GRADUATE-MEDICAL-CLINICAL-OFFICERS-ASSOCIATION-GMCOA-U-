let allTransactions = [];
let approvalThreshold = 500000;

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("income-form").addEventListener("submit", (e) => addTransaction(e, "Income"));
  document.getElementById("expenditure-form").addEventListener("submit", (e) => addTransaction(e, "Expenditure"));
  document.getElementById("budget-form").addEventListener("submit", addBudget);
  document.getElementById("procurement-form").addEventListener("submit", addPurchaseRequest);
  document.getElementById("donor-form").addEventListener("submit", addDonor);
  document.getElementById("sponsorship-form").addEventListener("submit", addSponsorship);
  document.getElementById("generate-report-btn").addEventListener("click", generateReport);
  document.getElementById("export-csv-btn").addEventListener("click", exportReportCsv);
  document.getElementById("invoice-status-filter").addEventListener("change", loadInvoicesAdmin);

  document.querySelectorAll("#finance-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
});

function switchTab(tab) {
  document.querySelectorAll("#finance-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
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
  if (error) { note.textContent = "Login failed — check your email and password."; note.style.color = "#B3261E"; return; }
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
  loadApprovalSettings();
  loadFinanceData();
  loadPurchaseRequests();
  loadDonors();
  loadSponsorships();
  loadAuditLog();
  loadInvoicesAdmin();
}

/* ---------------- LEDGER ---------------- */

async function loadApprovalSettings() {
  const { data } = await supabaseClient.from("approval_settings").select("threshold_amount").eq("id", 1).single();
  if (data) approvalThreshold = data.threshold_amount;
  document.getElementById("approval-threshold-note").textContent =
    `Transactions over ${formatUGX(approvalThreshold)} are flagged "Pending Approval" until confirmed below.`;
}

async function addTransaction(e, type) {
  e.preventDefault();
  const form = e.target;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const amount = parseFloat(form.amount.value);

  const payload = {
    type,
    category: form.category.value,
    description: form.description.value.trim() || null,
    amount,
    payment_method: form.payment_method.value,
    transaction_date: form.transaction_date.value || new Date().toISOString().slice(0, 10),
    membership_number: form.membership_number ? form.membership_number.value.trim() || null : null,
    transaction_reference: form.transaction_reference ? form.transaction_reference.value.trim() || null : null,
    bank_name: form.bank_name ? form.bank_name.value.trim() || null : null,
    recorded_by: session?.user?.email || null,
    requires_approval: amount >= approvalThreshold,
    approval_status: amount >= approvalThreshold ? "Pending Approval" : "Approved",
  };

  const { error } = await supabaseClient.from("finance_transactions").insert(payload);
  if (error) { alert("Failed to save: " + error.message); return; }
  form.reset();
  loadFinanceData();
}

async function loadFinanceData() {
  const { data, error } = await supabaseClient.from("finance_transactions").select("*").order("transaction_date", { ascending: false });
  if (error) { document.getElementById("tx-list").innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }

  allTransactions = data || [];
  renderSummary(allTransactions);
  renderTransactions(allTransactions);
  loadBudgets(allTransactions);
  renderReceipts(allTransactions);
}

function renderSummary(transactions) {
  populateReportYears(transactions);
  const income = transactions.filter((t) => t.type === "Income" && t.approval_status === "Approved").reduce((s, t) => s + Number(t.amount), 0);
  const expenditure = transactions.filter((t) => t.type === "Expenditure" && t.approval_status === "Approved").reduce((s, t) => s + Number(t.amount), 0);
  document.getElementById("total-income").textContent = formatUGX(income);
  document.getElementById("total-expenditure").textContent = formatUGX(expenditure);
  document.getElementById("total-balance").textContent = formatUGX(income - expenditure);
}

function renderTransactions(transactions) {
  const list = document.getElementById("tx-list");
  if (transactions.length === 0) { list.innerHTML = `<p class="card-empty">No transactions recorded yet.</p>`; return; }

  const rows = transactions.slice(0, 50).map((t) => `
    <tr>
      <td>${new Date(t.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
      <td>${escapeHtmlF(t.category)}</td>
      <td>${escapeHtmlF(t.description || "—")}</td>
      <td>${escapeHtmlF(t.payment_method || "—")}</td>
      <td class="amt-${t.type.toLowerCase()}">${t.type === "Income" ? "+" : "−"}${formatUGX(t.amount)}</td>
      <td>${t.approval_status === "Pending Approval"
        ? `<button class="btn-approve" style="padding:4px 10px;font-size:0.75rem;" onclick="approveTx('${t.id}')">Approve</button>`
        : `<span class="status-pill approved">Approved</span>`}</td>
    </tr>`).join("");

  list.innerHTML = `<div class="tx-table-wrap"><table class="tx-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function approveTx(id) {
  const { error } = await supabaseClient.from("finance_transactions").update({ approval_status: "Approved" }).eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadFinanceData();
}

/* ---------------- BUDGET ---------------- */

async function addBudget(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    category: form.category.value.trim(),
    budget_year: parseInt(form.budget_year.value, 10),
    budgeted_amount: parseFloat(form.budgeted_amount.value),
    notes: form.notes.value.trim() || null,
  };
  const { error } = await supabaseClient.from("budgets").insert(payload);
  if (error) { alert("Failed to save budget: " + error.message); return; }
  form.reset();
  loadFinanceData();
}

async function loadBudgets(transactions) {
  const list = document.getElementById("budget-list");
  const { data, error } = await supabaseClient.from("budgets").select("*").order("budget_year", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No budgets set yet.</p>`; return; }

  list.innerHTML = data.map((b) => {
    const actual = transactions.filter((t) => t.type === "Expenditure" && t.category === b.category && new Date(t.transaction_date).getFullYear() === b.budget_year).reduce((s, t) => s + Number(t.amount), 0);
    const pct = b.budgeted_amount > 0 ? Math.min(100, (actual / b.budgeted_amount) * 100) : 0;
    const over = actual > b.budgeted_amount;
    return `<div class="budget-row"><div class="budget-top"><span class="b-cat">${escapeHtmlF(b.category)}</span><span class="b-year">${b.budget_year}</span></div><div class="budget-bar"><div class="budget-bar-fill ${over ? "over" : ""}" style="width:${pct}%;"></div></div><div class="budget-nums"><span>Spent: ${formatUGX(actual)}</span><span>Budget: ${formatUGX(b.budgeted_amount)}</span></div></div>`;
  }).join("");
}

/* ---------------- RECEIPTS ---------------- */

function renderReceipts(transactions) {
  const list = document.getElementById("receipts-list");
  const incomeTx = transactions.filter((t) => t.type === "Income");
  if (incomeTx.length === 0) { list.innerHTML = `<p class="card-empty">No income transactions to generate receipts for.</p>`; return; }

  list.innerHTML = incomeTx.slice(0, 50).map((t) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlF(t.category)} — ${formatUGX(t.amount)}</div>
        <div class="dir-meta">${new Date(t.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · ${escapeHtmlF(t.payment_method || "")}</div>
      </div>
      <button class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);" onclick="printReceipt('${t.id}')">Print Receipt</button>
    </div>`).join("");
}

function printReceipt(id) {
  const t = allTransactions.find((tx) => tx.id === id);
  if (!t) return;
  printReceiptForTransaction(t);
}

function printReceiptForTransaction(t) {
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
      <tr><td><strong>Transaction Reference</strong></td><td>${t.transaction_reference || "—"}</td></tr>
      <tr><td><strong>Amount Paid</strong></td><td>${formatUGX(t.amount)}</td></tr>
      <tr><td><strong>Date</strong></td><td>${new Date(t.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
      <tr><td><strong>Digital Verification Code</strong></td><td>${verificationCode}</td></tr>
    </table>
    <p style="margin-top:30px;color:#55666F;font-size:0.85rem;">Graduate Medical Clinical Officers Association of Uganda</p>
    <script>window.print();</script>
    </body></html>`);
  w.document.close();
}

/* ---------------- PROCUREMENT ---------------- */

async function addPurchaseRequest(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    item_description: form.item_description.value.trim(),
    quantity: form.quantity.value ? parseInt(form.quantity.value, 10) : null,
    estimated_cost: form.estimated_cost.value ? parseFloat(form.estimated_cost.value) : null,
    supplier: form.supplier.value.trim() || null,
    requested_by: form.requested_by.value.trim() || null,
    notes: form.notes.value.trim() || null,
  };
  const { error } = await supabaseClient.from("purchase_requests").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadPurchaseRequests();
}

async function loadPurchaseRequests() {
  const list = document.getElementById("procurement-list");
  const { data, error } = await supabaseClient.from("purchase_requests").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No purchase requests yet.</p>`; return; }

  list.innerHTML = data.map((p) => `
    <div class="corr-card">
      <h4>${escapeHtmlF(p.item_description)}</h4>
      <p>${p.supplier ? "Supplier: " + escapeHtmlF(p.supplier) : ""} ${p.notes ? "· " + escapeHtmlF(p.notes) : ""}</p>
      <div class="corr-meta">
        <span>Qty: ${p.quantity ?? "—"}</span>
        <span>Est: ${p.estimated_cost ? formatUGX(p.estimated_cost) : "—"}</span>
        <span>By: ${escapeHtmlF(p.requested_by || "—")}</span>
        <select class="pr-status-select" data-id="${p.id}">
          ${["Requested","Quoted","Approved","Ordered","Delivered","Paid","Cancelled"].map((s) => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>`).join("");

  document.querySelectorAll(".pr-status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await supabaseClient.from("purchase_requests").update({ status: sel.value }).eq("id", sel.dataset.id);
      loadPurchaseRequests();
    });
  });
}

/* ---------------- DONORS & SPONSORS ---------------- */

async function addDonor(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value.trim(),
    donor_type: form.donor_type.value,
    contact_person: form.contact_person.value.trim() || null,
    contact_email: form.contact_email.value.trim() || null,
    total_contributed: form.total_contributed.value ? parseFloat(form.total_contributed.value) : 0,
    agreement_status: form.agreement_status.value,
    reporting_deadline: form.reporting_deadline.value || null,
    project_deliverables: form.project_deliverables.value.trim() || null,
    recognition_status: form.recognition_status.value,
    notes: form.notes.value.trim() || null,
  };
  const { error } = await supabaseClient.from("donors_sponsors").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadDonors();
}

async function loadDonors() {
  const list = document.getElementById("donors-list");
  const { data, error } = await supabaseClient.from("donors_sponsors").select("*").order("name", { ascending: true });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No donors or sponsors logged yet.</p>`; return; }

  list.innerHTML = data.map((d) => `
    <div class="stake-card">
      <div class="card-category">${escapeHtmlF(d.donor_type || "")}</div>
      <h4>${escapeHtmlF(d.name)}</h4>
      <p>Contributed: ${formatUGX(d.total_contributed || 0)} · Agreement: ${escapeHtmlF(d.agreement_status || "—")} · Recognition: ${escapeHtmlF(d.recognition_status || "—")}</p>
      <div class="stake-meta">
        ${d.contact_person ? `<span>👤 ${escapeHtmlF(d.contact_person)}</span>` : ""}
        ${d.reporting_deadline ? `<span>📌 Report due: ${new Date(d.reporting_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>` : ""}
      </div>
    </div>`).join("");
}

/* ---------------- CONFERENCE FINANCE ---------------- */

async function addSponsorship(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    event_title: form.event_title.value.trim(),
    sponsor_name: form.sponsor_name.value.trim(),
    package_name: form.package_name.value.trim() || null,
    amount: parseFloat(form.amount.value),
    notes: form.notes.value.trim() || null,
  };
  const { error } = await supabaseClient.from("sponsorship_packages").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadSponsorships();
}

async function loadSponsorships() {
  const list = document.getElementById("sponsorship-list");
  const { data, error } = await supabaseClient.from("sponsorship_packages").select("*").order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No sponsorship packages logged yet.</p>`; return; }

  list.innerHTML = data.map((s) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlF(s.sponsor_name)} — ${escapeHtmlF(s.package_name || "")}</div>
        <div class="dir-meta">${escapeHtmlF(s.event_title)} · ${formatUGX(s.amount)}</div>
      </div>
      <select class="sp-status-select" data-id="${s.id}">
        <option ${s.payment_status === "Pending" ? "selected" : ""}>Pending</option>
        <option ${s.payment_status === "Paid" ? "selected" : ""}>Paid</option>
        <option ${s.payment_status === "Refunded" ? "selected" : ""}>Refunded</option>
      </select>
    </div>`).join("");

  document.querySelectorAll(".sp-status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await supabaseClient.from("sponsorship_packages").update({ payment_status: sel.value }).eq("id", sel.dataset.id);
      loadSponsorships();
    });
  });
}

/* ---------------- REPORTS ---------------- */

let currentReportData = [];

function populateReportYears(transactions) {
  const select = document.getElementById("report-year");
  if (!select || select.dataset.populated) return;

  const years = new Set(transactions.map((t) => new Date(t.transaction_date).getFullYear()));
  years.add(new Date().getFullYear());
  const sorted = Array.from(years).sort((a, b) => b - a);

  select.innerHTML = sorted.map((y) => `<option value="${y}">${y}</option>`).join("");
  select.dataset.populated = "true";
}

async function generateReport() {
  const type = document.getElementById("report-type").value;
  const output = document.getElementById("report-output");
  output.innerHTML = `<p class="card-empty">Generating…</p>`;

  let rows = [];
  let headers = [];
  let note = "";
  const selectedYear = parseInt(document.getElementById("report-year").value || new Date().getFullYear(), 10);

  if (type === "monthly-summary") {
    headers = ["Month", "Income", "Expenditure", "Net", "Running Balance"];
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let running = 0;
    rows = monthNames.map((mName, i) => {
      const monthTx = allTransactions.filter((t) => {
        const d = new Date(t.transaction_date);
        return d.getFullYear() === selectedYear && d.getMonth() === i && t.approval_status === "Approved";
      });
      const income = monthTx.filter((t) => t.type === "Income").reduce((s, t) => s + Number(t.amount), 0);
      const expenditure = monthTx.filter((t) => t.type === "Expenditure").reduce((s, t) => s + Number(t.amount), 0);
      const net = income - expenditure;
      running += net;
      return [mName + " " + selectedYear, income, expenditure, net, running];
    });
  } else if (type === "financial-position") {
    const approved = allTransactions.filter((t) => t.approval_status === "Approved" && new Date(t.transaction_date).getFullYear() <= selectedYear);
    const totalIncome = approved.filter((t) => t.type === "Income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenditure = approved.filter((t) => t.type === "Expenditure").reduce((s, t) => s + Number(t.amount), 0);
    const byCategory = {};
    approved.filter((t) => t.type === "Income").forEach((t) => { byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount); });

    headers = ["Item", "Amount (UGX)"];
    rows = [
      ["Cash & Cash Equivalents (Net Position)", totalIncome - totalExpenditure],
      ["— Total Income Received (cumulative)", totalIncome],
      ["— Total Expenditure (cumulative)", totalExpenditure],
      ...Object.entries(byCategory).map(([cat, amt]) => [`   Income from: ${cat}`, amt]),
    ];
    note = "This is a simplified, cash-basis Statement of Financial Position — it reflects net cash received and spent, not a formal balance sheet with tracked assets, receivables, or payables.";
  } else if (type === "income-statement") {
    headers = ["Date", "Source", "Description", "Amount"];
    rows = allTransactions.filter((t) => t.type === "Income").map((t) => [t.transaction_date, t.category, t.description || "", t.amount]);
  } else if (type === "expenditure-report") {
    headers = ["Date", "Category", "Description", "Amount"];
    rows = allTransactions.filter((t) => t.type === "Expenditure").map((t) => [t.transaction_date, t.category, t.description || "", t.amount]);
  } else if (type === "budget-performance") {
    const { data: budgets } = await supabaseClient.from("budgets").select("*");
    headers = ["Category", "Year", "Budgeted", "Actual Spent", "Variance"];
    rows = (budgets || []).map((b) => {
      const actual = allTransactions.filter((t) => t.type === "Expenditure" && t.category === b.category && new Date(t.transaction_date).getFullYear() === b.budget_year).reduce((s, t) => s + Number(t.amount), 0);
      return [b.category, b.budget_year, b.budgeted_amount, actual, b.budgeted_amount - actual];
    });
  } else if (type === "subscription-collection") {
    headers = ["Date", "Membership Number", "Amount", "Method"];
    rows = allTransactions.filter((t) => t.category === "Membership Fees").map((t) => [t.transaction_date, t.membership_number || "—", t.amount, t.payment_method]);
  } else if (type === "outstanding-debtors") {
    const { data: members } = await supabaseClient.from("member_directory").select("membership_number,full_name,status").eq("status", "Active");
    const year = new Date().getFullYear();
    const paidNumbers = new Set(allTransactions.filter((t) => t.category === "Membership Fees" && new Date(t.transaction_date).getFullYear() === year).map((t) => t.membership_number));
    headers = ["Membership Number", "Name", "Status"];
    rows = (members || []).filter((m) => !paidNumbers.has(m.membership_number)).map((m) => [m.membership_number, m.full_name, "Unpaid " + year]);
  } else if (type === "donation-report") {
    const { data: donors } = await supabaseClient.from("donors_sponsors").select("*");
    headers = ["Name", "Type", "Total Contributed", "Agreement Status"];
    rows = (donors || []).map((d) => [d.name, d.donor_type || "", d.total_contributed || 0, d.agreement_status || ""]);
  } else if (type === "sponsorship-report") {
    const { data: sponsorships } = await supabaseClient.from("sponsorship_packages").select("*");
    headers = ["Event", "Sponsor", "Package", "Amount", "Status"];
    rows = (sponsorships || []).map((s) => [s.event_title, s.sponsor_name, s.package_name || "", s.amount, s.payment_status]);
  } else if (type === "conference-financial") {
    const { data: registrations } = await supabaseClient.from("event_registrations").select("event_title,payment_status,amount_paid");
    headers = ["Event", "Payment Status", "Amount Paid"];
    rows = (registrations || []).map((r) => [r.event_title, r.payment_status || "Unpaid", r.amount_paid || 0]);
  }

  currentReportData = { headers, rows };

  if (rows.length === 0) {
    output.innerHTML = `<p class="card-empty">No data for this report yet.</p>`;
    return;
  }

  output.innerHTML = (note ? `<p class="dash-empty-note" style="margin-bottom:12px;">${note}</p>` : "") +
    `<div class="tx-table-wrap"><table class="tx-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
    rows.map((r) => `<tr>${r.map((cell) => `<td>${typeof cell === "number" ? cell.toLocaleString() : cell}</td>`).join("")}</tr>`).join("")
  }</tbody></table></div>`;
}

function exportReportCsv() {
  if (!currentReportData.rows || currentReportData.rows.length === 0) {
    alert("Generate a report first.");
    return;
  }
  const csvRows = [currentReportData.headers.join(",")];
  currentReportData.rows.forEach((r) => {
    csvRows.push(r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = document.getElementById("report-type").value + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- AUDIT TRAIL ---------------- */

async function loadAuditLog() {
  const list = document.getElementById("audit-list");
  const { data, error } = await supabaseClient.from("finance_audit_log").select("*").order("changed_at", { ascending: false }).limit(50);
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No audit entries yet.</p>`; return; }

  list.innerHTML = data.map((a) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${a.action} on ${a.table_name}</div>
        <div class="dir-meta">By ${escapeHtmlF(a.changed_by || "unknown")} · ${new Date(a.changed_at).toLocaleString("en-US")}</div>
      </div>
    </div>`).join("");
}

/* ---------------- INVOICES ---------------- */

async function loadInvoicesAdmin() {
  const list = document.getElementById("invoices-admin-list");
  const statusFilter = document.getElementById("invoice-status-filter").value;

  let query = supabaseClient.from("payment_invoices").select("*").order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No invoices here.</p>`; return; }

  list.innerHTML = data.map((inv) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlF(inv.invoice_number)} — ${escapeHtmlF(inv.member_name)}</div>
        <div class="dir-meta">${escapeHtmlF(inv.payment_type)} · ${escapeHtmlF(inv.reference_note || "")} · ${formatUGX(inv.amount)} · ${new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="status-pill ${inv.status.toLowerCase()}">${escapeHtmlF(inv.status)}</span>
        ${inv.status === "Pending" ? `
          <select class="invoice-method-select" data-id="${inv.id}">
            <option>Mobile Money</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>Other</option>
          </select>
          <button class="btn-approve" style="padding:5px 12px;font-size:0.78rem;" onclick="confirmInvoicePaid('${inv.id}')">Mark Paid</button>
          <button class="delete-entry-btn" onclick="cancelInvoice('${inv.id}')">Cancel</button>` : ""}
      </div>
    </div>`).join("");
}

async function confirmInvoicePaid(id) {
  const select = document.querySelector(`.invoice-method-select[data-id="${id}"]`);
  const method = select ? select.value : "Other";

  const { data: newTxId, error } = await supabaseClient.rpc("mark_invoice_paid", { p_invoice_id: id, p_payment_method: method });
  if (error) { alert("Failed: " + error.message); return; }

  loadInvoicesAdmin();
  loadFinanceData();

  if (newTxId) {
    const { data: tx } = await supabaseClient.from("finance_transactions").select("*").eq("id", newTxId).single();
    if (tx) printReceiptForTransaction(tx);
  }
}

async function cancelInvoice(id) {
  if (!confirm("Cancel this invoice?")) return;
  const { error } = await supabaseClient.from("payment_invoices").update({ status: "Cancelled" }).eq("id", id);
  if (error) { alert("Failed: " + error.message); return; }
  loadInvoicesAdmin();
}

/* ---------------- HELPERS ---------------- */

function formatUGX(n) { return "UGX " + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }); }

function escapeHtmlF(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
