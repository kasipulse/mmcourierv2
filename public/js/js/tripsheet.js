// Initialize Supabase
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
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

// Upload POD
async function uploadPOD(parcelId) {
  const fileInput = document.getElementById(`pod-${parcelId}`);
  const file = fileInput.files[0];
  if (!file) return alert("Please select a file first.");

  // Upload to Supabase Storage (or Cloudinary)
  const { data, error } = await supabase.storage
    .from("pod-images")
    .upload(`${parcelId}/${file.name}`, file, { upsert: true });

  if (error) return console.error(error);
  
  // Update waybill record with POD URL
  const url = supabase.storage.from("pod-images").getPublicUrl(data.path).data.publicUrl;
  await supabase
    .from("waybills")
    .update({ pod_url: url })
    .eq("id", parcelId);

  alert("POD uploaded successfully!");
}

checkAuth();
