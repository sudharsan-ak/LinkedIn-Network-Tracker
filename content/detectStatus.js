function detectConnectionStatus() {
  const allLinks = document.querySelectorAll("a[aria-label]");

  // Check Connected first — bell icon is unique to connected profiles
  for (const a of allLinks) {
    const label = a.getAttribute("aria-label").toLowerCase();
    if (label.includes("manage notifications about")) return "Connected";
  }

  // Check Pending
  for (const a of allLinks) {
    const label = a.getAttribute("aria-label").toLowerCase();
    if (label.includes("pending")) return "Connection Sent";
  }

  // Check Not Connected
  for (const a of allLinks) {
    const label = a.getAttribute("aria-label").toLowerCase();
    if (label.includes("to connect")) return "Not Connected";
  }

  return "Not Connected";
}

({ status: detectConnectionStatus() });
