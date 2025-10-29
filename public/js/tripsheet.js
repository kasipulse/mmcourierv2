// Initialize Supabase
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjk0ODYsImV4cCI6MjA3NjgwNTQ4Nn0.kpguG-8Ap_icuh1FtF6c4k032qwIvoW6-KC_tX57644";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const userEmailEl = document.getElementById("user-email");
const parcelBody = document.getElementById("parcel-body");
const logoutBtn = document.getElementById("logout");

// Check if user is logged in
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  userEmailEl.textContent = `Logged in as: ${session.user.email}`;
  loadParcels(session.user.id);
}

// Logout
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

// Load parcels assigned to the driver
async function loadParcels(userId) {
  const { data, error } = await supabase
    .from("waybills")
    .select("*")
    .eq("driver_id", userId)
    .order("created_at", { ascending: true });

  if (error) return console.error(error);

  parcelBody.innerHTML = "";
  data.forEach(parcel => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">${parcel.tracking_number}</td>
      <td class="px-6 py-4 whitespace-nowrap">${parcel.recipient_name}</td>
      <td class="px-6 py-4 whitespace-nowrap">${parcel.recipient_address}</td>
      <td class="px-6 py-4 whitespace-nowrap" id="status-${parcel.id}">${parcel.status}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <button onclick="scanIn(${parcel.id})" class="bg-green-500 text-white px-3 py-1 rounded mr-1">Scan In</button>
        <button onclick="scanOut(${parcel.id})" class="bg-blue-500 text-white px-3 py-1 rounded">Scan Out</button>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <input type="file" id="pod-${parcel.id}" accept="image/*" />
        <button onclick="uploadPOD(${parcel.id})" class="bg-yellow-400 text-[#0a2b52] px-3 py-1 rounded mt-1">Upload</button>
        <div id="pod-preview-${parcel.id}" class="mt-2">
          ${parcel.pod_url ? `<a href="${parcel.pod_url}" target="_blank"><img src="${parcel.pod_url}" class="h-16 rounded" /></a>` : ""}
        </div>
      </td>
    `;
    parcelBody.appendChild(row);
  });
}

// Scan In
async function scanIn(parcelId) {
  await supabase
    .from("waybills")
    .update({ status: "Scanned In" })
    .eq("id", parcelId);
  document.getElementById(`status-${parcelId}`).textContent = "Scanned In";
}

// Scan Out
async function scanOut(parcelId) {
  await supabase
    .from("waybills")
    .update({ status: "Scanned Out" })
    .eq("id", parcelId);
  document.getElementById(`status-${parcelId}`).textContent = "Scanned Out";
}

// Upload POD to Cloudinary
async function uploadPOD(parcelId) {
  const fileInput = document.getElementById(`pod-${parcelId}`);
  const file = fileInput.files[0];
  if (!file) return alert("Please select a file first.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "YOUR_CLOUDINARY_UPLOAD_PRESET"); // Replace with your preset
  formData.append("folder", `pods/${parcelId}`); // optional folder structure

  try {
    const response = await fetch("https://api.cloudinary.com/v1_1/YOUR_CLOUDINARY_CLOUD_NAME/image/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.secure_url) {
      // Update waybill record in Supabase with POD URL
      const { error } = await supabase
        .from("waybills")
        .update({ pod_url: data.secure_url })
        .eq("id", parcelId);

      if (error) return console.error(error);

      // Update preview
      const previewEl = document.getElementById(`pod-preview-${parcelId}`);
      previewEl.innerHTML = `<a href="${data.secure_url}" target="_blank"><img src="${data.secure_url}" class="h-16 rounded" /></a>`;

      alert("POD uploaded successfully!");
    } else {
      console.error("Cloudinary upload failed", data);
    }
  } catch (err) {
    console.error(err);
    alert("POD upload failed.");
  }
}

checkAuth();
