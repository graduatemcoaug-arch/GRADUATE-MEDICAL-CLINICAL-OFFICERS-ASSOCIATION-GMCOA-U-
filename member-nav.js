document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return; // Leave the page's default public nav untouched.

  const currentPage = location.pathname.split("/").pop();

  const links = [
    ["dashboard.html", "My Dashboard"],
    ["cpd.html", "CPD Academy"],
    ["my-research.html", "My Research"],
    ["portfolio.html", "Portfolio"],
    ["forums.html", "Forums"],
    ["mentorship.html", "Mentorship"],
    ["messages.html", "Messages"],
  ];

  // dashboard.html already has its own collapsible left sidebar for its
  // internal sections — just keep its top nav links in sync, no second
  // sidebar needed there.
  if (document.getElementById("dash-tabs")) {
    const navLinks = document.getElementById("nav-links");
    if (navLinks) {
      navLinks.innerHTML = links
        .map(([href, label]) => `<a href="${href}"${href === currentPage ? ' style="font-weight:700;text-decoration:underline;"' : ""}>${label}</a>`)
        .join("");
    }
    return;
  }

  // Every other member page gets a real collapsible left sidebar.
  const mainContainer = document.querySelector(".page-hero + .section > .container");
  if (!mainContainer) return;

  const linkHtml = (href, label) =>
    `<a href="${href}" style="display:block;padding:9px 14px;border-radius:6px;font-size:0.88rem;text-decoration:none;color:${href === currentPage ? "#fff" : "var(--text)"};background:${href === currentPage ? "var(--deep-blue)" : "transparent"};font-weight:${href === currentPage ? "700" : "500"};">${label}</a>`;

  const sidebarHtml = `
    <button class="btn btn-outline" id="member-menu-toggle" style="color:var(--deep-blue);border-color:var(--deep-blue);margin-bottom:12px;">☰ Menu</button>
    <nav id="member-sidebar-nav" style="display:none;">
      ${links.map(([href, label]) => linkHtml(href, label)).join("")}
    </nav>`;

  const mount = document.createElement("div");
  mount.id = "member-sidebar-mount";
  mount.innerHTML = sidebarHtml;

  const wrapper = document.createElement("div");
  wrapper.id = "member-layout-wrapper";

  // Move all existing content of the main container into the wrapper,
  // alongside the new sidebar mount.
  const existingChildren = Array.from(mainContainer.childNodes);
  mainContainer.appendChild(wrapper);
  wrapper.appendChild(mount);
  const contentDiv = document.createElement("div");
  contentDiv.id = "member-content-area";
  existingChildren.forEach((node) => contentDiv.appendChild(node));
  wrapper.appendChild(contentDiv);

  function applyLayout() {
    if (window.innerWidth >= 900) {
      wrapper.style.display = "flex";
      wrapper.style.gap = "28px";
      wrapper.style.alignItems = "flex-start";
      mount.style.flexShrink = "0";
      contentDiv.style.flex = "1";
      contentDiv.style.minWidth = "0";
    } else {
      wrapper.style.display = "block";
      contentDiv.style.flex = "";
    }
  }
  applyLayout();
  window.addEventListener("resize", applyLayout);

  document.getElementById("member-menu-toggle").addEventListener("click", () => {
    const nav = document.getElementById("member-sidebar-nav");
    nav.style.display = nav.style.display === "none" ? "block" : "none";
  });

  // Close the menu immediately when a link is tapped (mobile), for
  // instant visual feedback before the page navigates away.
  document.querySelectorAll("#member-sidebar-nav a").forEach((a) => {
    a.addEventListener("click", () => {
      document.getElementById("member-sidebar-nav").style.display = "none";
    });
  });
});
