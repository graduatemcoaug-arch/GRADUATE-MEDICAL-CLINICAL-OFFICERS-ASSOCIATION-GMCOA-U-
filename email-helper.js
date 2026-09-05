async function sendEmail(to, subject, html) {
  try {
    const res = await fetch("https://oxcefktkqqjxmekuyvwd.supabase.co/functions/v1/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    const result = await res.json();
    if (!res.ok) {
      console.error("Email send failed:", result);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}
