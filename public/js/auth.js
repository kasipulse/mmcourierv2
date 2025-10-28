// public/js/auth.js

// ✅ Initialize Supabase client
const SUPABASE_URL = "https://YOUR-SUPABASE-PROJECT.supabase.co"; // Replace with your real project URL
const SUPABASE_KEY = "YOUR-ANON-PUBLIC-KEY"; // Replace with your anon key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Login function
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Login failed: " + error.message);
  } else {
    console.log("✅ Login successful:", data);
    // Store session and redirect
    localStorage.setItem("supabaseSession", JSON.stringify(data.session));
    window.location.href = "/dashboard.html";
  }
});

// ✅ Check login session on protected pages
async function checkLogin() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "/login.html";
  }
}

// ✅ Logout function
async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("supabaseSession");
  window.location.href = "/login.html";
}
