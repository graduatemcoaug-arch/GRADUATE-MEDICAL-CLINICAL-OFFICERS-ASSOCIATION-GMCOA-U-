document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const electionId = params.get("election");
  if (!electionId) {
    document.getElementById("candidates-list").innerHTML = `<p class="card-empty">No election specified.</p>`;
    return;
  }
  loadCandidates(electionId);
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function loadCandidates(electionId) {
  const { data: election } = await supabaseClient
    .from("elections")
    .select("position_contested,election_cycle")
    .eq("id", electionId)
    .single();

  if (election) {
    document.getElementById("election-title").textContent = `${election.position_contested} — ${election.election_cycle}`;
  }

  const list = document.getElementById("candidates-list");
  const { data, error } = await supabaseClient
    .from("candidates")
    .select("full_name,photo_url,biography,professional_experience,manifesto")
    .eq("election_id", electionId)
    .eq("status", "Approved");

  if (error) {
    list.innerHTML = `<p class="card-empty">Something went wrong loading candidates.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No approved candidates yet for this position.</p>`;
    return;
  }

  list.innerHTML = `<div class="card-grid">${data.map(candidateCard).join("")}</div>`;
}

function candidateCard(c) {
  return `
    <div class="candidate-card">
      <div class="candidate-photo" style="${c.photo_url ? `background-image:url('${c.photo_url}');background-size:cover;background-position:center;` : ""}"></div>
      <h4>${escapeHtmlCd(c.full_name)}</h4>
      <p><strong>Bio:</strong> ${escapeHtmlCd(c.biography || "")}</p>
      ${c.professional_experience ? `<p><strong>Experience:</strong> ${escapeHtmlCd(c.professional_experience)}</p>` : ""}
      <p><strong>Manifesto:</strong> ${escapeHtmlCd(c.manifesto || "")}</p>
    </div>`;
}

function escapeHtmlCd(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
