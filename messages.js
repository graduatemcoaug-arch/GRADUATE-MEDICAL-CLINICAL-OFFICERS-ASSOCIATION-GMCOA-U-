let currentEmail = null;
let currentThreadId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }
  currentEmail = session.user.email;

  loadThreads();
  document.getElementById("new-thread-form").addEventListener("submit", startThread);
  document.getElementById("reply-form").addEventListener("submit", sendReply);
  document.getElementById("back-to-threads").addEventListener("click", showThreadList);
});

async function loadThreads() {
  const list = document.getElementById("threads-list");
  list.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("message_threads")
    .select("*")
    .eq("member_email", currentEmail)
    .order("created_at", { ascending: false });

  if (error) { list.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }
  if (!data || data.length === 0) { list.innerHTML = `<p class="card-empty">No conversations yet — start one below.</p>`; return; }

  list.innerHTML = data.map((t) => `
    <div class="thread-row" data-id="${t.id}" data-subject="${escapeHtmlMsg(t.subject)}">
      <h4>${escapeHtmlMsg(t.subject)}</h4>
      <div class="tr-meta">${t.status} · ${new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
    </div>`).join("");

  document.querySelectorAll(".thread-row").forEach((row) => {
    row.addEventListener("click", () => openThread(row.dataset.id, row.dataset.subject));
  });
}

async function startThread(e) {
  e.preventDefault();
  const form = e.target;
  const { data: appRows } = await supabaseClient.from("membership_applications").select("full_name").eq("email", currentEmail).limit(1);
  const name = appRows && appRows[0] ? appRows[0].full_name : currentEmail;

  const { data: thread, error } = await supabaseClient.from("message_threads").insert({
    member_email: currentEmail,
    member_name: name,
    subject: form.subject.value.trim(),
  }).select().single();

  if (error) { alert("Failed: " + error.message); return; }

  await supabaseClient.from("thread_messages").insert({
    thread_id: thread.id,
    sender_email: currentEmail,
    sender_role: "Member",
    body: form.body.value.trim(),
  });

  form.reset();
  loadThreads();
}

async function openThread(threadId, subject) {
  currentThreadId = threadId;
  document.getElementById("thread-list-view").style.display = "none";
  document.getElementById("thread-detail-view").style.display = "block";
  document.getElementById("thread-detail-subject").textContent = subject;
  loadMessages();
}

function showThreadList() {
  document.getElementById("thread-detail-view").style.display = "none";
  document.getElementById("thread-list-view").style.display = "block";
  loadThreads();
}

async function loadMessages() {
  const box = document.getElementById("messages-box");
  box.innerHTML = `<p class="card-empty">Loading…</p>`;

  const { data, error } = await supabaseClient
    .from("thread_messages")
    .select("*")
    .eq("thread_id", currentThreadId)
    .order("created_at", { ascending: true });

  if (error) { box.innerHTML = `<p class="card-empty">Something went wrong.</p>`; return; }

  box.innerHTML = (data || []).map((m) => `
    <div class="msg-bubble ${m.sender_role === "Member" ? "member" : "secretariat"}">
      ${escapeHtmlMsg(m.body)}
      <div class="msg-meta">${m.sender_role} · ${new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
    </div>`).join("");
}

async function sendReply(e) {
  e.preventDefault();
  const form = e.target;
  const { error } = await supabaseClient.from("thread_messages").insert({
    thread_id: currentThreadId,
    sender_email: currentEmail,
    sender_role: "Member",
    body: form.body.value.trim(),
  });
  if (error) { alert("Failed: " + error.message); return; }
  form.reset();
  loadMessages();
}

function escapeHtmlMsg(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
