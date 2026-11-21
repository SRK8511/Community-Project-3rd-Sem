// =========================================
// 1. AUTO-GENERATE REPORT ID & DEFAULT DATE/TIME
// =========================================
const reportForm = document.getElementById("reportForm");
const reportIdInput = document.getElementById("reportId");
const categorySelect = document.getElementById("category");
const departmentSelect = document.getElementById("department");
const descriptionInput = document.getElementById("description");
const charCount = document.getElementById("charCount");
const anonymousCheckbox = document.getElementById("anonymous");
const contactFieldsGrid = document.getElementById("contactFieldsGrid");

function generateReportId() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `CE-2026-${randomNum}`;
}

function setDefaultDateTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  document.getElementById("issueDate").value = `${yyyy}-${mm}-${dd}`;
  document.getElementById("issueTime").value = `${hh}:${min}`;
}

// Map Category -> Responsible Department automatically
const CATEGORY_TO_DEPT = {
  "Roads": "Road Maintenance Department",
  "Sanitation": "Sanitation Department",
  "Water Supply": "Water Supply Department",
  "Electricity": "Electricity Department",
  "Public Safety": "Public Safety Department",
  "Other": "Other Department"
};

categorySelect.addEventListener("change", () => {
  const matchedDept = CATEGORY_TO_DEPT[categorySelect.value];
  if (matchedDept) {
    departmentSelect.value = matchedDept;
  }
});

// =========================================
// 2. SMOOTH MOVEMENT FROM INDEX.HTML (?category=...)
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  reportIdInput.value = generateReportId();
  setDefaultDateTime();

  // Check if user clicked a category card on index.html
  const params = new URLSearchParams(window.location.search);
  const incomingCategory = params.get("category");

  if (incomingCategory && CATEGORY_TO_DEPT[incomingCategory]) {
    categorySelect.value = incomingCategory;
    departmentSelect.value = CATEGORY_TO_DEPT[incomingCategory];

    const notice = document.getElementById("prefillNotice");
    if (notice) notice.style.display = "inline-flex";

    // Focus directly on the Issue Title so the user can start typing immediately
    document.getElementById("title").focus();
  }
});

// Live character count for Description
descriptionInput.addEventListener("input", () => {
  charCount.textContent = `${descriptionInput.value.length} / 1000 characters`;
});

// Anonymous Toggle disables/dims Contact Fields
anonymousCheckbox.addEventListener("change", () => {
  const inputs = contactFieldsGrid.querySelectorAll("input");
  inputs.forEach(input => {
    if (anonymousCheckbox.checked) {
      input.value = "";
      input.disabled = true;
    } else {
      input.disabled = false;
    }
  });
  contactFieldsGrid.style.opacity = anonymousCheckbox.checked ? "0.45" : "1";
});

// =========================================
// 3. INTERACTIVE MAP PICKER & GPS LOCATION
// =========================================
let pickerMap = null;
let pickerMarker = null;
const latInput = document.getElementById("latitude");
const lngInput = document.getElementById("longitude");
const selectedLocationText = document.getElementById("selectedLocation");
const mapWrapper = document.getElementById("mapPickerWrapper");

// Default coordinates (Bengaluru Center with slight random offset if user doesn't pick)
let currentLat = 12.9352 + (Math.random() - 0.5) * 0.04;
let currentLng = 77.5800 + (Math.random() - 0.5) * 0.04;
latInput.value = currentLat.toFixed(5);
lngInput.value = currentLng.toFixed(5);

function updateCoordinates(lat, lng, labelText) {
  currentLat = lat;
  currentLng = lng;
  latInput.value = lat.toFixed(5);
  lngInput.value = lng.toFixed(5);
  selectedLocationText.innerHTML = `✅ <strong>${labelText}:</strong> Latitude ${lat.toFixed(4)}, Longitude ${lng.toFixed(4)}`;
  selectedLocationText.classList.add("location-confirmed");
}

document.getElementById("selectMapLocation").addEventListener("click", () => {
  const isHidden = mapWrapper.style.display === "none";
  mapWrapper.style.display = isHidden ? "block" : "none";

  if (isHidden) {
    if (!pickerMap) {
      pickerMap = L.map("pickerMap").setView([currentLat, currentLng], 13);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
        maxZoom: 19,
        attribution: "&Tiles &copy; Esri"
      }).addTo(pickerMap);

      pickerMarker = L.marker([currentLat, currentLng]).addTo(pickerMap);

      pickerMap.on("click", (e) => {
        const { lat, lng } = e.latlng;
        pickerMarker.setLatLng([lat, lng]);
        updateCoordinates(lat, lng, "Pin dropped on Map");
      });
    }
    setTimeout(() => pickerMap.invalidateSize(), 150);
  }
});

document.getElementById("useGpsBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  selectedLocationText.textContent = "⏳ Fetching your exact GPS coordinates...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      updateCoordinates(lat, lng, "GPS Location Captured");
      if (pickerMap && pickerMarker) {
        pickerMap.setView([lat, lng], 15);
        pickerMarker.setLatLng([lat, lng]);
      }
    },
    () => {
      alert("Unable to retrieve GPS. Please use 'Select Location on Map' instead.");
    }
  );
});

// =========================================
// 4. MULTIPLE PHOTO UPLOAD & COMPRESSED PREVIEW
// =========================================
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");
let compressedImageBase64 = "https://placehold.co/600x400?text=Reported+Issue";

photoInput.addEventListener("change", (e) => {
  photoPreview.innerHTML = "";
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      // Compress the first image via canvas so it fits cleanly in localStorage/Firestore
      if (index === 0) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 600;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          compressedImageBase64 = canvas.toDataURL("image/jpeg", 0.75);
        };
        img.src = event.target.result;
      }

      // Render thumbnail card
      const thumb = document.createElement("div");
      thumb.className = "preview-thumb";
      thumb.innerHTML = `
        <img src="${event.target.result}" alt="Upload preview">
        <span>${file.name}</span>
      `;
      photoPreview.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  });
});

// =========================================
// 5. SUBMIT REPORT -> SAVE & REDIRECT TO DASHBOARD
// =========================================
reportForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const saved = localStorage.getItem("civiceye_reports");
  const reports = saved ? JSON.parse(saved) : [];

  const newReport = {
    id: reportIdInput.value,
    title: document.getElementById("title").value.trim(),
    category: categorySelect.value,
    department: departmentSelect.value,
    description: descriptionInput.value.trim(),
    locationName: document.getElementById("location").value.trim(),
    lat: parseFloat(latInput.value) || 12.9352,
    lng: parseFloat(lngInput.value) || 77.5800,
    issueDate: document.getElementById("issueDate").value,
    issueTime: document.getElementById("issueTime").value,
    reporterName: anonymousCheckbox.checked ? "Anonymous Citizen" : (document.getElementById("reporterName").value.trim() || "Citizen"),
    imageUrl: compressedImageBase64,
    status: "Pending",
    upvotes: 1,
    createdAt: Date.now()
  };

  reports.unshift(newReport);
  localStorage.setItem("civiceye_reports", JSON.stringify(reports));

  alert(`✅ Report ${newReport.id} submitted! Redirecting to Public Dashboard...`);
  window.location.href = "dashboard.html";
});

reportForm.addEventListener("reset", () => {
  setTimeout(() => {
    reportIdInput.value = generateReportId();
    setDefaultDateTime();
    photoPreview.innerHTML = "";
    charCount.textContent = "0 / 1000 characters";
    contactFieldsGrid.style.opacity = "1";
  }, 10);
});