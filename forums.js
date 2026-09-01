let currentCategoryId = "";
let currentEmail = null;

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentEmail = session?.user?.email || null;
  if (currentEmail) document.getElementById("new-post-box").style.display = "block";

  loadCategories();
  loadPosts();
  document.getElementById("post-form").addEventListener("submit", createPost);
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

async function loadCategories() {
  const { data } = await supabaseClient.from("forum_categories").select("id,name").order("name");
  const select = document.getElementById("category-filter");
  const postSelect = document.getElementById("post-category");
  (data || []).forEach((c) => {
    select.innerHTML += `<option value="${c.id}">${escapeHtmlFo(c.name)}</option>`;
    postSelect.innerHTML += `<option value="${c.id}">${escapeHtmlFo(c.name)}</option>`;
  });
  select.addEventListener("change", () => { currentCategoryId = select.value; loadPosts(); });
}

async function loadPosts() {
  const list = document.getElementById("posts-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  let query = supabaseClient.from("forum_posts").select("*").eq("is_hidden", false).order("created_at", { ascending: false });
  if (currentCategoryId) query = query.eq("category_id", currentCategoryId);

  const { data, error } = await query;
  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No discussions yet — be the first to post.</p>`; return; }

  for (const post of data) {
    const { data: replies } = await supabaseClient.from("forum_replies").select("*").eq("post_id", post.id).eq("is_hidden", false).order("created_at");
    const div = document.createElement("div");
    div.className = "forum-post";
    div.innerHTML = `
      <h4>${escapeHtmlFo(post.title)}</h4>
      <div class="fp-meta">${escapeHtmlFo(post.author_name)} · ${new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      <p>${escapeHtmlFo(post.body)}</p>
      <div class="replies"></div>
      ${currentEmail ? `<form class="reply-form" data-post="${post.id}" style="margin-top:12px;display:flex;gap:8px;">
        <input type="text" placeholder="Write a reply…" required style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);">
        <button class="btn btn-primary" type="submit" style="padding:8px 16px;">Reply</button>
      </form>` : ""}`;

    const repliesBox = div.querySelector(".replies");
    (replies || []).forEach((r) => {
      repliesBox.innerHTML += `<div class="forum-reply"><strong>${escapeHtmlFo(r.author_name)}:</strong> ${escapeHtmlFo(r.body)}</div>`;
    });

    const replyForm = div.querySelector(".reply-form");
    if (replyForm) {
      replyForm.addEventListener("submit", (e) => submitReply(e, post.id));
    }

    list.appendChild(div);
  }
}

async function createPost(e) {
  e.preventDefault();
  const form = e.target;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const payload = {
    category_id: form.category_id.value,
    author_email: session.user.email,
    author_name: form.author_name.value.trim() || session.user.email,
    title: form.title.value.trim(),
    body: form.body.value.trim(),
  };

  const { error } = await supabaseClient.from("forum_posts").insert(payload);
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadPosts();
}

async function submitReply(e, postId) {
  e.preventDefault();
  const input = e.target.querySelector("input");
  const { data: { session } } = await supabaseClient.auth.getSession();

  const { error } = await supabaseClient.from("forum_replies").insert({
    post_id: postId,
    author_email: session.user.email,
    author_name: session.user.email,
    body: input.value.trim(),
  });

  if (error) { alert("Failed: " + error.message); return; }
  loadPosts();
}

function escapeHtmlFo(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
