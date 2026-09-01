document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("pass-lookup-form").addEventListener("submit", lookupPass);
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function lookupPass(e) {
  e.preventDefault();
  const form = e.target;
  const resultBox = document.getElementById("pass-lookup-result");
  const regNumber = form.registration_number.value.trim();
  const email = form.email.value.trim();

  resultBox.innerHTML = `<p class="verify-empty">Looking up your pass…</p>`;

  const { data, error } = await supabaseClient.rpc("get_event_pass", {
    p_registration_number: regNumber,
    p_email: email,
  });

  if (error || !data || data.length === 0) {
    resultBox.innerHTML = `<p class="verify-empty">No pass found with that registration number and email.</p>`;
    return;
  }

  const reg = data[0];
  resultBox.innerHTML = `
    <div class="membership-card" id="event-pass-card">
      <div class="mc-header">
        <img src="logo.png" alt="GMCOA-U">
        <div>
          <div class="mc-org">GMCOA-U</div>
          <div class="mc-sub">EVENT PASS</div>
        </div>
      </div>
      <div class="mc-name">${escapeHtmlP(reg.full_name)}</div>
      <div class="mc-number">${escapeHtmlP(reg.registration_number)}</div>
      <div class="mc-grid">
        <div><div class="mc-label">Event</div><div class="mc-value">${escapeHtmlP(reg.event_title)}</div></div>
        <div><div class="mc-label">Attendance</div><div class="mc-value">${escapeHtmlP(reg.attendance_type)}</div></div>
      </div>
      <div class="mc-footer">
        <span class="mc-status-badge">Confirmed</span>
        <div class="mc-qr" id="event-qr-holder"></div>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
    </div>`;

  new QRCode(document.getElementById("event-qr-holder"), {
    text: `${reg.registration_number} | ${reg.full_name} | ${reg.event_title}`,
    width: 64,
    height: 64,
  });
}

function escapeHtmlP(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
