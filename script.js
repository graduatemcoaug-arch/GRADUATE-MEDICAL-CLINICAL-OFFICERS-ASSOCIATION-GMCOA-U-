document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadNews();
  loadEvents();
  loadLeadership();
  wireNavToggle();
  wireNewsletterForm();
});

function wireNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => links.classList.toggle("open"));
}

async function loadStats() {
  const grid = document.getElementById("stats-grid");
  if (!grid) return;
  const { data, error } = await supabaseClient
    .from("site_stats")
    .select("key,label,value")
    .order("key");

  if (error || !data) {
    console.error("Stats load failed:", error);
    return;
  }

  grid.innerHTML = data
    .map(
      (s) => `
      <div class="stat-cell">
        <div class="stat-value">${Number(s.value).toLocaleString()}</div>
        <div class="stat-label">${escapeHtml(s.label)}</div>
      </div>`
    )
    .join("");
}

async function loadNews() {
  const grid = document.getElementById("news-grid");
  if (!grid) return;
  const { data, error } = await supabaseClient
    .from("news")
    .select("title,slug,category,excerpt,image_url,published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("News load failed:", error);
    grid.innerHTML = `<p class="card-empty">Couldn't load news: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="card-empty">No news published yet — add rows to the "news" table in Supabase.</p>`;
    return;
  }

  grid.innerHTML = data
    .map(
      (n) => `
      <article class="card">
        <div class="card-media" style="${n.image_url ? `background-image:url('${n.image_url}');background-size:cover;background-position:center;` : ""}"></div>
        <div class="card-body">
          <div class="card-category">${escapeHtml(n.category)}</div>
          <h3>${escapeHtml(n.title)}</h3>
          <p>${escapeHtml(n.excerpt || "")}</p>
        </div>
      </article>`
    )
    .join("");
}

async function loadEvents() {
  const list = document.getElementById("events-list");
  if (!list) return;
  const { data, error } = await supabaseClient
    .from("events")
    .select("title,start_time,location,is_virtual")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(4);

  if (error) {
    console.error("Events load failed:", error);
    list.innerHTML = `<p class="card-empty">Couldn't load events: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No upcoming events yet — add rows to the "events" table in Supabase.</p>`;
    return;
  }

  list.innerHTML = data
    .map((e) => {
      const d = new Date(e.start_time);
      const day = d.getDate();
      const mon = d.toLocaleString("en-US", { month: "short" });
      const where = e.is_virtual ? "Virtual" : e.location || "";
      return `
        <div class="event-row">
          <div class="event-date"><span class="day">${day}</span><span class="mon">${mon}</span></div>
          <div>
            <div class="event-title">${escapeHtml(e.title)}</div>
            <div class="event-meta">${escapeHtml(where)}</div>
          </div>
        </div>`;
    })
    .join("");
}

async function loadLeadership() {
  const grid = document.getElementById("leadership-grid");
  if (!grid) return;
  const { data, error } = await supabaseClient
    .from("leadership")
    .select("full_name,position,photo_url,bio,qualifications")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    console.error("Leadership load failed:", error);
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="card-empty">Leadership profiles coming soon — add rows to the "leadership" table in Supabase.</p>`;
    return;
  }

  grid.innerHTML = data
    .map(
      (p) => `
      <div class="leader-card">
        <div class="leader-photo" style="${p.photo_url ? `background-image:url('${p.photo_url}');background-size:cover;background-position:center;` : ""}"></div>
        <h3>${escapeHtml(p.full_name)}</h3>
        <div class="leader-position">${escapeHtml(p.position)}</div>
        ${p.qualifications ? `<div class="leader-quals">${escapeHtml(p.qualifications)}</div>` : ""}
        ${p.bio ? `<p class="leader-bio">${escapeHtml(p.bio)}</p>` : ""}
      </div>`
    )
    .join("");
}


  const form = document.getElementById("newsletter-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("[name=name]").value.trim();
    const email = form.querySelector("[name=email]").value.trim();
    const status = form.querySelector(".form-note");

    const { error } = await supabaseClient
      .from("newsletter_subscribers")
      .insert({ name, email });

    if (error) {
      status.textContent = error.code === "23505"
        ? "You're already subscribed — thank you!"
        : "Something went wrong. Please try again.";
    } else {
      status.textContent = "Subscribed! Thank you for joining our mailing list.";
      form.reset();
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
