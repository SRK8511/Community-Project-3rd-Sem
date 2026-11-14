// Syncs Homepage Statistics with the live reports in localStorage
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("civiceye_reports");
  if (!saved) return;

  const reports = JSON.parse(saved);
  const total = reports.length;
  const resolved = reports.filter(r => r.status === "Resolved").length;
  const active = total - resolved;
  const totalUpvotes = reports.reduce((sum, r) => sum + (r.upvotes || 0), 0);

  const elTotal = document.getElementById("homeTotal");
  const elResolved = document.getElementById("homeResolved");
  const elActive = document.getElementById("homeActive");
  const elUpvotes = document.getElementById("homeUpvotes");

  if (elTotal) elTotal.textContent = total;
  if (elResolved) elResolved.textContent = resolved;
  if (elActive) elActive.textContent = active;
  if (elUpvotes) elUpvotes.textContent = totalUpvotes;
});