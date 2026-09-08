// Call this right after a successful login (or on page load if already
// logged in), passing the roles allowed on THIS page and a callback to
// run if they're permitted. Shows an Access Denied message otherwise.
async function enforceRole(allowedRoles, onAllowed) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: roleRows } = await supabaseClient
    .from("staff_roles")
    .select("role")
    .ilike("email", session.user.email);

  const myRoles = (roleRows || []).map((r) => r.role);
  const hasAccess = myRoles.some((r) => allowedRoles.includes(r));

  if (!hasAccess) {
    document.getElementById("admin-login").style.display = "none";
    const dashboard = document.getElementById("admin-dashboard");
    dashboard.style.display = "block";
    dashboard.innerHTML = `
      <div class="admin-login-box">
        <h3 style="margin:0 0 10px;">Access Denied</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;">Your account doesn't have permission to view this page.</p>
        <p style="margin-top:14px;"><a href="staff-portal.html">← Back to Staff Portal</a></p>
      </div>`;
    return;
  }

  onAllowed();
}
