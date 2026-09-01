let electionId = null;

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  electionId = params.get("election");
  if (!electionId) {
    document.getElementById("nom-status").textContent = "No election specified. Go back to the Elections page and choose one.";
    return;
  }
  checkAccess();
  document.getElementById("nom-form").addEventListener("submit", submitNomination);
});

async function checkAccess() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }
  loadElectionInfo();
}

async function loadElectionInfo() {
  const { data, error } = await supabaseClient
    .from("elections")
    .select("election_cycle,position_contested,status")
    .eq("id", electionId)
    .single();

  if (error || !data) {
    document.getElementById("nom-status").textContent = "Election not found.";
    return;
  }

  document.getElementById("election-title").textContent = `${data.position_contested} — ${data.election_cycle}`;

  if (data.status !== "Nominations Open") {
    document.getElementById("nom-form").style.display = "none";
    document.getElementById("nom-status").textContent = "Nominations are not currently open for this position.";
  }
}

function generateNominationRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GMCOA-NOM-${year}-${rand}`;
}

async function submitNomination(e) {
  e.preventDefault();
  const form = e.target;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const submitBtn = form.querySelector("button[type=submit]");
  const status = document.getElementById("nom-status");

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  let photoUrl = null;
  const photoFile = form.photo.files[0];
  if (photoFile) {
    const path = `${electionId}/${session.user.email}-${photoFile.name}`;
    const { error: uploadError } = await supabaseClient.storage.from("candidate-photos").upload(path, photoFile, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabaseClient.storage.from("candidate-photos").getPublicUrl(path);
      photoUrl = urlData.publicUrl;
    }
  }

  const payload = {
    election_id: electionId,
    nomination_reference: generateNominationRef(),
    full_name: form.full_name.value.trim(),
    owner_email: session.user.email,
    photo_url: photoUrl,
    biography: form.biography.value.trim(),
    professional_experience: form.professional_experience.value.trim() || null,
    manifesto: form.manifesto.value.trim(),
  };

  const { error } = await supabaseClient.from("candidates").insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = "Submit Nomination";

  if (error) {
    status.textContent = "Something went wrong: " + error.message;
    status.style.color = "#B3261E";
    return;
  }

  form.style.display = "none";
  status.textContent = `Nomination submitted! Reference: ${payload.nomination_reference}. The Election Committee will review it.`;
  status.style.color = "var(--green)";
}
