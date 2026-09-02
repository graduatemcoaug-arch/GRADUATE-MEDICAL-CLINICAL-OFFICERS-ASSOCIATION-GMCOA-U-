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
      <button class="btn btn-primary" onclick='printMyCard(${JSON.stringify({ full_name: app.full_name, membership_number: app.membership_number, membership_category: app.membership_category, district: app.district_of_residence, region: app.region, status: member?.status || app.status, valid_until: member?.valid_until, verify_url: verifyUrl }).replace(/'/g, "&apos;")})'>Print / Save as PDF</button>
    </div>`;

  new QRCode(document.getElementById("qr-holder"), {
    text: verifyUrl,
    width: 64,
    height: 64,
  });
});

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

function escapeHtmlMc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
