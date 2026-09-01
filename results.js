document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const electionId = params.get("election");
  if (!electionId) {
    document.getElementById("results-list").innerHTML = `<p class="card-empty">No election specified.</p>`;
    return;
  }
  loadResults(electionId);
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function loadResults(electionId) {
  const { data: election } = await supabaseClient
    .from("elections")
    .select("position_contested,election_cycle,status")
    .eq("id", electionId)
    .single();

  if (election) {
    document.getElementById("election-title").textContent = `${election.position_contested} — ${election.election_cycle}`;
  }

  const list = document.getElementById("results-list");

  const { data, error } = await supabaseClient.rpc("get_election_results", { p_election_id: electionId });

  if (error) {
    list.innerHTML = `<p class="card-empty">Something went wrong loading results.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">Results have not been declared for this election yet.</p>`;
    return;
  }

  const total = data.reduce((sum, r) => sum + Number(r.vote_count), 0);

  list.innerHTML = data.map((r) => {
    const pct = total > 0 ? Math.round((Number(r.vote_count) / total) * 100) : 0;
    return `
      <div class="results-bar-row">
        <div class="results-bar-label"><span>${escapeHtmlR(r.candidate_name)}</span><span>${r.vote_count} votes (${pct}%)</span></div>
        <div class="results-bar-track"><div class="results-bar-fill" style="width:${pct}%;"></div></div>
      </div>`;
  }).join("") + `<p style="margin-top:16px;color:var(--text-muted);font-size:0.88rem;">Total votes cast: ${total}</p>`;
}

function escapeHtmlR(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
