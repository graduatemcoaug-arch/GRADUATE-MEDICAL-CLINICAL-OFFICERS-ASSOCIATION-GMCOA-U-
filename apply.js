document.addEventListener("DOMContentLoaded", () => {
  wireApplicationForm();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `GMCOA-${year}-${rand}`;
}

async function uploadDoc(file, trackingNumber, fieldName) {
  if (!file) return null;
  const path = `${trackingNumber}/${fieldName}-${file.name}`;
  const { error } = await supabaseClient.storage
    .from("application-documents")
    .upload(path, file);
  if (error) {
    console.error(`Upload failed for ${fieldName}:`, error);
    return null;
  }
  return path;
}

function wireApplicationForm() {
  const form = document.getElementById("apply-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    const status = document.getElementById("apply-form-note");

    if (!form.declaration_accurate.checked || !form.declaration_agree_constitution.checked || !form.declaration_consent_data.checked) {
      status.textContent = "Please confirm all three declaration statements before submitting.";
      status.style.color = "#B3261E";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading documents…";

    const trackingNumber = generateTrackingNumber();

    const fileFields = [
      ["passport_photo", "passport_photo_path"],
      ["national_id", "national_id_path"],
      ["academic_certificates", "academic_certificates_path"],
      ["degree_transcript", "degree_transcript_path"],
      ["registration_certificate", "registration_certificate_path"],
      ["practising_licence", "practising_licence_path"],
      ["cv", "cv_path"],
    ];

    const uploadedPaths = {};
    for (const [inputName, columnName] of fileFields) {
      const fileInput = form.querySelector(`[name=${inputName}]`);
      const file = fileInput?.files?.[0];
      if (file) {
        uploadedPaths[columnName] = await uploadDoc(file, trackingNumber, inputName);
      }
    }

    submitBtn.textContent = "Submitting…";

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    fileFields.forEach(([inputName]) => delete payload[inputName]); // remove raw File entries
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });

    payload.tracking_number = trackingNumber;
    payload.declaration_accurate = true;
    payload.declaration_agree_constitution = true;
    payload.declaration_consent_data = true;
    Object.assign(payload, uploadedPaths);

    const { error } = await supabaseClient
      .from("membership_applications")
      .insert(payload);

    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Application";

    if (error) {
      console.error("Application submit failed:", error);
      status.textContent = "Something went wrong submitting your application. Please try again or email us directly.";
      status.style.color = "#B3261E";
      return;
    }

    form.style.display = "none";
    status.textContent = "";
    document.getElementById("tracking-result").style.display = "block";
    document.getElementById("tracking-number-display").textContent = trackingNumber;
    document.getElementById("tracking-result").scrollIntoView({ behavior: "smooth" });
  });
}
