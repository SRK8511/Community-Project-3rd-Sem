// =========================================
// 1. DUMMY DATA & LOCALSTORAGE SYNC
// =========================================
const DUMMY_REPORTS = [
  {
    id: "rep_1",
    title: "Deep pothole near Banashankari signal",
    category: "Roads",
    description: "Large waterlogged pothole causing two-wheelers to swerve dangerously.",
    lat: 12.9255,
    lng: 77.5468,
    imageUrl: "https://placehold.co/600x400?text=Pothole+Photo",
    status: "Pending",
    upvotes: 14,
    createdAt: Date.now() - 86400000
  },
  {
    id: "rep_2",
    title: "Streetlight not working on 80 Feet Road",
    category: "Electricity",
    description: "Complete stretch is dark after 7 PM for the last 4 days.",
    lat: 12.9081,
    lng: 77.5856,
    imageUrl: "https://placehold.co/600x400?text=Broken+Streetlight",
    status: "In Progress",
    upvotes: 8,
    createdAt: Date.now() - 172800000
  },
  {
    id: "rep_3",
    title: "Uncollected garbage pile near park gate",
    category: "Sanitation",
    description: "Overflowing bins attracting stray animals and blocking the footpath.",
    lat: 12.9716,
    lng: 77.5946,
    imageUrl: "https://placehold.co/600x400?text=Garbage+Cleared",
    status: "Resolved",
    upvotes: 23,
    createdAt: Date.now() - 345600000
  }
];

// Load from localStorage if available; otherwise initialize with DUMMY_REPORTS
function loadReports() {
  const saved = localStorage.getItem("civiceye_reports");
  if (saved) {
    return JSON.parse(saved);
  } else {
    localStorage.setItem("civiceye_reports", JSON.stringify(DUMMY_REPORTS));
    return DUMMY_REPORTS;
  }
}

function saveReports(reportsArray) {
  localStorage.setItem("civiceye_reports", JSON.stringify(reportsArray));
}

// =========================================
// 2. STATE & DOM ELEMENTS
// =========================================
let reports = loadReports();
let isAdminMode = false;
let statusChartInstance = null;

const reportsContainer = document.getElementById("reportsContainer");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const adminToggleBtn = document.getElementById("adminToggleBtn");

// =========================================
// 3. HELPER FUNCTIONS
// =========================================
function getBadgeClass(status) {
  if (status === "Pending") return "badge-pending";
  if (status === "In Progress") return "badge-progress";
  if (status === "Resolved") return "badge-resolved";
  return "badge-pending";
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// =========================================
// 4. UPDATE STATS & CHART.JS
// =========================================
function updateAnalytics() {
  const total = reports.length;
  const pending = reports.filter(r => r.status === "Pending").length;
  const progress = reports.filter(r => r.status === "In Progress").length;
  const resolved = reports.filter(r => r.status === "Resolved").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statProgress").textContent = progress;
  document.getElementById("statResolved").textContent = resolved;

  const ctx = document.getElementById("statusChart").getContext("2d");

  if (statusChartInstance) {
    statusChartInstance.data.datasets[0].data = [pending, progress, resolved];
    statusChartInstance.update();
  } else {
    statusChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Pending", "In Progress", "Resolved"],
        datasets: [{
          data: [pending, progress, resolved],
          backgroundColor: ["#dc2626", "#d97706", "#16a34a"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        }
      }
    });
  }
}

// =========================================
// 5. RENDER REPORT CARDS
// =========================================
function renderReports() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedStatus = statusFilter.value;

  const filtered = reports
    .filter(report => {
      const matchesSearch =
        report.title.toLowerCase().includes(searchTerm) ||
        report.description.toLowerCase().includes(searchTerm);
      const matchesCategory = selectedCategory === "All" || report.category === selectedCategory;
      const matchesStatus = selectedStatus === "All" || report.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    // Sort by highest upvotes first
    .sort((a, b) => b.upvotes - a.upvotes);

  if (filtered.length === 0) {
    reportsContainer.innerHTML = `
      <div class="form-card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">
        No matching reports found. Try clearing your filters!
      </div>
    `;
    return;
  }

  reportsContainer.innerHTML = filtered.map(report => `
    <article class="report-card">
      <img src="${report.imageUrl}" alt="${report.title}" />
      <div class="report-card-body">
        <div>
          <div class="report-meta">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--primary);">${report.category}</span>
            <span class="badge ${getBadgeClass(report.status)}">${report.status}</span>
          </div>
          <h3 style="font-size: 1.1rem; margin-bottom: 0.4rem;">${report.title}</h3>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.75rem;">
            ${report.description}
          </p>
        </div>

        <div>
          <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>📍 ${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}</span>
            <span>🗓️ ${formatDate(report.createdAt)}</span>
          </div>

          <div class="report-footer">
            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="handleUpvote('${report.id}')">
              ▲ Upvote (${report.upvotes})
            </button>

            ${isAdminMode ? `
              <select onchange="handleStatusChange('${report.id}', this.value)" style="padding: 0.35rem; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.82rem;">
                <option value="Pending" ${report.status === "Pending" ? "selected" : ""}>Pending</option>
                <option value="In Progress" ${report.status === "In Progress" ? "selected" : ""}>In Progress</option>
                <option value="Resolved" ${report.status === "Resolved" ? "selected" : ""}>Resolved</option>
              </select>
            ` : `
              <a href="map.html" style="font-size: 0.85rem; color: var(--primary); text-decoration: none; font-weight: 600;">View on Map →</a>
            `}
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

// =========================================
// 6. INTERACTIVE ACTIONS (UPVOTE & ADMIN)
// =========================================
window.handleUpvote = function(reportId) {
  const report = reports.find(r => r.id === reportId);
  if (report) {
    report.upvotes += 1;
    saveReports(reports);
    renderReports();
  }
};

window.handleStatusChange = function(reportId, newStatus) {
  const report = reports.find(r => r.id === reportId);
  if (report) {
    report.status = newStatus;
    saveReports(reports);
    updateAnalytics();
    renderReports();
  }
};

adminToggleBtn.addEventListener("click", () => {
  if (!isAdminMode) {
    const pin = prompt("Enter Admin Passcode (Use 1234 for demo):", "1234");
    if (pin === "1234") {
      isAdminMode = true;
      adminToggleBtn.textContent = "🔓 Admin Mode: ON";
      adminToggleBtn.style.borderColor = "var(--primary)";
      adminToggleBtn.style.color = "var(--primary)";
      renderReports();
    } else if (pin !== null) {
      alert("Incorrect passcode!");
    }
  } else {
    isAdminMode = false;
    adminToggleBtn.textContent = "🔒 Admin Mode: OFF";
    adminToggleBtn.style.borderColor = "var(--border-color)";
    adminToggleBtn.style.color = "var(--text-main)";
    renderReports();
  }
});

// =========================================
// 7. EVENT LISTENERS & INITIALIZATION
// =========================================
searchInput.addEventListener("input", renderReports);
categoryFilter.addEventListener("change", renderReports);
statusFilter.addEventListener("change", renderReports);

// Initial load
updateAnalytics();
renderReports();