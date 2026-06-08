function extractProfileURL() {
  return window.location.href.split("?")[0];
}

function extractName() {
  // The name h2 is always inside an <a> that links to the profile's own URL
  const profilePath = window.location.pathname; // e.g. /in/avery-rodgers-57519b133/
  const anchors = document.querySelectorAll("a[href]");
  for (const a of anchors) {
    try {
      const href = new URL(a.href, location.origin).pathname.replace(/\/$/, "");
      const profile = profilePath.replace(/\/$/, "");
      if (href === profile) {
        const h2 = a.querySelector("h2");
        if (h2) {
          const text = h2.innerText.trim();
          if (text && text.length > 1) return text;
        }
      }
    } catch (_) {}
  }

  // Fallback: first h2 that doesn't look like a UI label
  const h2s = document.querySelectorAll("h2");
  for (const h2 of h2s) {
    const text = h2.innerText.trim();
    if (
      text &&
      text.length > 1 &&
      !text.match(/^\d/) &&
      !text.toLowerCase().includes("notification") &&
      !text.toLowerCase().includes("message")
    ) {
      return text;
    }
  }
  return "";
}

function getTopCardSection() {
  // Find the section containing the name h2 — this is the profile top card
  const profilePath = window.location.pathname.replace(/\/$/, "");
  const anchors = document.querySelectorAll("a[href]");
  for (const a of anchors) {
    try {
      const href = new URL(a.href, location.origin).pathname.replace(/\/$/, "");
      if (href === profilePath && a.querySelector("h2")) {
        return a.closest("section") || a.closest("div[class]") || null;
      }
    } catch (_) {}
  }
  return null;
}

function extractHeadline() {
  const name = extractName();
  const topCard = getTopCardSection();

  // Only search within the top card section
  const scope = topCard || document;
  const paragraphs = scope.querySelectorAll("p");

  for (const p of paragraphs) {
    const text = p.innerText.trim();
    const lower = text.toLowerCase();
    if (
      text &&
      text.length > 5 &&
      text !== name &&
      !text.includes("·") &&
      !text.match(/^\d/) &&
      !lower.includes("connection") &&
      !lower.includes("mutual") &&
      !lower.includes("contact info") &&
      !lower.match(/^(she|her|he|him|they|them|ze|hir|she\/her|he\/him|they\/them)$/)
    ) {
      return text;
    }
  }
  return "";
}

function extractCompany() {
  // Strategy 1: the top card shows company logo buttons — each has a <span> with company name
  // These are the most reliable as they are explicitly the current company
  const topCard = getTopCardSection();
  if (topCard) {
    const buttons = topCard.querySelectorAll("[role='button'], [tabindex='0']");
    for (const btn of buttons) {
      const figure = btn.querySelector("figure");
      if (!figure) continue;
      const spans = btn.querySelectorAll("span");
      for (const span of spans) {
        const text = span.innerText.trim();
        if (
          text && text.length > 1 && text.length < 80 &&
          span.children.length === 0 &&
          !text.includes("·") &&
          !text.match(/^\d/) &&
          !["Message", "Connect", "Follow", "More", "1st", "2nd", "3rd"].includes(text)
        ) {
          return text;
        }
      }
    }
  }

  // Strategy 2: parse "@ Company" from headline
  const headline = extractHeadline();
  if (headline.includes(" @ ")) {
    return headline.split(" @ ").pop().trim().replace(/[\u{1F300}-\u{1FFFF}]/gu, "").trim();
  }
  if (headline.includes(" at ")) {
    const parts = headline.split(/\s+at\s+/);
    if (parts.length >= 2) return parts.pop().trim();
  }

  return "";
}

function extractAllProfileDetails() {
  return {
    url: extractProfileURL(),
    name: extractName(),
    headline: extractHeadline(),
    company: extractCompany(),
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

extractAllProfileDetails();
