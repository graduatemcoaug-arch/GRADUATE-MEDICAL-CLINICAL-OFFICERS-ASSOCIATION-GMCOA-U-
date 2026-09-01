let allMembers = [];

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  document.getElementById("admin-login-form").addEventListener("submit", login);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("dir-search").addEventListener("input", renderDirectory);
  document.getElementById("dir-status-filter").addEventListener("change", renderDirectory);
});

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) showDashboard();
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  const note = document.getElementById("login-note");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    note.textContent = "Login failed — check your email and password.";
    note.style.color = "#B3261E";
    return;
  }
  showDashboard();
}

async function logout() {
  await supabaseClient.auth.signOut();
  document.getElementById("admin-dashboard").style.display = "none";
  document.getElementById("admin-login").style.display = "block";
}

function showDashboard() {
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-dashboard").style.display = "block";
  loadMembers();
}

async function loadMembers() {
  const { data, error } = await supabaseClient
    .from("member_directory")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Failed to load members:", error);
    document.getElementById("directory-list").innerHTML = `<p class="card-empty">Something went wrong loading members.</p>`;
    return;
  }

  allMembers = data || [];
  renderAnalytics();
  renderDirectory();
}

function renderAnalytics() {
  const box = document.getElementById("analytics-grid");
  const total = allMembers.length;
  const active = allMembers.filter((m) => m.status === "Active").length;
  const byCategory = {};
  const byRegion = {};

  allMembers.forEach((m) => {
    byCategory[m.membership_category] = (byCategory[m.membership_category] || 0) + 1;
    if (m.region) byRegion[m.region] = (byRegion[m.region] || 0) + 1;
  });

  box.innerHTML = `
    <div class="stat-tile"><div class="st-num">${total}</div><div class="st-lbl">Total Members</div></div>
    <div class="stat-tile"><div class="st-num">${active}</div><div class="st-lbl">Active</div></div>
    <div class="stat-tile"><div class="st-num">${Object.keys(byRegion).length}</div><div class="st-lbl">Regions Represented</div></div>
    <div class="stat-tile"><div class="st-num">${Object.keys(byCategory).length}</div><div class="st-lbl">Categories</div></div>`;

  const breakdownBox = document.getElementById("region-breakdown");
  const sortedRegions = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
  breakdownBox.innerHTML = sortedRegions.length
    ? sortedRegions.map(([region, count]) => `<div class="breakdown-row"><span>${escapeHtmlDir(region)}</span><span>${count}</span></div>`).join("")
    : `<p class="card-empty">No region data yet.</p>`;

  const catBox = document.getElementById("category-breakdown");
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  catBox.innerHTML = sortedCats.length
    ? sortedCats.map(([cat, count]) => `<div class="breakdown-row"><span>${escapeHtmlDir(cat)}</span><span>${count}</span></div>`).join("")
    : `<p class="card-empty">No category data yet.</p>`;
}

function renderDirectory() {
  const list = document.getElementById("directory-list");
  const searchVal = document.getElementById("dir-search").value.trim().toLowerCase();
  const statusVal = document.getElementById("dir-status-filter").value;

  let filtered = allMembers;
  if (searchVal) {
    filtered = filtered.filter((m) =>
      m.full_name.toLowerCase().includes(searchVal) ||
      m.membership_number.toLowerCase().includes(searchVal) ||
      (m.district || "").toLowerCase().includes(searchVal)
    );
  }
  if (statusVal) filtered = filtered.filter((m) => m.status === statusVal);

  if (filtered.length === 0) {
    list.innerHTML = `<p class="card-empty">No members match.</p>`;
    return;
  }

  list.innerHTML = filtered.map((m) => `
    <div class="dir-row">
      <div>
        <div class="dir-name">${escapeHtmlDir(m.full_name)}</div>
        <div class="dir-meta">${escapeHtmlDir(m.membership_number)} · ${escapeHtmlDir(m.membership_category)} · ${escapeHtmlDir(m.district || "—")}, ${escapeHtmlDir(m.region || "—")}</div>
      </div>
      <select class="status-select-member" data-id="${m.id}">
        <option value="Pending Review" ${m.status === "Pending Review" ? "selected" : ""}>Pending Review</option>
        <option value="Active" ${m.status === "Active" ? "selected" : ""}>Active</option>
        <option value="Suspended" ${m.status === "Suspended" ? "selected" : ""}>Suspended</option>
        <option value="Expired" ${m.status === "Expired" ? "selected" : ""}>Expired</option>
        <option value="Resigned" ${m.status === "Resigned" ? "selected" : ""}>Resigned</option>
        <option value="Retired" ${m.status === "Retired" ? "selected" : ""}>Retired</option>
        <option value="Deceased" ${m.status === "Deceased" ? "selected" : ""}>Deceased</option>
        <option value="Honorary" ${m.status === "Honorary" ? "selected" : ""}>Honorary</option>
      </select>
    </div>`).join("");

  document.querySelectorAll(".status-select-member").forEach((sel) => {
    sel.addEventListener("change", () => updateMemberStatus(sel.dataset.id, sel.value));
  });
}

async function updateMemberStatus(id, status) {
  const { error } = await supabaseClient
    .from("member_directory")
    .update({ status })
    .eq("id", id);

  if (error) { alert("Failed to update status: " + error.message); return; }
  loadMembers();
}

function escapeHtmlDir(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
