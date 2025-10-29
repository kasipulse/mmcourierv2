// dashboard.js

// --- Supabase Configuration ---
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co"; // replace with your own if different
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"; // replace with your actual anon key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Check Auth Session on Page Load ---
async function checkAuth() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error fetching session:", error);
    return;
  }

  const session = data?.session;

  if (!session) {
    // No user logged in — redirect
    window.location.href = "login.html";
  } else {
    // User logged in — display email
    const email = session.user.email;
    document.getElementById("user-email").textContent = `Logged in as ${email}`;
  }
}

// --- Logout Function ---
document.getElementById("logout").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("Error logging out: " + error.message);
  } else {
    window.location.href = "login.html";
  }
});

// --- Initialize Page ---
checkAuth();
