let allEvents = [];
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let countdownTimer = null;
let selectedEvent = null;

document.addEventListener("DOMContentLoaded", () => {
  wireEventsControls();
  loadAllEvents();
  wireRegistrationModal();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function wireEventsControls() {
  document.getElementById("view-list-btn").addEventListener("click", () => switchView("list"));
  document.getElementById("view-cal-btn").addEventListener("click", () => switchView("calendar"));
  document.getElementById("event-type-filter").addEventListener("change", renderList);
  document.getElementById("cal-prev").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("cal-next").addEventListener("click", () => shiftMonth(1));
}

function switchView(view) {
  document.getElementById("view-list-btn").classList.toggle("active", view === "list");
  document.getElementById("view-cal-btn").classList.toggle("active", view === "calendar");
  document.getElementById("event-list-view").classList.toggle("hidden", view !== "list");
  document.getElementById("calendar-view").classList.toggle("active", view === "calendar");
  if (view === "calendar") renderCalendar();
}

async function loadAllEvents() {
  const { data, error } = await supabaseClient
    .from("events")
    .select("id,title,description,event_type,start_time,end_time,location,is_virtual,registration_url,image_url,virtual_meeting_link,virtual_meeting_platform")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Events load failed:", error);
    document.getElementById("event-list-view").innerHTML = `<p class="card-empty">Something went wrong loading events.</p>`;
    return;
  }

  allEvents = data || [];
  populateTypeFilter();
  renderCountdown();
  renderList();
}

function populateTypeFilter() {
  const select = document.getElementById("event-type-filter");
  const types = [...new Set(allEvents.map((e) => e.event_type).filter(Boolean))];
  types.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
}

function renderCountdown() {
  const banner = document.getElementById("countdown-banner");
  const now = new Date();
  const next = allEvents.find((e) => new Date(e.start_time) > now);

  if (!next) {
    banner.style.display = "none";
    return;
  }
  banner.style.display = "flex";
  document.getElementById("cd-title").textContent = next.title;

  if (countdownTimer) clearInterval(countdownTimer);
  const tick = () => {
    const diff = new Date(next.start_time) - new Date();
    if (diff <= 0) {
      clearInterval(countdownTimer);
      document.getElementById("countdown-timer").innerHTML = `<div class="cd-unit"><span class="num">Now</span></div>`;
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById("countdown-timer").innerHTML = `
      <div class="cd-unit"><span class="num">${d}</span><span class="lbl">Days</span></div>
      <div class="cd-unit"><span class="num">${h}</span><span class="lbl">Hrs</span></div>
      <div class="cd-unit"><span class="num">${m}</span><span class="lbl">Min</span></div>
      <div class="cd-unit"><span class="num">${s}</span><span class="lbl">Sec</span></div>`;
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function renderList() {
  const container = document.getElementById("event-list-view");
  const filterVal = document.getElementById("event-type-filter").value;
  const filtered = filterVal ? allEvents.filter((e) => e.event_type === filterVal) : allEvents;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="card-empty">No events match this filter yet — add rows to the "events" table in Supabase.</p>`;
    return;
  }

  container.innerHTML = filtered.map(eventCard).join("");
}

function eventCard(e) {
  const d = new Date(e.start_time);
  const day = d.getDate();
  const mon = d.toLocaleString("en-US", { month: "short" });
  const timeStr = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
  const where = e.is_virtual ? "Virtual Event" : (e.location || "Location TBA");
  const mapLink = !e.is_virtual && e.location
    ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}" target="_blank" rel="noopener">View Map</a>`
    : "";
  const regBtn = `<button class="btn btn-primary open-register-btn" data-id="${e.id}" data-title="${escapeHtmlE(e.title)}">Register</button>`;
  const externalLink = e.registration_url
    ? `<a href="${e.registration_url}" target="_blank" rel="noopener">External Link</a>`
    : "";
  const joinBtn = e.virtual_meeting_link
    ? `<a class="btn join-meeting-btn" href="${e.virtual_meeting_link}" target="_blank" rel="noopener">Join via ${escapeHtmlE(e.virtual_meeting_platform || "Video Call")}</a>`
    : "";

  return `
    <div class="event-card">
      <div class="event-date"><span class="day">${day}</span><span class="mon">${mon}</span></div>
      <div>
        ${e.event_type ? `<div class="event-type">${escapeHtmlE(e.event_type)}</div>` : ""}
        <h3>${escapeHtmlE(e.title)}</h3>
        <p>${escapeHtmlE(e.description || "")}</p>
        <p style="margin-top:6px;">📍 ${escapeHtmlE(where)} &nbsp;·&nbsp; 🕐 ${timeStr}</p>
        <div class="event-actions">
          ${regBtn}
          ${mapLink}
          ${externalLink}
          ${joinBtn}
        </div>
      </div>
    </div>`;
}

function wireRegistrationModal() {
  document.getElementById("event-list-view").addEventListener("click", (e) => {
    const btn = e.target.closest(".open-register-btn");
    if (!btn) return;
    selectedEvent = { id: btn.dataset.id, title: btn.dataset.title };
    document.getElementById("reg-event-title").textContent = selectedEvent.title;
    document.getElementById("event-reg-modal-bg").classList.add("open");
  });

  document.getElementById("event-reg-cancel").addEventListener("click", () => {
    document.getElementById("event-reg-modal-bg").classList.remove("open");
  });

  document.getElementById("event-reg-form").addEventListener("submit", submitRegistration);
}

function generateRegistrationNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `EVT-${year}-${rand}`;
}

async function submitRegistration(e) {
  e.preventDefault();
  const form = e.target;
  const note = document.getElementById("event-reg-note");
  const regNumber = generateRegistrationNumber();

  const payload = {
    event_id: selectedEvent.id,
    event_title: selectedEvent.title,
    full_name: form.full_name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim() || null,
    attendance_type: form.attendance_type.value,
    registration_number: regNumber,
  };

  const { error } = await supabaseClient.from("event_registrations").insert(payload);

  if (error) {
    note.textContent = "Something went wrong. Please try again.";
    note.style.color = "#B3261E";
    return;
  }

  document.getElementById("event-reg-modal-bg").classList.remove("open");
  form.reset();

  sendEmail(
    payload.email,
    `Registration Confirmed: ${payload.event_title}`,
    `<p>Dear ${payload.full_name},</p>
     <p>Your registration for <strong>${payload.event_title}</strong> is confirmed.</p>
     <p><strong>Registration Number:</strong> ${payload.registration_number}<br>
     <strong>Attendance Type:</strong> ${payload.attendance_type}</p>
     <p>You can view and print your event pass anytime at gmcoa-ug.org/event-pass.html using this registration number and email.</p>
     <p>See you there!</p>
     <p>— GMCOA-U Secretariat</p>`
  );
  showEventPass(payload);
}

function showEventPass(reg) {
  const container = document.getElementById("event-pass-container");
  container.style.display = "block";
  container.innerHTML = `
    <div class="membership-card" id="event-pass-card">
      <div class="mc-header">
        <img src="logo.png" alt="GMCOA-U">
        <div>
          <div class="mc-org">GMCOA-U</div>
          <div class="mc-sub">EVENT PASS</div>
        </div>
      </div>
      <div class="mc-name">${escapeHtmlE(reg.full_name)}</div>
      <div class="mc-number">${escapeHtmlE(reg.registration_number)}</div>
      <div class="mc-grid">
        <div><div class="mc-label">Event</div><div class="mc-value">${escapeHtmlE(reg.event_title)}</div></div>
        <div><div class="mc-label">Attendance</div><div class="mc-value">${escapeHtmlE(reg.attendance_type)}</div></div>
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

  container.scrollIntoView({ behavior: "smooth" });
}

function shiftMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById("cal-grid");
  const label = document.getElementById("cal-month-label");
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  label.textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const eventDays = new Set(
    allEvents
      .filter((e) => {
        const d = new Date(e.start_time);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .map((e) => new Date(e.start_time).getDate())
  );

  let html = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    .map((d) => `<div class="cal-day-label">${d}</div>`).join("");

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const hasEvent = eventDays.has(day);
    html += `<div class="cal-cell ${hasEvent ? "has-event" : ""}">${day}${hasEvent ? '<span class="dot"></span>' : ""}</div>`;
  }

  grid.innerHTML = html;
}

function escapeHtmlE(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
