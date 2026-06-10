const FAILED_SAVE_KEY = "failedSave";

// Keep service worker alive during long fetches (prevents cold-start kills)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepAlive") {
    port.onDisconnect.addListener(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SAVE_TO_SHEETS") {
    handleSave();
  }
  return true;
});

async function handleSave() {
  const result = await chrome.storage.local.get("pendingSave");
  const pending = result.pendingSave;
  if (!pending) return;

  await chrome.storage.local.remove("pendingSave");
  await saveInBackground(pending.payload, pending.appsScriptUrl);
}

async function saveInBackground(payload, appsScriptUrl) {
  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    // Success — clear any previous failure state and show green checkmark briefly
    await chrome.storage.local.remove(FAILED_SAVE_KEY);
    await chrome.action.setBadgeText({ text: "✓" });
    await chrome.action.setBadgeBackgroundColor({ color: "#28a745" });
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: "" });
    }, 2500);
  } catch (err) {
    // Store failed payload and show badge
    await chrome.storage.local.set({
      [FAILED_SAVE_KEY]: { payload, error: err.message }
    });
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#cc0000" });
  }
}
