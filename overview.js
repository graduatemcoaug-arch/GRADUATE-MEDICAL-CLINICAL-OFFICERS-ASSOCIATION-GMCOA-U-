document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) enforceRole(["Secretariat", "Finance", "Governance", "Education Committee", "Other Committee"], showDashboard);
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("login-error").textContent = "Login failed. Check your email and password.";
    return;
  }
  enforceRole(["Secretariat", "Finance", "Governance", "Education Committee", "Other Committee"], showDashboard);
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

function showDashboard() {
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-dashboard").style.display = "block";
  loadStats();
}

async function loadStats() {
  const { count: pendingApps } = await supabaseClient
    .from("membership_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "Pending");
  setStat("stat-pending-apps", pendingApps);

  const { count: openMessages } = await supabaseClient
    .from("message_threads")
    .select("*", { count: "exact", head: true })
    .eq("status", "Open");
  setStat("stat-open-messages", openMessages);

  const { count: upcomingEvents } = await supabaseClient
    .from("events")
    .select("*", { count: "exact", head: true })
    .gte("start_time", new Date().toISOString());
  setStat("stat-upcoming-events", upcomingEvents);

  const { count: pendingPayments } = await supabaseClient
    .from("payment_invoices")
    .select("*", { count: "exact", head: true })
    .eq("status", "Pending");
  setStat("stat-pending-payments", pendingPayments);

  const { count: activeMembers } = await supabaseClient
    .from("member_directory")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");
  setStat("stat-active-members", activeMembers);
}

function setStat(id, value) {
  document.getElementById(id).textContent = value !== null && value !== undefined ? value : "—";
}
