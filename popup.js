const submitBtn = document.getElementById("submit-btn");
const profileForm = document.getElementById("profile-form");
const loadingEl = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const successBanner = document.getElementById("success-banner");

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

async function captureProfile() {
  clearBanners();
  loadingEl.classList.remove("hidden");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
      throw new Error("Please open a LinkedIn profile page first.");
    }

    const currentUrl = tab.url.split("?")[0];

    // Check sheets first — if entry exists, load it directly, trust the saved status
    const existing = await lookupInSheets(currentUrl);
    if (existing) {
      populateForm(existing, existing.status);
      profileForm.classList.remove("hidden");
      showSuccess("Loaded from Google Sheets. Editing existing entry.");
      return;
    }

    // New profile — scrape the page
    const [detailsResult, statusResult] = await Promise.all([
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/extractProfileDetails.js"],
      }),
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/detectStatus.js"],
      }),
    ]);

    const details = detailsResult[0]?.result;
    const statusData = statusResult[0]?.result;

    if (!details) throw new Error("Could not extract profile details.");

    const missingFields = [];
    if (!details.name) missingFields.push("Name");
    if (!details.company) missingFields.push("Company");
    if (missingFields.length > 0) {
      showError(`Could not auto-detect: ${missingFields.join(", ")}. Please fill in manually.`);
    }

    populateForm(details, statusData?.status || "Not Connected");
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

  try {
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    showSuccess("Saved to Google Sheets!");
    submitBtn.textContent = "Saved!";
    submitBtn.disabled = true;
  } catch (err) {
    showError("Failed to save. Check your Apps Script URL in config.js.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Save to Google Sheets";
  }
}

// Auto-capture on popup open
populateDropdowns();
captureProfile();
submitBtn.addEventListener("click", submitToSheets);
