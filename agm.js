document.addEventListener("DOMContentLoaded", () => {
  loadMeetings();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function loadMeetings() {
  const list = document.getElementById("meetings-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient.from("general_meetings").select("*").order("meeting_date", { ascending: false });
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No General Meetings scheduled yet.</p>`; return; }

  for (const m of data) {
    const { data: resolutions } = await supabaseClient.from("meeting_resolutions").select("*").eq("meeting_id", m.id);
    const card = document.createElement("div");
    card.className = "meeting-card";
    const dateStr = m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Date TBA";

    card.innerHTML = `
      <div class="election-top">
        <div class="card-category">${escapeHtmlAg(m.meeting_type)}</div>
        <span class="election-status-pill ${m.status.toLowerCase().replace(/\s+/g, "-")}">${escapeHtmlAg(m.status)}</span>
      </div>
      <h3>${escapeHtmlAg(m.title)}</h3>
      <p style="color:var(--text-muted);">${dateStr}</p>
      <div class="event-actions" style="margin-top:14px;">
        ${m.status === "Registration Open" ? `<button class="btn btn-primary register-meeting-btn" data-id="${m.id}" data-title="${escapeHtmlAg(m.title)}">Register Attendance</button>` : ""}
        ${m.agenda_document_link ? `<a href="${m.agenda_document_link}" target="_blank" rel="noopener">Agenda</a>` : ""}
        ${m.minutes_document_link ? `<a href="${m.minutes_document_link}" target="_blank" rel="noopener">Minutes</a>` : ""}
        ${m.virtual_meeting_link && m.status === "In Session" ? `<a class="btn join-meeting-btn" href="${m.virtual_meeting_link}" target="_blank" rel="noopener">Join via ${escapeHtmlAg(m.virtual_meeting_platform || "Video Call")}</a>` : ""}
      </div>
      ${resolutions && resolutions.length > 0 ? `
        <div style="margin-top:16px;">
          <strong style="font-size:0.85rem;">Resolutions:</strong>
          ${resolutions.map((r) => `<p style="font-size:0.86rem;color:var(--text-muted);margin:6px 0;">• ${escapeHtmlAg(r.resolution_text)} ${r.vote_result ? `<em>(${escapeHtmlAg(r.vote_result)})</em>` : ""}</p>`).join("")}
        </div>` : ""}
    `;
    list.appendChild(card);
  }

  document.querySelectorAll(".register-meeting-btn").forEach((btn) => {
    btn.addEventListener("click", () => registerForMeeting(btn.dataset.id, btn.dataset.title));
  });
}

async function registerForMeeting(meetingId, title) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }

  const { data: appRows } = await supabaseClient.from("membership_applications").select("full_name").eq("email", session.user.email).limit(1);
  const name = appRows && appRows[0] ? appRows[0].full_name : session.user.email;

  const { error } = await supabaseClient.from("meeting_registrations").insert({
    meeting_id: meetingId,
    member_email: session.user.email,
    member_name: name,
  });

  if (error) {
    alert(error.code === "23505" ? "You're already registered for this meeting." : "Failed: " + error.message);
    return;
  }
  alert(`Registered for ${title}!`);
}

function escapeHtmlAg(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
