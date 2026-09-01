document.addEventListener("DOMContentLoaded", () => {
  wireContactForm();
  document.querySelector(".nav-toggle")?.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("open");
  });
});

function wireContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("[name=name]").value.trim();
    const email = form.querySelector("[name=email]").value.trim();
    const category = form.querySelector("[name=category]").value;
    const message = form.querySelector("[name=message]").value.trim();
    const status = document.getElementById("contact-form-note");
    const submitBtn = form.querySelector("button[type=submit]");

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    const { error } = await supabaseClient
      .from("contact_messages")
      .insert({ name, email, subject: category, message });

    submitBtn.disabled = false;
    submitBtn.textContent = "Send Message";

    if (error) {
      console.error("Contact form failed:", error);
      status.textContent = "Something went wrong sending your message. Please try again or email us directly.";
      status.style.color = "#B3261E";
    } else {
      status.textContent = "Message sent — thank you! We'll get back to you soon.";
      status.style.color = "var(--green)";
      form.reset();
    }
  });
}
