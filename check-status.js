document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("status-form").addEventListener("submit", checkStatus);
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function checkStatus(e) {
  e.preventDefault();
  const form = e.target;
  const resultBox = document.getElementById("status-result");
  const trackingNumber = form.tracking_number.value.trim();
  const email = form.email.value.trim();

  resultBox.innerHTML = `<p class="verify-empty">Checking…</p>`;

  const { data, error } = await supabaseClient.rpc("check_application_status", {
    p_tracking_number: trackingNumber,
    p_email: email,
  });

  if (error) {
    console.error("Status check failed:", error);
    resultBox.innerHTML = `<p class="verify-empty">Something went wrong. Please try again or contact us directly.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    resultBox.innerHTML = `<p class="verify-empty">No application found with that tracking number and email. Double-check both and try again.</p>`;
    return;
  }

  const app = data[0];
  const statusClass = app.status.toLowerCase();
  const submitted = new Date(app.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  if (statusClass === "approved" && app.membership_number) {
    if (app.member_status === "Pending Payment") {
      resultBox.innerHTML = `
        <div class="verify-card">
          <div class="verify-badge suspended">•</div>
          <div>
            <span class="verify-status suspended">Approved — Payment Pending</span>
            <div class="verify-meta">Membership No: ${app.membership_number}. Your card will be issued once your subscription payment is confirmed by the Secretariat.</div>
          </div>
        </div>`;
      return;
    }
    renderCard(resultBox, app);
    return;
  }

  resultBox.innerHTML = `
    <div class="verify-card">
      <div class="verify-badge ${statusClass === "rejected" ? "expired" : "suspended"}">
        ${statusClass === "rejected" ? "!" : "•"}
      </div>
      <div>
        <span class="verify-status ${statusClass === "rejected" ? "expired" : "suspended"}">${app.status}</span>
        <div class="verify-meta"><span>Submitted: ${submitted}</span></div>
      </div>
    </div>`;
}

function renderCard(container, app) {
  const year = new Date().getFullYear();
  const verifyUrl = `${location.origin}${location.pathname.replace("check-status.html", "verify.html")}?number=${encodeURIComponent(app.membership_number)}`;

  container.innerHTML = `
    <div class="membership-card" id="member-card">
      <div class="mc-header">
        <img src="logo.png" alt="GMCOA-U">
        <div>
          <div class="mc-org">GMCOA-U</div>
          <div class="mc-sub">OFFICIAL MEMBERSHIP CARD</div>
        </div>
      </div>
      <div class="mc-name">${escapeHtmlS(app.full_name)}</div>
      <div class="mc-number">${escapeHtmlS(app.membership_number)}</div>
      <div class="mc-grid">
        <div><div class="mc-label">Category</div><div class="mc-value">${escapeHtmlS(app.membership_category)}</div></div>
        <div><div class="mc-label">Expires</div><div class="mc-value">31 Dec ${year}</div></div>
        <div><div class="mc-label">District</div><div class="mc-value">${escapeHtmlS(app.district_of_residence || "—")}</div></div>
        <div><div class="mc-label">Region</div><div class="mc-value">${escapeHtmlS(app.region || "—")}</div></div>
      </div>
      <div class="mc-footer">
        <span class="mc-status-badge">Active</span>
        <div class="mc-qr" id="qr-holder"></div>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
    </div>`;

  new QRCode(document.getElementById("qr-holder"), {
    text: verifyUrl,
    width: 64,
    height: 64,
  });
}

function escapeHtmlS(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
