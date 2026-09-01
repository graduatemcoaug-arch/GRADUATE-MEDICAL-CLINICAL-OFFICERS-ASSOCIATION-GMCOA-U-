let electionId = null;
let selectedCandidateId = null;

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  electionId = params.get("election");
  if (!electionId) {
    document.getElementById("ballot-status").textContent = "No election specified.";
    return;
  }
  checkAccess();
  document.getElementById("submit-vote-btn").addEventListener("click", submitVote);
});

async function checkAccess() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }
  loadBallot();
}

async function loadBallot() {
  const { data: election } = await supabaseClient
    .from("elections")
    .select("position_contested,election_cycle,status")
    .eq("id", electionId)
    .single();

  if (!election) {
    document.getElementById("ballot-status").textContent = "Election not found.";
    return;
  }

  document.getElementById("election-title").textContent = `${election.position_contested} — ${election.election_cycle}`;

  if (election.status !== "Voting Open") {
    document.getElementById("ballot-status").textContent = "Voting is not currently open for this position.";
    return;
  }

  const { data: alreadyVoted } = await supabaseClient.rpc("have_i_voted", { p_election_id: electionId });
  if (alreadyVoted) {
    document.getElementById("ballot-form-wrap").style.display = "none";
    document.getElementById("ballot-status").textContent = "You've already voted in this election. Thank you for participating.";
    document.getElementById("ballot-status").style.color = "var(--green)";
    return;
  }

  const { data: candidates, error } = await supabaseClient
    .from("candidates")
    .select("id,full_name,photo_url,manifesto")
    .eq("election_id", electionId)
    .eq("status", "Approved");

  if (error || !candidates || candidates.length === 0) {
    document.getElementById("ballot-status").textContent = "No approved candidates for this position.";
    return;
  }

  document.getElementById("ballot-options").innerHTML = candidates.map((c) => `
    <div class="ballot-option" data-id="${c.id}">
      ${c.photo_url ? `<img src="${c.photo_url}" alt="">` : `<div class="ballot-photo-placeholder"></div>`}
      <div>
        <div class="bo-name">${escapeHtmlV(c.full_name)}</div>
        <div class="bo-manifesto">${escapeHtmlV(c.manifesto || "")}</div>
      </div>
    </div>`).join("");

  document.querySelectorAll(".ballot-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".ballot-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      selectedCandidateId = opt.dataset.id;
      document.getElementById("submit-vote-btn").disabled = false;
    });
  });
}

async function submitVote() {
  if (!selectedCandidateId) return;
  if (!confirm("Submit your vote? This cannot be changed once submitted.")) return;

  const btn = document.getElementById("submit-vote-btn");
  btn.disabled = true;
  btn.textContent = "Submitting…";

  const { error } = await supabaseClient.rpc("cast_vote", {
    p_election_id: electionId,
    p_candidate_id: selectedCandidateId,
  });

  if (error) {
    document.getElementById("ballot-status").textContent = "Vote failed: " + error.message;
    document.getElementById("ballot-status").style.color = "#B3261E";
    btn.disabled = false;
    btn.textContent = "Submit Vote";
    return;
  }

  document.getElementById("ballot-form-wrap").style.display = "none";
  document.getElementById("ballot-status").textContent = "Your vote has been recorded. Thank you for participating.";
  document.getElementById("ballot-status").style.color = "var(--green)";
}

function escapeHtmlV(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
