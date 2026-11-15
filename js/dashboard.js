// =========================================
// 1. DUMMY DATA & STORAGE INITIALIZATION
// =========================================
function generateRandomPercent(status) {
  if (status === "Pending") {
    return Math.floor(Math.random() * 31); // 0% to 30%
  }
  if (status === "In Progress") {
    return Math.floor(Math.random() * (85 - 31 + 1)) + 31; // 31% to 85%
  }
  if (status === "Resolved") {
    return Math.floor(Math.random() * (100 - 85 + 1)) + 85; // 85% to 100%
  }
  return 15;
}

// ---> OPTIONAL CATEGORY FALLBACK IMAGES <---
// Replace these paths with your local images inside "assets/images/" if desired
const CATEGORY_IMAGES = {
  "Roads": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700",       // e.g. "assets/images/pothole.jpg"
  "Electricity": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700", // e.g. "assets/images/streetlight.jpg"
  "Sanitation": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=700",  // e.g. "assets/images/garbage.jpg"
  "Water Supply": "",
  "Public Safety": "",
  "Other": ""
};

// Active citizen account used when posting new comments (can be banned/unbanned via ID: USR-104)
const CURRENT_USER_ACCOUNT = {
  accountId: "USR-104",
  author: "Citizen Member"
};

const DUMMY_REPORTS = [
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
    // ---> ADD / REPLACE YOUR POTHOLE IMAGE PATH BELOW <---
    imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700",
    status: "Pending",
    progressPercent: 18,
    upvotes: 14,
    isBanned: false,
    banReason: "",
    comments: [
      {
        id: "CMT-101",
        accountId: "USR-201",
        author: "Priya M.",
        text: "Saw two bikers nearly fall here yesterday evening!",
        time: "2h ago",
        isBanned: false
      },
      {
        id: "CMT-102",
        accountId: "USR-202",
        author: "Suresh K.",
        text: "Upvoted. Needs urgent patching before heavy rain.",
        time: "1h ago",
        isBanned: false
      }
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
    // ---> ADD / REPLACE YOUR STREETLIGHT IMAGE PATH BELOW <---
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700",
    status: "In Progress",
    progressPercent: 62,
    upvotes: 19,
    isBanned: false,
    banReason: "",
    comments: [
      {
        id: "CMT-103",
        accountId: "USR-203",
        author: "BESCOM Lineman Desk",
        text: "Faulty cable identified. Replacement scheduled.",
        time: "5h ago",
        isBanned: false
      }
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
    // ---> ADD / REPLACE YOUR GARBAGE IMAGE PATH BELOW <---
    imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=700",
    status: "Resolved",
    progressPercent: 96,
    upvotes: 27,
    isBanned: false,
    banReason: "",
    comments: [
      {
        id: "CMT-104",
        accountId: "USR-204",
        author: "Meera N.",
        text: "Cleared this morning by BBMP marshals! Great job.",
        time: "1d ago",
        isBanned: false
      }
    ],
    createdAt: Date.now() - 345600000
  }
];

function normalizeCategory(cat) {
  const map = {
    "Road Damage": "Roads",
    "Garbage": "Sanitation",
    "Water Leakage": "Water Supply",
    "Drainage": "Water Supply",
    "Street Lights": "Electricity"
  };
  return map[cat] || cat || "Other";
}

function loadReports() {
  const saved = localStorage.getItem("civiceye_reports");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const updated = parsed.map((r, rIdx) => {
        const status = r.status || "Pending";
        let pct = typeof r.progressPercent === "number" ? r.progressPercent : generateRandomPercent(status);
        if (status === "Pending" && (pct < 0 || pct > 30)) pct = generateRandomPercent("Pending");
        if (status === "In Progress" && (pct < 31 || pct > 85)) pct = generateRandomPercent("In Progress");
        if (status === "Resolved" && (pct < 85 || pct > 100)) pct = generateRandomPercent("Resolved");

        const rawComments = Array.isArray(r.comments) ? r.comments : [];
        const normalizedComments = rawComments.map((c, cIdx) => ({
          id: c.id || `CMT-${rIdx + 1}${cIdx + 1}`,
          accountId: (c.accountId || `USR-20${rIdx + 1}${cIdx + 1}`).toUpperCase(),
          author: c.author || "Citizen Member",
          text: c.text || "",
          time: c.time || "Recently",
          isBanned: Boolean(c.isBanned)
        }));

        return {
          ...r,
          status,
          progressPercent: pct,
          category: normalizeCategory(r.category),
          isBanned: Boolean(r.isBanned),
          banReason: r.banReason || "",
          comments: normalizedComments
        };
      });
      localStorage.setItem("civiceye_reports", JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Failed to parse saved reports:", e);
    }
  }
  localStorage.setItem("civiceye_reports", JSON.stringify(DUMMY_REPORTS));
  return DUMMY_REPORTS;
}

function saveReports(reportsArray) {
  localStorage.setItem("civiceye_reports", JSON.stringify(reportsArray));
}

function getUpvotedIds() {
  const saved = localStorage.getItem("civiceye_upvoted_ids");
  return saved ? JSON.parse(saved) : [];
}

function saveUpvotedIds(ids) {
  localStorage.setItem("civiceye_upvoted_ids", JSON.stringify(ids));
}

// Banned User Accounts Storage: { "USR-104": { reason: "Spamming", bannedAt: "..." } }
function getBannedAccounts() {
  const saved = localStorage.getItem("civiceye_banned_accounts");
  return saved ? JSON.parse(saved) : {};
}

function saveBannedAccounts(bannedMap) {
  localStorage.setItem("civiceye_banned_accounts", JSON.stringify(bannedMap));
}

// =========================================
// 2. STATE & DOM ELEMENTS
// =========================================
let reports = loadReports();
let upvotedIds = getUpvotedIds();
let isAdminMode = false;
let statusChartInstance = null;

const reportsContainer = document.getElementById("reportsContainer");
const noReportsEl = document.getElementById("noReports");
const template = document.getElementById("reportCardTemplate");

const searchInput = document.getElementById("searchReports");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const sortSelect = document.getElementById("sortReports");
const adminToggleBtn = document.getElementById("adminToggleBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const sidebarLinks = document.querySelectorAll(".sidebar-link");

// Admin Moderation Panel Elements
const adminAccountModPanel = document.getElementById("adminAccountModPanel");
const adminAccountIdInput = document.getElementById("adminAccountIdInput");
const unbanAccountByIdBtn = document.getElementById("unbanAccountByIdBtn");
const banAccountByIdBtn = document.getElementById("banAccountByIdBtn");
const bannedAccountsListEl = document.getElementById("bannedAccountsList");

// =========================================
// 3. HELPER & ADMIN MODERATION FUNCTIONS
// =========================================
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusMeta(report) {
  if (report.isBanned) {
    return {
      badgeClass: "badge-pending",
      percent: 0,
      color: "#991b1b",
      stageText: "🚫 Report Suspended / Banned by Municipal Authority"
    };
  }

  const status = report.status || "Pending";
  const percent =
    typeof report.progressPercent === "number"
      ? report.progressPercent
      : generateRandomPercent(status);

  if (status === "Resolved") {
    const label =
      percent === 100
        ? "Resolution Progress: Verified & Resolved ✓"
        : "Resolution Progress: Almost Resolved / Final Check";
    return {
      badgeClass: "badge-resolved",
      percent,
      color: "#16a34a",
      stageText: label
    };
  }
  if (status === "In Progress") {
    return {
      badgeClass: "badge-progress",
      percent,
      color: "#d97706",
      stageText: "Resolution Progress: In Progress (Municipal Crew Active)"
    };
  }
  return {
    badgeClass: "badge-pending",
    percent,
    color: "#dc2626",
    stageText: "Resolution Progress: Pending Municipal Action"
  };
}

// Render the top Admin Account Moderation Panel
function renderAdminAccountPanel() {
  if (!adminAccountModPanel || !bannedAccountsListEl) return;

  adminAccountModPanel.hidden = !isAdminMode;
  if (!isAdminMode) return;

  const bannedMap = getBannedAccounts();
  const bannedIds = Object.keys(bannedMap);

  if (bannedIds.length === 0) {
    bannedAccountsListEl.innerHTML = `<span>✅ No user accounts are currently banned from commenting.</span>`;
    return;
  }

  bannedAccountsListEl.innerHTML =
    `<strong style="color: #fca5a5;">Banned Accounts (${bannedIds.length}):</strong> ` +
    bannedIds
      .map(
        accId => `
        <span style="display: inline-flex; align-items: center; gap: 0.45rem; background: #7f1d1d; color: #fecaca; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.8rem;">
          <strong>${accId}</strong> <span>(${bannedMap[accId].reason})</span>
          <button
            type="button"
            data-unban-id="${accId}"
            style="background: #16a34a; color: #fff; border: none; border-radius: 4px; padding: 0.15rem 0.45rem; font-size: 0.74rem; font-weight: 600; cursor: pointer;"
          >
            Unban
          </button>
        </span>
      `
      )
      .join("");

  bannedAccountsListEl.querySelectorAll("[data-unban-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-unban-id");
      unbanUserAccount(targetId);
    });
  });
}

// Admin Action: Ban a user account by Account ID
function banUserAccount(accountId, defaultReason = "Abusive or spam comments") {
  if (!isAdminMode) return;
  const cleanId = (accountId || "").trim().toUpperCase();
  if (!cleanId) {
    alert("Please enter a valid Account ID (e.g., USR-104).");
    return;
  }

  const reason = prompt(
    `Enter Municipal Authority reason for banning Account ID [${cleanId}] from commenting:`,
    defaultReason
  );
  if (reason === null) return; // Cancelled

  const finalReason = reason.trim() || "Violation of community comment policy";
  const bannedMap = getBannedAccounts();
  bannedMap[cleanId] = {
    reason: finalReason,
    bannedAt: new Date().toLocaleDateString()
  };

  saveBannedAccounts(bannedMap);
  renderAdminAccountPanel();
  renderReports();
  alert(`Account ID [${cleanId}] has been banned from commenting.`);
}

// Admin Action: Unban a user account using their Account ID
function unbanUserAccount(accountId) {
  if (!isAdminMode) return;
  const cleanId = (accountId || "").trim().toUpperCase();
  if (!cleanId) {
    alert("Please enter an Account ID to unban.");
    return;
  }

  const bannedMap = getBannedAccounts();
  if (!bannedMap[cleanId]) {
    alert(`Account ID [${cleanId}] is not currently banned.`);
    return;
  }

  delete bannedMap[cleanId];
  saveBannedAccounts(bannedMap);
  renderAdminAccountPanel();
  renderReports();
  alert(`Account ID [${cleanId}] has been unbanned and can comment again.`);
}

// Admin Action: Ban / Unban a Report Issue Card (Requires Explanation to Ban)
function toggleBanReportCard(reportId) {
  if (!isAdminMode) return;
  const report = reports.find(r => r.id === reportId);
  if (!report) return;

  if (!report.isBanned) {
    const explanation = prompt(
      `Enter official Municipal Authority explanation for banning report "${report.title}" (Required):`
    );
    if (explanation === null) return; // Cancelled
    if (explanation.trim() === "") {
      alert("Action blocked: You must provide an explanation to ban a report card.");
      return;
    }
    report.isBanned = true;
    report.banReason = explanation.trim();
  } else {
    const confirmUnban = confirm(`Unban report card "${report.title}" (${report.id})?`);
    if (!confirmUnban) return;
    report.isBanned = false;
    report.banReason = "";
  }

  saveReports(reports);
  updateDashboardStats();
  renderReports();
}

// =========================================
// 4. UPDATE STATS, HIGHLIGHTS & CHART.JS
// =========================================
function updateDashboardStats() {
  const total = reports.length;
  const pending = reports.filter(r => r.status === "Pending").length;
  const progress = reports.filter(r => r.status === "In Progress").length;
  const resolved = reports.filter(r => r.status === "Resolved").length;

  const totalVotes = reports.reduce((sum, r) => sum + (r.upvotes || 0), 0);
  const totalComments = reports.reduce(
    (sum, r) => sum + (Array.isArray(r.comments) ? r.comments.length : 0),
    0
  );

  document.getElementById("totalReports").textContent = total;
  document.getElementById("totalVotes").textContent = totalVotes;
  document.getElementById("totalComments").textContent = totalComments;
  document.getElementById("resolvedReports").textContent = resolved;

  document.getElementById("countAll").textContent = total;
  document.getElementById("countPending").textContent = pending;
  document.getElementById("countProgress").textContent = progress;
  document.getElementById("countResolved").textContent = resolved;

  if (reports.length > 0) {
    const topReport = [...reports].sort((a, b) => b.upvotes - a.upvotes)[0];
    document.getElementById("topIssue").textContent =
      `${topReport.title} (${topReport.upvotes} upvotes)`;

    const mostRecent = [...reports].sort((a, b) => b.createdAt - a.createdAt)[0];
    document.getElementById("activeArea").textContent =
      mostRecent.locationName || "Banashankari, Bengaluru";
  }

  const chartCanvas = document.getElementById("statusChart");
  if (chartCanvas && typeof Chart !== "undefined") {
    const ctx = chartCanvas.getContext("2d");
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
            borderWidth: 2,
            borderColor: "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "66%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 12, padding: 14, font: { size: 11, weight: "600" } }
            }
          }
        }
      });
    }
  }
}

// =========================================
// 5. TOGGLE UPVOTE (1st Click = +1, 2nd Click = -1)
// =========================================
async function handleUpvote(reportId, voteBtnEl, voteCountEl, voteLabelEl) {
  const report = reports.find(r => r.id === reportId);
  if (!report) return;

  if (report.isBanned) {
    alert("Upvoting is disabled because this report card has been banned by the Municipal Authority.");
    return;
  }

  const alreadyUpvoted = upvotedIds.includes(reportId);
  let delta = 0;

  if (!alreadyUpvoted) {
    delta = 1;
    report.upvotes = (report.upvotes || 0) + 1;
    upvotedIds.push(reportId);
    voteBtnEl.classList.add("upvoted");
    if (voteLabelEl) voteLabelEl.textContent = "Upvoted";
  } else {
    delta = -1;
    report.upvotes = Math.max(0, (report.upvotes || 1) - 1);
    upvotedIds = upvotedIds.filter(id => id !== reportId);
    voteBtnEl.classList.remove("upvoted");
    if (voteLabelEl) voteLabelEl.textContent = "Upvote";
  }

  saveUpvotedIds(upvotedIds);

  voteCountEl.textContent = report.upvotes;
  voteBtnEl.classList.add("vote-pop");
  setTimeout(() => voteBtnEl.classList.remove("vote-pop"), 280);

  saveReports(reports);
  updateDashboardStats();

  if (window.db && window.firestoreIncrement && window.firestoreUpdateDoc && window.firestoreDoc) {
    try {
      const reportRef = window.firestoreDoc(window.db, "reports", reportId);
      await window.firestoreUpdateDoc(reportRef, {
        upvotes: window.firestoreIncrement(delta)
      });
    } catch (err) {
      console.warn("Saved locally (Firestore sync skipped):", err.message);
    }
  }
}

// =========================================
// 6. RENDER SOCIAL REPORT CARDS FROM TEMPLATE
// =========================================
function renderReports() {
  renderAdminAccountPanel();

  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedStatus = statusFilter.value;
  const sortBy = sortSelect.value;
  const bannedAccountsMap = getBannedAccounts();

  const filtered = reports
    .filter(r => {
      const matchesSearch =
        (r.title && r.title.toLowerCase().includes(query)) ||
        (r.description && r.description.toLowerCase().includes(query)) ||
        (r.locationName && r.locationName.toLowerCase().includes(query)) ||
        (r.id && r.id.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === "All" ||
        selectedCategory === "" ||
        normalizeCategory(r.category) === selectedCategory;

      const matchesStatus =
        selectedStatus === "All" ||
        selectedStatus === "" ||
        r.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "votes") return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  reportsContainer.innerHTML = "";

  if (filtered.length === 0) {
    noReportsEl.hidden = false;
    return;
  }

  noReportsEl.hidden = true;

  filtered.forEach(report => {
    const clone = template.content.cloneNode(true);
    const cardEl = clone.querySelector(".social-report-card");
    const statusMeta = getStatusMeta(report);

    // Header Info
    const nameStr = report.reporterName || "Citizen Reporter";
    clone.querySelector(".user-avatar").textContent = nameStr.charAt(0).toUpperCase();
    clone.querySelector(".reporter-name").textContent = nameStr;
    clone.querySelector(".report-time").textContent = `Reported ${timeAgo(report.createdAt)}`;
    clone.querySelector(".report-id-pill").textContent = report.id;

    // Status Badge & Ban Banner
    const statusBadge = clone.querySelector(".report-status");
    const banBanner = clone.querySelector(".report-ban-banner");
    const banReasonText = clone.querySelector(".ban-reason-text");

    if (report.isBanned) {
      statusBadge.textContent = "🚫 BANNED";
      statusBadge.className = "report-status badge badge-pending";
      cardEl.style.border = "2px solid #dc2626";
      cardEl.style.backgroundColor = "#fffafa";
      if (banBanner && banReasonText) {
        banBanner.hidden = false;
        banReasonText.textContent = `Official Explanation: ${report.banReason}`;
      }
    } else {
      statusBadge.textContent =
        report.status === "Resolved" && statusMeta.percent < 100
          ? "Almost Resolved"
          : report.status;
      statusBadge.className = `report-status badge ${statusMeta.badgeClass}`;
    }

    // Tags, Title, Description, Location
    const normalizedCat = normalizeCategory(report.category);
    clone.querySelector(".report-category").textContent = normalizedCat;
    clone.querySelector(".report-department").textContent =
      report.department || "Municipal Department";
    clone.querySelector(".report-title").textContent = report.title;
    clone.querySelector(".report-description").textContent = report.description;

    const locDisplay =
      report.locationName ||
      `${Number(report.lat || 12.9352).toFixed(4)}, ${Number(report.lng || 77.58).toFixed(4)}`;
    clone.querySelector(".location-text").textContent = locDisplay;

    // Image (Uses report.imageUrl or fallback from CATEGORY_IMAGES)
    const imgEl = clone.querySelector(".report-image");
    const resolvedImage = report.imageUrl || CATEGORY_IMAGES[normalizedCat] || "";
    if (resolvedImage) {
      imgEl.src = resolvedImage;
      imgEl.hidden = false;
    }

    // Resolution Progress Bar
    clone.querySelector(".stage-label").textContent = statusMeta.stageText;
    clone.querySelector(".funding-percentage").textContent = `${statusMeta.percent}%`;
    const fillEl = clone.querySelector(".funding-progress-fill");
    fillEl.style.width = `${statusMeta.percent}%`;
    fillEl.style.backgroundColor = statusMeta.color;

    // STRICT ADMIN LOCK: Status Select + Ban/Unban Report Card Button
    const adminBar = clone.querySelector(".admin-control-bar");
    const adminSelect = clone.querySelector(".admin-status-select");
    const adminBanCardBtn = clone.querySelector(".admin-ban-card-btn");

    if (isAdminMode) {
      adminBar.hidden = false;
      adminSelect.value = report.status;
      adminSelect.disabled = Boolean(report.isBanned);

      adminSelect.addEventListener("change", e => {
        const newStatus = e.target.value;
        report.status = newStatus;
        report.progressPercent = generateRandomPercent(newStatus);
        saveReports(reports);
        updateDashboardStats();
        renderReports();
      });

      if (adminBanCardBtn) {
        if (report.isBanned) {
          adminBanCardBtn.textContent = "✅ Unban Report Card";
          adminBanCardBtn.style.background = "#16a34a";
        } else {
          adminBanCardBtn.textContent = "🚫 Ban Report Card";
          adminBanCardBtn.style.background = "#dc2626";
        }
        adminBanCardBtn.addEventListener("click", () => toggleBanReportCard(report.id));
      }
    } else {
      adminBar.remove();
    }

    // Upvote Button Toggle Logic
    const voteBtn = clone.querySelector(".vote-btn");
    const voteCount = clone.querySelector(".vote-count");
    const voteLabel = clone.querySelector(".vote-label");
    voteCount.textContent = report.upvotes || 0;

    if (upvotedIds.includes(report.id)) {
      voteBtn.classList.add("upvoted");
      if (voteLabel) voteLabel.textContent = "Upvoted";
    } else {
      voteBtn.classList.remove("upvoted");
      if (voteLabel) voteLabel.textContent = "Upvote";
    }

    voteBtn.addEventListener("click", () =>
      handleUpvote(report.id, voteBtn, voteCount, voteLabel)
    );

    // Comments Section & Admin Comment/Account Ban Logic
    const commentsWrap = clone.querySelector(".report-comments");
    const commentsList = clone.querySelector(".comments-list");
    const commentCountEl = clone.querySelector(".comment-count");
    const commentToggleBtn = clone.querySelector(".comment-toggle-btn");
    const commentForm = clone.querySelector(".comment-form");
    const commentInput = clone.querySelector(".comment-input");

    const commentsArr = Array.isArray(report.comments) ? report.comments : [];
    commentCountEl.textContent = commentsArr.length;

    if (report.isBanned) {
      commentInput.disabled = true;
      commentInput.placeholder = "Commenting is disabled on banned report cards.";
    }

    function renderCommentsList() {
      const latestBannedMap = getBannedAccounts();

      if (commentsArr.length === 0) {
        commentsList.innerHTML = `<p class="no-comments">No comments yet. Be the first to add an update!</p>`;
        return;
      }

      commentsList.innerHTML = commentsArr
        .map((c, idx) => {
          const accId = (c.accountId || `USR-20${idx + 1}`).toUpperCase();
          const isAccBanned = Boolean(latestBannedMap[accId]);

          return `
            <div class="comment-item" style="${c.isBanned ? 'background: #fff1f2; border-left: 3px solid #e11d48;' : ''}">
              <div class="comment-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
                <div>
                  <strong>${c.author}</strong>
                  <code style="font-size: 0.74rem; background: #e2e8f0; color: #1e293b; padding: 0.1rem 0.35rem; border-radius: 4px; margin-left: 0.3rem;">${accId}</code>
                  ${isAccBanned ? `<span style="font-size: 0.72rem; color: #dc2626; font-weight: 700; margin-left: 0.3rem;">[ACCOUNT BANNED]</span>` : ""}
                  <span style="margin-left: 0.4rem;">${c.time}</span>
                </div>

                ${
                  isAdminMode
                    ? `<div style="display: flex; gap: 0.35rem;">
                        <button
                          type="button"
                          data-ban-comment-idx="${idx}"
                          style="padding: 0.2rem 0.5rem; font-size: 0.72rem; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; background: ${c.isBanned ? '#16a34a' : '#f59e0b'}; color: #fff;"
                        >
                          ${c.isBanned ? "Unban Comment" : "Ban Comment"}
                        </button>
                        <button
                          type="button"
                          data-toggle-acc-id="${accId}"
                          style="padding: 0.2rem 0.5rem; font-size: 0.72rem; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; background: ${isAccBanned ? '#16a34a' : '#dc2626'}; color: #fff;"
                        >
                          ${isAccBanned ? "Unban Account" : "Ban Account"}
                        </button>
                      </div>`
                    : ""
                }
              </div>

              <p style="margin-top: 0.35rem; ${c.isBanned ? 'color: #9f1239; font-style: italic;' : ''}">
                ${
                  c.isBanned
                    ? "⚠️ This comment has been banned and hidden by Municipal Authority."
                    : c.text
                }
              </p>
            </div>
          `;
        })
        .join("");

      // Attach Admin Comment Ban & Account Ban Listeners
      if (isAdminMode) {
        commentsList.querySelectorAll("[data-ban-comment-idx]").forEach(btn => {
          btn.addEventListener("click", () => {
            const targetIdx = Number(btn.getAttribute("data-ban-comment-idx"));
            if (!commentsArr[targetIdx]) return;
            commentsArr[targetIdx].isBanned = !commentsArr[targetIdx].isBanned;
            saveReports(reports);
            renderCommentsList();
          });
        });

        commentsList.querySelectorAll("[data-toggle-acc-id]").forEach(btn => {
          btn.addEventListener("click", () => {
            const targetAccId = btn.getAttribute("data-toggle-acc-id");
            const currentBans = getBannedAccounts();
            if (currentBans[targetAccId]) {
              unbanUserAccount(targetAccId);
            } else {
              banUserAccount(targetAccId, "Banned from comment moderation");
            }
          });
        });
      }
    }

    commentToggleBtn.addEventListener("click", () => {
      commentsWrap.hidden = !commentsWrap.hidden;
      if (!commentsWrap.hidden) renderCommentsList();
    });

    commentForm.addEventListener("submit", e => {
      e.preventDefault();

      if (report.isBanned) {
        alert("Cannot comment: This report card is banned by the Municipal Authority.");
        return;
      }

      const activeBans = getBannedAccounts();
      const myAccId = CURRENT_USER_ACCOUNT.accountId;
      if (activeBans[myAccId]) {
        alert(
          `🚫 Your user account (${myAccId}) is banned from commenting.\nReason: ${activeBans[myAccId].reason}`
        );
        return;
      }

      const text = commentInput.value.trim();
      if (!text) return;

      commentsArr.push({
        id: "CMT-" + Date.now(),
        accountId: myAccId,
        author: CURRENT_USER_ACCOUNT.author,
        text,
        time: "Just now",
        isBanned: false
      });

      report.comments = commentsArr;
      commentInput.value = "";
      commentCountEl.textContent = commentsArr.length;
      saveReports(reports);
      renderCommentsList();
      updateDashboardStats();
    });

    // Share Button Logic
    const shareBtn = clone.querySelector(".share-btn");
    shareBtn.addEventListener("click", () => {
      const shareText = `${report.title} (${report.id}) - Reported on CivicEye`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        shareBtn.textContent = "✓ Link Copied!";
        setTimeout(() => (shareBtn.textContent = "↗ Share"), 2000);
      } else {
        alert(shareText);
      }
    });

    reportsContainer.appendChild(clone);
  });
}

// =========================================
// 7. SIDEBAR TABS, ADMIN & FILTER LISTENERS
// =========================================
sidebarLinks.forEach(btn => {
  btn.addEventListener("click", () => {
    sidebarLinks.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const view = btn.dataset.view;
    if (view === "all") {
      statusFilter.value = "All";
      sortSelect.value = "latest";
    } else if (view === "trending") {
      statusFilter.value = "All";
      sortSelect.value = "votes";
    } else if (view === "pending") {
      statusFilter.value = "Pending";
    } else if (view === "progress") {
      statusFilter.value = "In Progress";
    } else if (view === "resolved") {
      statusFilter.value = "Resolved";
    }
    renderReports();
  });
});

adminToggleBtn.addEventListener("click", () => {
  if (!isAdminMode) {
    const pin = prompt("Enter Municipal Admin Passcode :", "1234");
    if (pin === "1234") {
      isAdminMode = true;
      adminToggleBtn.textContent = "🔓 Admin: ON";
      adminToggleBtn.style.background = "rgba(22, 163, 74, 0.25)";
      adminToggleBtn.style.borderColor = "#4ade80";
      renderReports();
    } else if (pin !== null) {
      alert("Incorrect passcode!");
    }
  } else {
    isAdminMode = false;
    adminToggleBtn.textContent = "🔒 Admin: OFF";
    adminToggleBtn.style.background = "transparent";
    adminToggleBtn.style.borderColor = "rgba(255, 255, 255, 0.4)";
    renderReports();
  }
});

// Admin Account ID Unban / Ban Top Panel Buttons
if (unbanAccountByIdBtn) {
  unbanAccountByIdBtn.addEventListener("click", () => {
    const targetId = adminAccountIdInput ? adminAccountIdInput.value : "";
    unbanUserAccount(targetId);
    if (adminAccountIdInput) adminAccountIdInput.value = "";
  });
}

if (banAccountByIdBtn) {
  banAccountByIdBtn.addEventListener("click", () => {
    const targetId = adminAccountIdInput ? adminAccountIdInput.value : "";
    banUserAccount(targetId);
    if (adminAccountIdInput) adminAccountIdInput.value = "";
  });
}

if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "All";
    statusFilter.value = "All";
    sortSelect.value = "votes";
    renderReports();
  });
}

searchInput.addEventListener("input", renderReports);
categoryFilter.addEventListener("change", renderReports);
statusFilter.addEventListener("change", renderReports);
sortSelect.addEventListener("change", renderReports);

// Initialize Dashboard
updateDashboardStats();
renderReports();