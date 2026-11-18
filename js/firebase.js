// =========================================================
// CIVICEYE: HYBRID CLOUD FIRESTORE & REAL-TIME SYNC ENGINE
// File: js/firebase.js
// =========================================================

(function () {
  "use strict";

  // =======================================================
  // 1. FIREBASE CONFIGURATION
  // Paste your Firebase Project keys below when ready.
  // If left as placeholder values, CivicEye automatically
  // runs in Local Real-Time Sync Mode with zero errors!
  // =======================================================
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000"
  };

  const REPORTS_STORAGE_KEY = "civiceye_reports";
  const BANNED_STORAGE_KEY = "civiceye_banned_accounts";
  const UPVOTED_STORAGE_KEY = "civiceye_upvoted_ids";

  // Check if the user has replaced the placeholder config with real keys
  function isFirebaseConfigured() {
    return (
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.projectId !== "your-project-id"
    );
  }

  // =======================================================
  // 2. MULTI-TAB REAL-TIME BROADCAST CHANNEL (Instant Sync)
  // Syncs report.html, dashboard.html, and map.html live!
  // =======================================================
  const syncChannel =
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("civiceye_realtime_channel")
      : null;

  let isApplyingRemoteUpdate = false;

  // Trigger UI refresh on whichever page is currently open
  function refreshCurrentPageUI() {
    try {
      if (typeof window.updateDashboardStats === "function") {
        window.updateDashboardStats();
      }
      if (typeof window.renderReports === "function") {
        window.renderReports();
      }
      if (typeof window.renderMapAndSidebar === "function") {
        window.renderMapAndSidebar(false);
      } else if (typeof window.renderMapMarkers === "function") {
        window.renderMapMarkers();
      }
    } catch (err) {
      console.warn("[CivicEye Sync] UI refresh warning:", err.message);
    }
  }

  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      if (!event.data || !event.data.type) return;
      if (event.data.type === "DATA_UPDATED") {
        refreshCurrentPageUI();
        flashSyncIndicator("Synced across tabs");
      }
    };
  }

  // =======================================================
  // 3. INTERCEPT localStorage.setItem FOR ZERO-CONFIG SYNC
  // Automatically detects saves from report.js & dashboard.js
  // =======================================================
  const originalSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function (key, value) {
    originalSetItem.apply(this, arguments);

    if (isApplyingRemoteUpdate) return;

    if (
      key === REPORTS_STORAGE_KEY ||
      key === BANNED_STORAGE_KEY ||
      key === UPVOTED_STORAGE_KEY
    ) {
      // 1. Notify other open browser tabs immediately
      if (syncChannel) {
        syncChannel.postMessage({ type: "DATA_UPDATED", key, timestamp: Date.now() });
      }

      // 2. Push to Firestore Cloud if connected
      if (window.db && key === REPORTS_STORAGE_KEY) {
        pushReportsToFirestore(value);
      }
      if (window.db && key === BANNED_STORAGE_KEY) {
        pushBannedAccountsToFirestore(value);
      }
    }
  };

  // =======================================================
  // 4. CLOUD FIRESTORE CONNECTION & TWO-WAY SYNC
  // Uses dynamic import() so it works in normal <script> tags
  // =======================================================
  let firestoreModules = null;

  async function initFirebaseCloud() {
    if (!isFirebaseConfigured()) {
      updateStatusBadge("local", "Local Real-Time Sync");
      return;
    }

    try {
      updateStatusBadge("connecting", "Connecting to Cloud...");

      const appModule = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
      );
      const fsModule = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      const app = appModule.initializeApp(FIREBASE_CONFIG);
      const db = fsModule.getFirestore(app);

      firestoreModules = fsModule;

      // Expose exact globals expected by dashboard.js
      window.db = db;
      window.firestoreDoc = fsModule.doc;
      window.firestoreUpdateDoc = fsModule.updateDoc;
      window.firestoreIncrement = fsModule.increment;
      window.firestoreSetDoc = fsModule.setDoc;
      window.firestoreCollection = fsModule.collection;

      updateStatusBadge("online", "Firebase Cloud Live");

      // Push initial local reports if cloud is empty, then listen for live changes
      await startRealtimeCloudListeners(db, fsModule);
    } catch (err) {
      console.warn("[CivicEye Cloud] Falling back to Local Sync:", err.message);
      updateStatusBadge("local", "Local Sync (Offline Fallback)");
    }
  }

  async function pushReportsToFirestore(rawJsonString) {
    if (!window.db || !firestoreModules) return;
    try {
      const reports = JSON.parse(rawJsonString);
      if (!Array.isArray(reports)) return;

      const { doc, setDoc } = firestoreModules;
      for (const report of reports) {
        if (!report.id) continue;
        const ref = doc(window.db, "reports", String(report.id));
        await setDoc(ref, { ...report, updatedAt: Date.now() }, { merge: true });
      }
      flashSyncIndicator("Saved to Cloud ✓");
    } catch (err) {
      console.warn("[CivicEye Cloud] Report sync skipped:", err.message);
    }
  }

  async function pushBannedAccountsToFirestore(rawJsonString) {
    if (!window.db || !firestoreModules) return;
    try {
      const bannedMap = JSON.parse(rawJsonString);
      const { doc, setDoc } = firestoreModules;
      const ref = doc(window.db, "moderation", "banned_accounts");
      await setDoc(ref, { accounts: bannedMap, updatedAt: Date.now() });
      flashSyncIndicator("Moderation synced ✓");
    } catch (err) {
      console.warn("[CivicEye Cloud] Ban list sync skipped:", err.message);
    }
  }

  async function startRealtimeCloudListeners(db, fsModule) {
    const { collection, doc, onSnapshot } = fsModule;

    // 1. Listen to "reports" collection in real time
    const reportsCol = collection(db, "reports");
    onSnapshot(reportsCol, (snapshot) => {
      if (snapshot.empty) {
        // Seed cloud with current localStorage reports on first connect
        const currentLocal = localStorage.getItem(REPORTS_STORAGE_KEY);
        if (currentLocal) pushReportsToFirestore(currentLocal);
        return;
      }

      const cloudReports = [];
      snapshot.forEach((docSnap) => {
        cloudReports.push(docSnap.data());
      });

      // Sort by createdAt descending
      cloudReports.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      isApplyingRemoteUpdate = true;
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(cloudReports));
      isApplyingRemoteUpdate = false;

      refreshCurrentPageUI();
    });

    // 2. Listen to "moderation/banned_accounts" document in real time
    const modRef = doc(db, "moderation", "banned_accounts");
    onSnapshot(modRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (data && data.accounts) {
        isApplyingRemoteUpdate = true;
        localStorage.setItem(BANNED_STORAGE_KEY, JSON.stringify(data.accounts));
        isApplyingRemoteUpdate = false;
        refreshCurrentPageUI();
      }
    });
  }

  // =======================================================
  // 5. FLOATING SYNC STATUS & DEMO RESET WIDGET (UI/UX)
  // =======================================================
  let badgeTextEl = null;
  let badgeDotEl = null;

  function createStatusWidget() {
    if (document.getElementById("civiceyeSyncWidget")) return;

    const widget = document.createElement("div");
    widget.id = "civiceyeSyncWidget";
    widget.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      z-index: 9999;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.92);
      color: #f8fafc;
      padding: 7px 12px;
      border-radius: 999px;
      font-family: 'Inter', sans-serif;
      font-size: 0.76rem;
      font-weight: 600;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
    `;

    widget.innerHTML = `
      <span id="civiceyeSyncDot" style="width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; display: inline-block;"></span>
      <span id="civiceyeSyncText">Initializing Sync...</span>
      <button
        type="button"
        id="civiceyeResetDemoBtn"
        title="Reset localStorage to fresh dummy reports & clear bans"
        style="margin-left: 4px; background: rgba(255,255,255,0.12); color: #cbd5e1; border: none; border-radius: 999px; padding: 3px 8px; font-size: 0.7rem; font-weight: 600; cursor: pointer;"
      >
        ↺ Reset Data
      </button>
    `;

    document.body.appendChild(widget);
    badgeTextEl = document.getElementById("civiceyeSyncText");
    badgeDotEl = document.getElementById("civiceyeSyncDot");

    const resetBtn = document.getElementById("civiceyeResetDemoBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const ok = confirm(
          "Reset all CivicEye reports, upvotes, and banned accounts back to fresh default data?"
        );
        if (!ok) return;
        localStorage.removeItem(REPORTS_STORAGE_KEY);
        localStorage.removeItem(BANNED_STORAGE_KEY);
        localStorage.removeItem(UPVOTED_STORAGE_KEY);
        window.location.reload();
      });
    }
  }

  function updateStatusBadge(state, label) {
    createStatusWidget();
    if (!badgeTextEl || !badgeDotEl) return;

    badgeTextEl.textContent = label;
    if (state === "online") {
      badgeDotEl.style.background = "#22c55e";
      badgeDotEl.style.boxShadow = "0 0 8px #22c55e";
    } else if (state === "connecting") {
      badgeDotEl.style.background = "#f59e0b";
      badgeDotEl.style.boxShadow = "0 0 8px #f59e0b";
    } else {
      badgeDotEl.style.background = "#38bdf8";
      badgeDotEl.style.boxShadow = "0 0 8px #38bdf8";
    }
  }

  function flashSyncIndicator(tempMessage) {
    if (!badgeTextEl) return;
    const prev = badgeTextEl.textContent;
    badgeTextEl.textContent = tempMessage;
    setTimeout(() => {
      if (badgeTextEl.textContent === tempMessage) {
        badgeTextEl.textContent = prev;
      }
    }, 1800);
  }

  // Expose helper utilities globally
  window.CivicEyeCloud = {
    isConfigured: isFirebaseConfigured,
    refreshUI: refreshCurrentPageUI,
    resetDemoData: function () {
      localStorage.removeItem(REPORTS_STORAGE_KEY);
      localStorage.removeItem(BANNED_STORAGE_KEY);
      localStorage.removeItem(UPVOTED_STORAGE_KEY);
      window.location.reload();
    }
  };

  // Start on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFirebaseCloud);
  } else {
    initFirebaseCloud();
  }
})();