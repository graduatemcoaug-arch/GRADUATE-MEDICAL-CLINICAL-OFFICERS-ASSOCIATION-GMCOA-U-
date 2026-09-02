document.addEventListener("DOMContentLoaded", () => {
  checkExistingSession();
  wireTabs();
  document.getElementById("login-form").addEventListener("submit", login);
  document.getElementById("signup-form").addEventListener("submit", signup);
  document.getElementById("forgot-password-link").addEventListener("click", showResetForm);
  document.getElementById("reset-form").addEventListener("submit", sendResetLink);
  document.getElementById("reset-cancel").addEventListener("click", hideResetForm);
});

function showResetForm(e) {
  e.preventDefault();
  document.getElementById("login-form").style.display = "none";
  document.getElementById("reset-form").style.display = "block";
}

function hideResetForm() {
  document.getElementById("reset-form").style.display = "none";
  document.getElementById("login-form").style.display = "block";
}

async function sendResetLink(e) {
  e.preventDefault();
  const email = document.getElementById("reset-email").value.trim();
  const note = document.getElementById("portal-note");

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}${location.pathname.replace("portal.html", "reset-password.html")}`,
  });

  if (error) {
    note.textContent = "Failed to send reset link: " + error.message;
    note.style.color = "#B3261E";
    return;
  }

  note.textContent = "If an account exists with that email, a reset link has been sent.";
  note.style.color = "var(--green)";
  hideResetForm();
}

async function checkExistingSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) location.href = "dashboard.html";
}

function wireTabs() {
  document.getElementById("tab-login").addEventListener("click", () => switchTab("login"));
  document.getElementById("tab-signup").addEventListener("click", () => switchTab("signup"));
}

function switchTab(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  document.getElementById("login-form").style.display = tab === "login" ? "block" : "none";
  document.getElementById("signup-form").style.display = tab === "signup" ? "block" : "none";
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const note = document.getElementById("portal-note");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    note.textContent = "Login failed — check your email and password.";
    note.style.color = "#B3261E";
    return;
  }
  location.href = "dashboard.html";
}

async function signup(e) {
  e.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const note = document.getElementById("portal-note");

  if (password.length < 6) {
    note.textContent = "Password must be at least 6 characters.";
    note.style.color = "#B3261E";
    return;
  }

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    note.textContent = "Sign-up failed: " + error.message;
    note.style.color = "#B3261E";
    return;
  }

  note.textContent = "Account created! You can log in now.";
  note.style.color = "var(--green)";
}
