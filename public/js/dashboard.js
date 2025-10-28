// dashboard.js
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjk0ODYsImV4cCI6MjA3NjgwNTQ4Nn0.kpguG-8Ap_icuh1FtF6c4k032qwIvoW6-KC_tX57644";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
  } else {
    document.getElementById("user-email").textContent = `Logged in as: ${session.user.email}`;
  }
})();

document.getElementById("logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});
