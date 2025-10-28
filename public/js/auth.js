// ✅ Initialize Supabase client
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";  // replace
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjk0ODYsImV4cCI6MjA3NjgwNTQ4Nn0.kpguG-8Ap_icuh1FtF6c4k032qwIvoW6-KC_tX57644"; // replace
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Handle login
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("❌ Login failed: " + error.message);
  } else {
    console.log("✅ Login success:", data);
    localStorage.setItem("supabaseSession", JSON.stringify(data.session));
    window.location.href = "dashboard.html";
  }
});

// ✅ Protect pages
async function checkLogin() {
  const { data, error } = await supabase.auth.getSession();
  console.log("Session check:", data.session);

  // if there’s no active session, redirect
  if (!data.session) {
    window.location.href = "login.html";
  }
}

// ✅ Logout
async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("supabaseSession");
  window.location.href = "login.html";
}
