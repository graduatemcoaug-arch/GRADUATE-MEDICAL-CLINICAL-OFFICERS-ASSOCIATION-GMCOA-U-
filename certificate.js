document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const verifyNum = params.get("verify");

  if (verifyNum) {
    verifyCertificate(verifyNum);
    return;
  }

  const type = params.get("type");
  const ref = params.get("ref");
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }

  await issueOrShowCertificate(type, ref, session.user.email);
});

function generateCertNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GMCOA-CERT-${year}-${rand}`;
}

async function issueOrShowCertificate(type, refId, email) {
  const certType = type === "event" ? "Event Participation" : "CPD Course";

  const { data: existing } = await supabaseClient
    .from("certificates")
    .select("*")
    .eq("recipient_email", email)
    .eq("reference_id", refId)
    .eq("certificate_type", certType)
    .maybeSingle();

  if (existing) { renderCertificate(existing); return; }

  let title = "";
  let points = 0;
  let name = email;

  if (certType === "CPD Course") {
    const { data: course } = await supabaseClient.from("cpd_courses").select("title,cpd_points").eq("id", refId).single();
    title = course?.title || "Course";
    points = course?.cpd_points || 0;
  } else {
    const { data: event } = await supabaseClient.from("events").select("title").eq("id", refId).single();
    title = event?.title || "Event";
  }

  const { data: profileRows } = await supabaseClient.from("membership_applications").select("full_name").eq("email", email).limit(1);
  if (profileRows && profileRows[0]) name = profileRows[0].full_name;

  const payload = {
    certificate_type: certType,
    reference_id: refId,
    reference_title: title,
    recipient_name: name,
    recipient_email: email,
    cpd_points: points,
    certificate_number: generateCertNumber(),
  };

  const { data: inserted, error } = await supabaseClient.from("certificates").insert(payload).select().single();
  if (error) {
    document.getElementById("cert-body").innerHTML = `<p class="card-empty">Could not generate certificate: ${error.message}</p>`;
    return;
  }
  renderCertificate(inserted);
}

async function verifyCertificate(certNumber) {
  const { data, error } = await supabaseClient.from("certificates").select("*").eq("certificate_number", certNumber).maybeSingle();
  if (error || !data) {
    document.getElementById("cert-body").innerHTML = `<p class="card-empty">No certificate found with number ${escapeHtmlC(certNumber)}.</p>`;
    return;
  }
  renderCertificate(data, true);
}

function renderCertificate(cert, verifyMode) {
  document.getElementById("cert-body").innerHTML = `
    <div class="cert-preview" id="cert-print">
      <img src="logo.png" alt="GMCOA-U" style="width:56px;height:56px;margin-bottom:10px;">
      <div class="cert-org">Graduate Medical Clinical Officers Association of Uganda</div>
      <h2>Certificate of ${cert.certificate_type === "CPD Course" ? "Completion" : "Participation"}</h2>
      <p style="color:var(--text-muted);">This certifies that</p>
      <div class="cert-name">${escapeHtmlC(cert.recipient_name)}</div>
      <p style="color:var(--text-muted);">has successfully ${cert.certificate_type === "CPD Course" ? "completed" : "participated in"}</p>
      <p style="font-weight:700;font-size:1.1rem;">${escapeHtmlC(cert.reference_title)}</p>
      ${cert.cpd_points ? `<p style="color:var(--green);font-weight:700;">${cert.cpd_points} CPD Points Awarded</p>` : ""}
      <p class="cert-num">Certificate No. ${escapeHtmlC(cert.certificate_number)} · Issued ${new Date(cert.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      <p class="cert-num">Verify at: ${location.origin}${location.pathname}?verify=${cert.certificate_number}</p>
    </div>
    ${!verifyMode ? `<div class="card-actions"><button class="btn btn-primary" onclick='printCertificate(${JSON.stringify(cert).replace(/'/g, "&apos;")})'>Print / Save as PDF</button></div>` : ""}`;
}

function printCertificate(cert) {
  const logoUrl = new URL("logo.png", location.href).href;
  const verifyUrl = `${location.origin}${location.pathname}?verify=${cert.certificate_number}`;
  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><title>Certificate ${cert.certificate_number}</title>
    <style>
      body{font-family:sans-serif;display:flex;justify-content:center;padding:40px;background:#f5f5f5;}
      .cert{max-width:480px;width:100%;background:#fff;border:6px solid #C99A2E;border-radius:10px;padding:40px 30px;text-align:center;}
      .cert img{width:56px;height:56px;margin-bottom:10px;}
      .org{font-size:0.8rem;color:#C99A2E;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
      .cert h2{color:#0B3D62;margin:14px 0 4px;}
      .muted{color:#55666F;}
      .name{font-size:1.5rem;font-weight:800;margin:16px 0;color:#17242E;}
      .title{font-weight:700;font-size:1.1rem;color:#17242E;}
      .pts{color:#1D9E75;font-weight:700;}
      .num{font-size:0.75rem;color:#55666F;margin-top:20px;}
      @media print { body{background:#fff;padding:0;} }
    </style>
    </head><body>
    <div class="cert">
      <img src="${logoUrl}" alt="GMCOA-U">
      <div class="org">Graduate Medical Clinical Officers Association of Uganda</div>
      <h2>Certificate of ${cert.certificate_type === "CPD Course" ? "Completion" : "Participation"}</h2>
      <p class="muted">This certifies that</p>
      <div class="name">${escapeHtmlC(cert.recipient_name)}</div>
      <p class="muted">has successfully ${cert.certificate_type === "CPD Course" ? "completed" : "participated in"}</p>
      <p class="title">${escapeHtmlC(cert.reference_title)}</p>
      ${cert.cpd_points ? `<p class="pts">${cert.cpd_points} CPD Points Awarded</p>` : ""}
      <p class="num">Certificate No. ${escapeHtmlC(cert.certificate_number)} &middot; Issued ${new Date(cert.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      <p class="num">Verify at: ${verifyUrl}</p>
    </div>
    <script>setTimeout(() => window.print(), 300);<\/script>
    </body></html>`);
  w.document.close();
}

function escapeHtmlC(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
