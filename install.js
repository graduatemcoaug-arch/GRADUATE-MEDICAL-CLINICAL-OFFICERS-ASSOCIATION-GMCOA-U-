let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("android-install-btn").style.display = "inline-block";
  document.getElementById("android-manual-note").style.display = "none";
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("android-install-btn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      document.getElementById("android-install-btn").style.display = "none";
      document.getElementById("android-success-note").style.display = "block";
    }
    deferredPrompt = null;
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
});

window.addEventListener("appinstalled", () => {
  document.getElementById("android-success-note").style.display = "block";
});
