document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    const wrap = document.createElement("div");
    wrap.className = "pw-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-toggle-btn";
    btn.textContent = "Show";
    btn.setAttribute("aria-label", "Show password");

    btn.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "Hide" : "Show";
    });

    wrap.appendChild(btn);
  });
});
