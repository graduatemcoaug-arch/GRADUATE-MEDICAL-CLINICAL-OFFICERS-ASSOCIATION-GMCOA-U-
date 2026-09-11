document.addEventListener("DOMContentLoaded", () => {
  checkExistingSession();
  wireTabs();
  document.getElementById("login-form").addEventListener("submit", login);
  document.getElementById("signup-form").addEventListener("submit", signup);
});

function wireTabs() {
  document.getElementById("tab-login").addEventListener("click", () => switchTab("login"));
  document.getElementById("tab-signup").addEventListener("click", () => switchTab("signup"));
}

function switchTab(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  document.getElementById("login-box").style.display = tab === "login" ? "block" : "none";
  document.getElementById("signup-box").style.display = tab === "signup" ? "block" : "none";
}

async function checkExistingSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) routeToRole(session.user.email);
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const note = document.getElementById("login-note");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    note.textContent = "Login failed — check your email and password.";
    note.style.color = "#B3261E";
    return;
  }
  routeToRole(email);
}

async function signup(e) {
  e.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const note = document.getElementById("signup-note");

  const { data: roleRows, error: roleError } = await supabaseClient
    .from("staff_roles")
    .select("role")
    .ilike("email", email);

  if (roleError || !roleRows || roleRows.length === 0) {
    note.textContent = "This email isn't on the approved staff list. Contact the Secretariat if you believe this is an error.";
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
  document.getElementById("signup-form").reset();
  setTimeout(() => switchTab("login"), 1200);
}

async function routeToRole(email) {
  const { data: roleRows } = await supabaseClient
    .from("staff_roles")
    .select("role")
    .ilike("email", email);

  if (!roleRows || roleRows.length === 0) {
    document.getElementById("login-note").textContent = "Logged in, but no role is assigned to this account yet. Contact the Secretariat.";
    document.getElementById("login-note").style.color = "#B3261E";
    return;
  }

  // Everyone lands on the shared Overview page first — from there, the
  // sidebar (and each page's own role guard) governs where they can go.
  location.href = "overview.html";
}
