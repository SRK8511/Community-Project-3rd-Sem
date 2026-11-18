// =========================================
// CIVICEYE: INTERACTIVE MAP & EXPLORER (map.js)
// Synced with the upgraded map.html & dashboard.js
// =========================================

// 1. FALLBACK DUMMY DATA (Synced with dashboard.js if localStorage is empty)
const DEFAULT_MAP_REPORTS = [
  {
    id: "CE-2026-1042",
    title: "Deep pothole near Banashankari signal",
    category: "Roads",
    department: "Road Maintenance Department",
    description: "Large waterlogged pothole near the bus stop causing two-wheelers to swerve dangerously during peak traffic.",
    locationName: "Banashankari Bus Stand Signal, Bengaluru",
    lat: 12.9255,
    lng: 77.5468,
    reporterName: "Karthik R.",
    imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700",
    status: "Pending",
    progressPercent: 18,
    upvotes: 14,
    isBanned: false,
    banReason: "",
    comments: [
      { author: "Priya M.", text: "Saw two bikers nearly fall here yesterday evening!", time: "2h ago" },
      { author: "Suresh K.", text: "Upvoted. Needs urgent patching before heavy rain.", time: "1h ago" }
    ],
    createdAt: Date.now() - 86400000
  },
  {
    id: "CE-2026-1038",
    title: "Streetlight stretch not working on 80 Feet Road",
    category: "Electricity",
    department: "Electricity Department",
    description: "Complete stretch near the park junction is pitch dark after 7 PM for the last 4 days, making it unsafe for pedestrians.",
    locationName: "80 Feet Road, Banashankari Stage II",
    lat: 12.9081,
    lng: 77.5856,
    reporterName: "Ananya S.",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700",
    status: "In Progress",
    progressPercent: 62,
    upvotes: 19,
    isBanned: false,
    banReason: "",
    comments: [
      { author: "BESCOM Lineman Desk", text: "Faulty cable identified. Replacement scheduled.", time: "5h ago" }
    ],
    createdAt: Date.now() - 172800000
  },
  {
    id: "CE-2026-1019",
    title: "Uncollected garbage pile near neighbourhood park gate",
    category: "Sanitation",
    department: "Sanitation Department",
    description: "Overflowing waste bins attracting stray animals and blocking half the pedestrian footpath.",
    locationName: "Jayanagar 4th Block Park Entrance",
    lat: 12.9299,
    lng: 77.5824,
    reporterName: "Rahul V.",
    imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=700",
    status: "Resolved",
    progressPercent: 96,
    upvotes: 27,
    isBanned: false,
    banReason: "",
    comments: [
      { author: "Meera N.", text: "Cleared this morning by BBMP marshals! Great job.", time: "1d ago" }
    ],
    createdAt: Date.now() - 345600000
  }
];

// =========================================
// 2. STORAGE & CATEGORY NORMALIZATION HELPERS
// =========================================
function loadMapReports() {
  const saved = localStorage.getItem("civiceye_reports");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (err) {
      console.error("Error parsing civiceye_reports:", err);
    }
  }
  localStorage.setItem("civiceye_reports", JSON.stringify(DEFAULT_MAP_REPORTS));
  return DEFAULT_MAP_REPORTS;
}

function saveMapReports(reportsArray) {
  localStorage.setItem("civiceye_reports", JSON.stringify(reportsArray));
}

function getUpvotedIds() {
  const saved = localStorage.getItem("civiceye_upvoted_ids");
  return saved ? JSON.parse(saved) : [];
}

function saveUpvotedIds(ids) {
  localStorage.setItem("civiceye_upvoted_ids", JSON.stringify(ids));
}

function toMapHtmlCategory(cat) {
  const raw = (cat || "").trim();
  const map = {
    "Roads": "Road Damage",
    "Road Damage": "Road Damage",
    "Sanitation": "Garbage",
    "Garbage": "Garbage",
    "Electricity": "Street Lights",
    "Street Lights": "Street Lights",
    "Water Supply": "Water Leakage",
    "Water Leakage": "Water Leakage",
    "Drainage": "Drainage",
    "Public Safety": "Public Safety",
    "Other": "Other"
  };
  return map[raw] || "Other";
}

function matchesCategoryFilter(reportCategory, selectedDropdownValue) {
  if (!selectedDropdownValue || selectedDropdownValue === "") return true;
  const mapped = toMapHtmlCategory(reportCategory);
  if (selectedDropdownValue === "Drainage" && (reportCategory === "Water Supply" || reportCategory === "Drainage")) {
    return true;
  }
  return mapped === selectedDropdownValue || reportCategory === selectedDropdownValue;
}

function getStatusMeta(report) {
  if (report.isBanned) {
    return {
      key: "banned",
      label: "Banned Report",
      dotClass: "banned-marker",
      badgeClass: "popup-badge-banned",
      color: "#64748b",
      percent: 0
    };
  }
  const status = report.status || "Pending";
  const pct = typeof report.progressPercent === "number"
    ? report.progressPercent
    : (status === "Resolved" ? 95 : status === "In Progress" ? 60 : 20);

  if (status === "Resolved") {
    return {
      key: "resolved",
      label: "Resolved",
      dotClass: "resolved-marker",
      badgeClass: "popup-badge-resolved",
      color: "#16a34a",
      percent: pct
    };
  }
  if (status === "In Progress") {
    return {
      key: "progress",
      label: "In Progress",
      dotClass: "progress-marker",
      badgeClass: "popup-badge-progress",
      color: "#d97706",
      percent: pct
    };
  }
  return {
    key: "pending",
    label: "Pending",
    dotClass: "pending-marker",
    badgeClass: "popup-badge-pending",
    color: "#dc2626",
    percent: pct
  };
}

function timeAgo(timestamp) {
  if (!timestamp) return "Recently";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// =========================================
// 3. INITIALIZE LEAFLET MAP & FREE LAYERS
// =========================================
const DEFAULT_CENTER = [12.9255, 77.5468]; // Banashankari / Jayanagar, Bengaluru
const DEFAULT_ZOOM = 13;

const streetLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

const humanitarianLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors, Tiles style by HOT'
});

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri"
  }
);

const map = L.map("map", {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  layers: [streetLayer],
  zoomControl: false
});

L.control.zoom({ position: "bottomright" }).addTo(map);
L.control.layers(
  {
    "🗺️ Standard Street": streetLayer,
    "✨ Clean Civic Map": humanitarianLayer,
    "🛰️ Satellite View": satelliteLayer
  },
  null,
  { position: "topright" }
).addTo(map);

const markerLayerGroup = L.layerGroup().addTo(map);
let userLocationMarker = null;

// =========================================
// 4. DOM REFERENCES FROM map.html
// =========================================
let reports = loadMapReports();
let upvotedIds = getUpvotedIds();
let markerById = {};
let activeReportId = null;
let searchQuery = "";

const catFilterEl = document.getElementById("mapCategoryFilter");
const statusFilterEl = document.getElementById("mapStatusFilter");
const searchInputEl = document.getElementById("mapSearchInput");
const locateBtnEl = document.getElementById("mapLocateBtn");
const fitAllBtnEl = document.getElementById("mapFitAllBtn");
const resetBtnEl = document.getElementById("mapResetBtn");

const mapReportCountEl = document.getElementById("mapReportCount");
const mapMessageEl = document.getElementById("mapMessage");
const sideFeedListEl = document.getElementById("mapSideFeedList");

const mapStatTotalEl = document.getElementById("mapStatTotal");
const mapStatActiveEl = document.getElementById("mapStatActive");
const mapStatResolvedEl = document.getElementById("mapStatResolved");

function syncLegendActiveState(selectedStatus) {
  const legendItems = document.querySelectorAll(".map-legend .legend-item");
  legendItems.forEach((item) => {
    const statusVal = item.getAttribute("data-status") || item.textContent.trim();
    if (selectedStatus && statusVal === selectedStatus) {
      item.classList.add("legend-active");
    } else {
      item.classList.remove("legend-active");
    }
  });
}

function updateTopInfoCards() {
  const total = reports.length;
  const urgentCount = reports.filter((r) => r.status === "Pending" && !r.isBanned).length;
  const inProgressCount = reports.filter((r) => r.status === "In Progress" && !r.isBanned).length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;

  if (mapStatTotalEl) {
    mapStatTotalEl.textContent = `${total} total pinned civic reports across Bengaluru`;
  }
  if (mapStatActiveEl) {
    mapStatActiveEl.textContent = `${urgentCount} pending urgent & ${inProgressCount} active crew repairs`;
  }
  if (mapStatResolvedEl) {
    mapStatResolvedEl.textContent = `${resolvedCount} verified resolved community issues`;
  }
}

// =========================================
// 5. POPUP HTML & LIVE UPVOTE HANDLER
// =========================================
function buildPopupElement(report) {
  const meta = getStatusMeta(report);
  const categoryLabel = toMapHtmlCategory(report.category);
  const isUpvoted = upvotedIds.includes(report.id);

  const container = document.createElement("div");
  container.className = "civic-popup-card";

  const imageSection =
    report.imageUrl && !report.isBanned
      ? `
      <div class="civic-popup-img-wrap">
        <img src="${report.imageUrl}" alt="${report.title}" class="civic-popup-img">
        <span class="civic-popup-id">${report.id || "#CE"}</span>
      </div>
    `
      : `
      <div class="civic-popup-top-strip">
        <span class="civic-popup-id">${report.id || "#CE"}</span>
        <span class="civic-popup-time">${timeAgo(report.createdAt)}</span>
      </div>
    `;

  const banNotice = report.isBanned
    ? `
      <div class="civic-popup-ban-box">
        <strong>Banned by Municipal Authority</strong>
        <span>${report.banReason || "Violation of reporting guidelines."}</span>
      </div>
    `
    : "";

  container.innerHTML = `
    ${imageSection}
    <div class="civic-popup-body">
      <div class="civic-popup-badges">
        <span class="civic-popup-cat">${categoryLabel}</span>
        <span class="civic-popup-status ${meta.badgeClass}">${meta.label}</span>
      </div>

      <h3 class="civic-popup-title">${report.title}</h3>
      ${banNotice}
      <p class="civic-popup-desc">${report.description || ""}</p>

      <div class="civic-popup-loc">
        <strong>Location:</strong> ${report.locationName || `${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)}`}
      </div>

      <div class="civic-popup-progress">
        <div class="civic-popup-progress-head">
          <span>Resolution Progress</span>
          <strong>${meta.percent}%</strong>
        </div>
        <div class="civic-popup-progress-bar">
          <div class="civic-popup-progress-fill" style="width: ${meta.percent}%; background: ${meta.color};"></div>
        </div>
      </div>

      <div class="civic-popup-actions">
        <button type="button" class="civic-popup-upvote ${isUpvoted ? "upvoted" : ""}" ${report.isBanned ? "disabled" : ""}>
          <span>▲</span>
          <span class="upvote-text">${isUpvoted ? "Upvoted" : "Upvote"}</span>
          <strong class="upvote-num">${report.upvotes || 0}</strong>
        </button>

        <a href="dashboard.html" class="civic-popup-link">
          Open in Feed →
        </a>
      </div>
    </div>
  `;

  const upvoteBtn = container.querySelector(".civic-popup-upvote");
  if (upvoteBtn && !report.isBanned) {
    upvoteBtn.addEventListener("click", () => {
      const target = reports.find((r) => r.id === report.id);
      if (!target) return;

      const already = upvotedIds.includes(target.id);
      if (!already) {
        target.upvotes = (target.upvotes || 0) + 1;
        upvotedIds.push(target.id);
        upvoteBtn.classList.add("upvoted");
        upvoteBtn.querySelector(".upvote-text").textContent = "Upvoted";
      } else {
        target.upvotes = Math.max(0, (target.upvotes || 1) - 1);
        upvotedIds = upvotedIds.filter((id) => id !== target.id);
        upvoteBtn.classList.remove("upvoted");
        upvoteBtn.querySelector(".upvote-text").textContent = "Upvote";
      }

      upvoteBtn.querySelector(".upvote-num").textContent = target.upvotes;
      saveUpvotedIds(upvotedIds);
      saveMapReports(reports);
      renderSideFeedList(getFilteredReports());
    });
  }

  return container;
}

// =========================================
// 6. FILTER, RENDER MARKERS & SIDEBAR LIST
// =========================================
function getFilteredReports() {
  const selectedCategory = catFilterEl ? catFilterEl.value : "";
  const selectedStatus = statusFilterEl ? statusFilterEl.value : "";

  return reports.filter((r) => {
    const matchesCat = matchesCategoryFilter(r.category, selectedCategory);
    const matchesStat = !selectedStatus || selectedStatus === "" || r.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      (r.title && r.title.toLowerCase().includes(searchQuery)) ||
      (r.description && r.description.toLowerCase().includes(searchQuery)) ||
      (r.locationName && r.locationName.toLowerCase().includes(searchQuery)) ||
      (r.id && r.id.toLowerCase().includes(searchQuery));

    return matchesCat && matchesStat && matchesSearch;
  });
}

function renderSideFeedList(filteredReports) {
  if (!sideFeedListEl) return;

  if (filteredReports.length === 0) {
    sideFeedListEl.innerHTML = `
      <div class="map-side-empty">
        <p>No matching reports for the selected filters.</p>
      </div>
    `;
    return;
  }

  sideFeedListEl.innerHTML = filteredReports
    .map((r) => {
      const meta = getStatusMeta(r);
      const isSelected = r.id === activeReportId;
      return `
        <article class="map-side-card ${isSelected ? "active-side-card" : ""}" data-report-id="${r.id}">
          <div class="map-side-card-top">
            <span class="map-side-cat">${toMapHtmlCategory(r.category)}</span>
            <span class="map-side-status ${meta.badgeClass}">
              <span class="side-status-dot ${meta.dotClass}"></span>
              ${meta.label}
            </span>
          </div>
          <h4 class="map-side-title">${r.title}</h4>
          <p class="map-side-loc">📍 ${r.locationName || "Bengaluru"}</p>
          <div class="map-side-footer">
            <span>▲ ${r.upvotes || 0} upvotes</span>
            <span>${meta.percent}% resolved</span>
          </div>
        </article>
      `;
    })
    .join("");

  sideFeedListEl.querySelectorAll(".map-side-card").forEach((card) => {
    card.addEventListener("click", () => {
      const repId = card.getAttribute("data-report-id");
      focusReportOnMap(repId);
    });
  });
}

function focusReportOnMap(reportId) {
  const target = reports.find((r) => r.id === reportId);
  const marker = markerById[reportId];
  if (!target || !marker) return;

  activeReportId = reportId;
  const lat = Number(target.lat) || DEFAULT_CENTER[0];
  const lng = Number(target.lng) || DEFAULT_CENTER[1];

  map.flyTo([lat, lng], 16, { animate: true, duration: 0.9 });
  setTimeout(() => {
    marker.openPopup();
  }, 450);

  renderSideFeedList(getFilteredReports());
}

function renderMapAndSidebar(shouldFitBounds = false) {
  reports = loadMapReports();
  upvotedIds = getUpvotedIds();
  updateTopInfoCards();

  markerLayerGroup.clearLayers();
  markerById = {};

  const filtered = getFilteredReports();

  filtered.forEach((report) => {
    const lat = Number(report.lat) || DEFAULT_CENTER[0];
    const lng = Number(report.lng) || DEFAULT_CENTER[1];
    const meta = getStatusMeta(report);

    const customIcon = L.divIcon({
      className: "civic-custom-marker",
      html: `
        <div class="civic-pin-wrap ${meta.dotClass}">
          <span class="civic-pin-pulse"></span>
          <span class="civic-pin-core"></span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    marker.bindTooltip(`<strong>${report.title}</strong> (${meta.label})`, {
      direction: "top",
      offset: [0, -12],
      className: "civic-map-tooltip"
    });

    marker.bindPopup(() => buildPopupElement(report), {
      minWidth: 285,
      maxWidth: 310,
      className: "civic-leaflet-popup"
    });

    marker.on("click", () => {
      activeReportId = report.id;
      renderSideFeedList(filtered);
      const activeCard = sideFeedListEl
        ? sideFeedListEl.querySelector(`[data-report-id="${report.id}"]`)
        : null;
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    marker.addTo(markerLayerGroup);
    markerById[report.id] = marker;
  });

  if (mapReportCountEl) {
    mapReportCountEl.textContent = `Showing ${filtered.length} of ${reports.length} report${reports.length !== 1 ? "s" : ""}`;
  }

  if (mapMessageEl) {
    if (filtered.length === 0) {
      mapMessageEl.style.display = "block";
      mapMessageEl.textContent = "No civic reports match your current filter selection. Click Reset to view all pins.";
    } else {
      mapMessageEl.style.display = "none";
    }
  }

  renderSideFeedList(filtered);

  if (shouldFitBounds && filtered.length > 0) {
    fitAllVisibleMarkers();
  }
}

function fitAllVisibleMarkers() {
  const markers = Object.values(markerById);
  if (markers.length === 0) {
    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    return;
  }
  const group = L.featureGroup(markers);
  map.flyToBounds(group.getBounds().pad(0.25), { maxZoom: 15, duration: 0.9 });
}

// =========================================
// 7. GEOLOCATION ("LOCATE ME")
// =========================================
function locateUserOnMap() {
  if (locateBtnEl) locateBtnEl.textContent = "⏳ Locating...";

  map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true });

  map.once("locationfound", (e) => {
    if (locateBtnEl) locateBtnEl.textContent = "📍 Locate Me";

    if (userLocationMarker) {
      map.removeLayer(userLocationMarker);
    }

    userLocationMarker = L.circleMarker(e.latlng, {
      radius: 9,
      fillColor: "#2563eb",
      color: "#ffffff",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.95
    })
      .addTo(map)
      .bindPopup("<strong>📍 You are here</strong><br>Showing civic issues near your location.")
      .openPopup();

    map.flyTo(e.latlng, 15, { duration: 1.0 });
  });

  map.once("locationerror", () => {
    if (locateBtnEl) locateBtnEl.textContent = "📍 Locate Me";
    alert("Location access was denied or unavailable. Centering on Bengaluru.");
    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM);
  });
}

// =========================================
// 8. INITIALIZE LISTENERS
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  renderMapAndSidebar(true);

  if (catFilterEl) {
    catFilterEl.addEventListener("change", () => renderMapAndSidebar(true));
  }

  if (statusFilterEl) {
    statusFilterEl.addEventListener("change", () => {
      syncLegendActiveState(statusFilterEl.value);
      renderMapAndSidebar(true);
    });
  }

  if (searchInputEl) {
    searchInputEl.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderMapAndSidebar(false);
    });
  }

  if (locateBtnEl) {
    locateBtnEl.addEventListener("click", locateUserOnMap);
  }

  if (fitAllBtnEl) {
    fitAllBtnEl.addEventListener("click", fitAllVisibleMarkers);
  }

  if (resetBtnEl) {
    resetBtnEl.addEventListener("click", () => {
      if (catFilterEl) catFilterEl.value = "";
      if (statusFilterEl) statusFilterEl.value = "";
      if (searchInputEl) searchInputEl.value = "";
      searchQuery = "";
      activeReportId = null;
      syncLegendActiveState("");
      renderMapAndSidebar(true);
    });
  }

  // Clickable Legend Items
  document.querySelectorAll(".map-legend .legend-item").forEach((item) => {
    item.style.cursor = "pointer";
    item.addEventListener("click", () => {
      const targetStatus = item.getAttribute("data-status") || item.textContent.trim();
      if (!statusFilterEl) return;
      statusFilterEl.value = statusFilterEl.value === targetStatus ? "" : targetStatus;
      syncLegendActiveState(statusFilterEl.value);
      renderMapAndSidebar(true);
    });
  });

  // Sync automatically if localStorage changes in another tab
  window.addEventListener("storage", (e) => {
    if (e.key === "civiceye_reports" || e.key === "civiceye_upvoted_ids") {
      renderMapAndSidebar(false);
    }
  });
});