document.addEventListener("DOMContentLoaded", async () => {
  const navLinks = document.getElementById("nav-links");
  if (!navLinks) return;

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

  navLinks.innerHTML = links
    .map(([href, label]) => `<a href="${href}"${href === currentPage ? ' style="font-weight:700;text-decoration:underline;"' : ""}>${label}</a>`)
    .join("");
});
