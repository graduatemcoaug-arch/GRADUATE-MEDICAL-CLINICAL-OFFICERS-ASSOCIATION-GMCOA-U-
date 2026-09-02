document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }

  const { data: app, error } = await supabaseClient
    .from("membership_applications")
    .select("full_name,membership_category,membership_number,district_of_residence,region,status")
    .eq("email", session.user.email)
    .maybeSingle();

  const container = document.getElementById("card-container");

  if (error || !app || !app.membership_number) {
    container.innerHTML = `<p class="card-empty">Your membership card will appear here once your application is approved. Check your status at <a href="check-status.html">check-status.html</a>.</p>`;
    return;
  }

  const { data: member } = await supabaseClient
    .from("member_directory")
    .select("status,valid_until")
    .eq("membership_number", app.membership_number)
    .maybeSingle();

  const verifyUrl = `${location.origin}${location.pathname.replace("my-card.html", "verify.html")}?number=${encodeURIComponent(app.membership_number)}`;

  container.innerHTML = `
    <div class="membership-card" id="member-card">
      <div class="mc-header">
        <img src="logo.png" alt="GMCOA-U">
        <div>
          <div class="mc-org">GMCOA-U</div>
          <div class="mc-sub">OFFICIAL MEMBERSHIP CARD</div>
        </div>
      </div>
      <div class="mc-name">${escapeHtmlMc(app.full_name)}</div>
      <div class="mc-number">${escapeHtmlMc(app.membership_number)}</div>
      <div class="mc-grid">
        <div><div class="mc-label">Category</div><div class="mc-value">${escapeHtmlMc(app.membership_category)}</div></div>
        <div><div class="mc-label">Valid Until</div><div class="mc-value">${member?.valid_until ? new Date(member.valid_until).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</div></div>
        <div><div class="mc-label">District</div><div class="mc-value">${escapeHtmlMc(app.district_of_residence || "—")}</div></div>
        <div><div class="mc-label">Region</div><div class="mc-value">${escapeHtmlMc(app.region || "—")}</div></div>
      </div>
      <div class="mc-footer">
        <span class="mc-status-badge">${escapeHtmlMc(member?.status || app.status)}</span>
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
});

function escapeHtmlMc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
