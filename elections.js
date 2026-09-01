document.addEventListener("DOMContentLoaded", () => {
  loadElections();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function loadElections() {
  const list = document.getElementById("elections-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("elections")
    .select("id,election_cycle,position_contested,election_type,voting_open_date,voting_close_date,status")
    .order("voting_open_date", { ascending: false });

  if (error) {
    console.error("Elections load failed:", error);
    list.innerHTML = `<p class="card-empty">Something went wrong loading elections.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No elections scheduled yet.</p>`;
    return;
  }

  list.innerHTML = data.map(electionCard).join("");
}

function electionCard(e) {
  const statusClass = e.status.toLowerCase().replace(/\s+/g, "-");
  const votingDates = e.voting_open_date
    ? `Voting: ${new Date(e.voting_open_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.voting_close_date ? new Date(e.voting_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}`
    : "Voting dates TBA";

  let actionBtn = `<a class="btn btn-outline" style="color:var(--deep-blue);border-color:var(--deep-blue);" href="candidates.html?election=${e.id}">View Candidates</a>`;
  if (e.status === "Nominations Open") {
    actionBtn = `<a class="btn btn-primary" href="nominate.html?election=${e.id}">Submit Nomination</a> ${actionBtn}`;
  } else if (e.status === "Voting Open") {
    actionBtn = `<a class="btn btn-primary" href="vote.html?election=${e.id}">Vote Now</a> ${actionBtn}`;
  } else if (e.status === "Closed" || e.status === "Results Declared") {
    actionBtn = `<a class="btn btn-primary" href="results.html?election=${e.id}">View Results</a>`;
  }

  return `
    <div class="election-card">
      <div class="election-top">
        <div class="card-category">${escapeHtmlEl(e.election_type || "")}</div>
        <span class="election-status-pill ${statusClass}">${escapeHtmlEl(e.status)}</span>
      </div>
      <h3>${escapeHtmlEl(e.position_contested)}</h3>
      <p style="color:var(--text-muted);font-size:0.88rem;">${escapeHtmlEl(e.election_cycle)}</p>
      <div class="election-meta">${votingDates}</div>
      <div style="margin-top:14px;">${actionBtn}</div>
    </div>`;
}

function escapeHtmlEl(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
