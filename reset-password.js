document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("new-password-form").addEventListener("submit", updatePassword);
});

async function updatePassword(e) {
  e.preventDefault();
  const password = document.getElementById("new-password").value;
  const note = document.getElementById("reset-note");

  const { error } = await supabaseClient.auth.updateUser({ password });

  if (error) {
    note.textContent = "Failed to update password: " + error.message;
    note.style.color = "#B3261E";
    return;
  }

  note.textContent = "Password updated! Redirecting to login…";
  note.style.color = "var(--green)";
  setTimeout(() => { location.href = "portal.html"; }, 1500);
}
