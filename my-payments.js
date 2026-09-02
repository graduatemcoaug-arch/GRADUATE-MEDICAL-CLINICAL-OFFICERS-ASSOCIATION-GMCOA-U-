document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "portal.html"; return; }

  const { data: app } = await supabaseClient
    .from("membership_applications")
    .select("membership_number")
    .eq("email", session.user.email)
    .maybeSingle();

  const list = document.getElementById("payments-list");

  if (!app || !app.membership_number) {
    list.innerHTML = `<p class="card-empty">No payment history yet — your membership number is assigned once your application is approved.</p>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from("finance_transactions")
    .select("amount,transaction_date,category,payment_method,transaction_reference")
    .eq("membership_number", app.membership_number)
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("Failed to load payment history:", error);
    list.innerHTML = `<p class="card-empty">Something went wrong loading your payment history.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="card-empty">No payments recorded yet. See <a href="subscribe.html">how to pay your subscription</a>.</p>`;
    return;
  }

  const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
  document.getElementById("payments-total").textContent = `UGX ${total.toLocaleString()}`;

  list.innerHTML = data.map((t) => `
    <div class="dash-row">
      <span class="dr-label">${new Date(t.transaction_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} — ${escapeHtmlP(t.category)}</span>
      <span class="dr-value">UGX ${Number(t.amount).toLocaleString()} · ${escapeHtmlP(t.payment_method || "")}</span>
    </div>`).join("");
});

function escapeHtmlP(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
