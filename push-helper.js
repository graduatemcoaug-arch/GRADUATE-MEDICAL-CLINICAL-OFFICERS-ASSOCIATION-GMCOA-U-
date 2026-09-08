const VAPID_PUBLIC_KEY = "BFKvcz-fp_vMluabsEXBhDgqqIhOpErrm7hq1jWj56XjmG_cwztDWI9ii-yOaTXEiSfQXVP2ckxp6Q7UetMaKJI";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function enablePushNotifications(email) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push notifications aren't supported on this browser.");
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Notification permission was not granted.");
    return false;
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const subJson = subscription.toJSON();

  const { error } = await supabaseClient.from("push_subscriptions").upsert({
    email,
    endpoint: subJson.endpoint,
    p256dh: subJson.keys.p256dh,
    auth: subJson.keys.auth,
  }, { onConflict: "endpoint" });

  if (error) {
    console.error("Failed to save push subscription:", error);
    return false;
  }

  return true;
}

async function sendPushToEmail(email, title, body, url) {
  const { data: subs } = await supabaseClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("email", email);

  if (!subs || subs.length === 0) return;

  for (const sub of subs) {
    try {
      await fetch("https://oxcefktkqqjxmekuyvwd.supabase.co/functions/v1/send-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ subscription: sub, title, body, url }),
      });
    } catch (err) {
      console.error("Push send failed:", err);
    }
  }
}
