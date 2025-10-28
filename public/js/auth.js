// auth.js
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjk0ODYsImV4cCI6MjA3NjgwNTQ4Nn0.kpguG-8Ap_icuh1FtF6c4k032qwIvoW6-KC_tX57644";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("login-form");
const errorEl = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove("hidden");
  } else {
    window.location.href = "dashboard.html";
  }
});
