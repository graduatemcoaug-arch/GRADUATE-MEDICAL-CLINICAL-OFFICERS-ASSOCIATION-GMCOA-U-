document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("admin-dashboard");
  if (!dashboard) return;

  const currentPage = location.pathname.split("/").pop();

  const groups = [
    { label: "Overview", links: [["overview.html", "Overview"]] },
    { label: "Membership", links: [["admin.html", "Applications"], ["directory.html", "Directory"]] },
    { label: "Finance", links: [["finance.html", "Finance"]] },
    { label: "Governance", links: [["governance.html", "Governance"], ["election-admin.html", "Elections"], ["agm-admin.html", "AGM/EGM"]] },
    { label: "Engagement", links: [["events-admin.html", "Events"], ["secretariat.html", "Secretariat Tools"]] },
    { label: "Communications", links: [["comms.html", "Correspondence"]] },
  ];

  const linkHtml = (href, label) =>
    `<a href="${href}" style="display:block;padding:9px 14px;border-radius:6px;font-size:0.88rem;text-decoration:none;color:${href === currentPage ? "#fff" : "var(--text)"};background:${href === currentPage ? "var(--deep-blue)" : "transparent"};font-weight:${href === currentPage ? "700" : "500"};">${label}</a>`;

  const sidebarHtml = `
    <button class="btn btn-outline" id="admin-menu-toggle" style="color:var(--deep-blue);border-color:var(--deep-blue);margin-bottom:12px;">☰ Menu</button>
    <nav id="admin-sidebar-nav" style="display:none;">
      ${groups.map((g) => `
        <div style="margin-bottom:16px;">
          <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted);font-weight:700;padding:0 14px 6px;">${g.label}</div>
          ${g.links.map(([href, label]) => linkHtml(href, label)).join("")}
        </div>`).join("")}
    </nav>`;

  const mount = document.createElement("div");
  mount.id = "admin-sidebar-mount";
  mount.innerHTML = sidebarHtml;

  const wrapper = document.createElement("div");
  wrapper.id = "admin-layout-wrapper";
  dashboard.parentNode.insertBefore(wrapper, dashboard);
  wrapper.appendChild(mount);
  wrapper.appendChild(dashboard);

  function applyLayout() {
    if (window.innerWidth >= 900) {
      wrapper.style.display = "flex";
      wrapper.style.gap = "28px";
      wrapper.style.alignItems = "flex-start";
      mount.style.flexShrink = "0";
      dashboard.style.flex = "1";
      dashboard.style.minWidth = "0";
    } else {
      wrapper.style.display = "block";
      dashboard.style.flex = "";
    }
  }
  applyLayout();
  window.addEventListener("resize", applyLayout);

  document.getElementById("admin-menu-toggle").addEventListener("click", () => {
    const nav = document.getElementById("admin-sidebar-nav");
    nav.style.display = nav.style.display === "none" ? "block" : "none";
  });
});
