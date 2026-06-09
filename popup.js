const submitBtn = document.getElementById("submit-btn");
const profileForm = document.getElementById("profile-form");
const loadingEl = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const successBanner = document.getElementById("success-banner");

const FAILED_SAVE_KEY = "failedSave";

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.remove("hidden");
  successBanner.classList.add("hidden");
}

function showSuccess(msg) {
  successBanner.textContent = msg;
  successBanner.classList.remove("hidden");
  errorBanner.classList.add("hidden");
}

function clearBanners() {
  errorBanner.classList.add("hidden");
  successBanner.classList.add("hidden");
}

function populateDropdowns() {
  const statusEl = document.getElementById("status");
  STATUS_OPTIONS.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    statusEl.appendChild(o);
  });

  const referralEl = document.getElementById("referral");
  REFERRAL_OPTIONS.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    referralEl.appendChild(o);
  });
}

function formatDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function populateForm(details, status) {
  document.getElementById("url").value = details.url || "";
  document.getElementById("name").value = details.name || "";
  document.getElementById("headline").value = details.headline || "";
  document.getElementById("company").value = details.company || "";
  document.getElementById("date").value = formatDate(details.date);
  document.getElementById("status").value = status || "Not Connected";
  if (details.referral) document.getElementById("referral").value = details.referral;
  if (details.notes) document.getElementById("notes").value = details.notes;
}

async function lookupInSheets(url) {
  const resp = await fetch(
    CONFIG.APPS_SCRIPT_URL + "?url=" + encodeURIComponent(url),
    { method: "GET" }
  );
  if (!resp.ok) return null;
  const json = await resp.json();
  return json.found ? json.data : null;
}

async function detectStatusFromPage(tabId) {
  const statusResult = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/detectStatus.js"],
  });
  return statusResult[0]?.result?.status || "Not Connected";
}

async function checkFailedSave() {
  const result = await chrome.storage.local.get(FAILED_SAVE_KEY);
  const failed = result[FAILED_SAVE_KEY];
  if (!failed) return false;

  // Pre-fill form with the failed payload and show error
  const p = failed.payload;
  populateForm(
    { url: p.url, name: p.name, headline: p.headline, company: p.company, date: p.date, referral: p.referral, notes: p.notes },
    p.status
  );
  profileForm.classList.remove("hidden");
  showError(`Previous save failed: ${failed.error}. Review and hit Save to retry.`);
  return true;
}

async function captureProfile() {
  clearBanners();
  loadingEl.classList.remove("hidden");

  try {
    // Check for a previously failed save first
    const hadFailure = await checkFailedSave();
    if (hadFailure) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
      throw new Error("Please open a LinkedIn profile page first.");
    }

    const currentUrl = tab.url.split("?")[0];

    // Always detect live status from page — sheet data can be stale
    const [existing, liveStatus] = await Promise.all([
      lookupInSheets(currentUrl),
      detectStatusFromPage(tab.id),
    ]);

    if (existing) {
      populateForm(existing, liveStatus);
      profileForm.classList.remove("hidden");
      showSuccess("Loaded from Google Sheets. Status refreshed from page.");
      return;
    }

    // New profile — scrape full details from page
    const detailsResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/extractProfileDetails.js"],
    });

    const details = detailsResult[0]?.result;
    if (!details) throw new Error("Could not extract profile details.");

    const missingFields = [];
    if (!details.name) missingFields.push("Name");
    if (!details.company) missingFields.push("Company");
    if (missingFields.length > 0) {
      showError(`Could not auto-detect: ${missingFields.join(", ")}. Please fill in manually.`);
    }

    populateForm(details, liveStatus);
    profileForm.classList.remove("hidden");
  } catch (err) {
    showError(err.message || "Something went wrong.");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

async function submitToSheets() {
  clearBanners();
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  const payload = {
    url: document.getElementById("url").value,
    name: document.getElementById("name").value,
    headline: document.getElementById("headline").value,
    company: document.getElementById("company").value,
    date: document.getElementById("date").value,
    status: document.getElementById("status").value,
    referral: document.getElementById("referral").value,
    notes: document.getElementById("notes").value,
  };

  // Store payload for background worker then close
  await chrome.storage.local.set({ pendingSave: { payload, appsScriptUrl: CONFIG.APPS_SCRIPT_URL } });
  chrome.runtime.sendMessage({ type: "SAVE_TO_SHEETS" });
  window.close();
}

// Auto-capture on popup open
populateDropdowns();
captureProfile();
submitBtn.addEventListener("click", submitToSheets);
