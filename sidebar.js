(() => {
  "use strict";

  const SPACES_SELECTOR = '[data-testid="NAV4_jira.sidebar.projects"]';
  const STARRED_SECTION_ID = "jr-starred-inline";

  let lastCollapsedUrl = "";
  let starredItems = null;

  // ── Spaces auto-collapse ──────────────────────────────

  function collapseSpaces() {
    const spacesBtn = document.querySelector(SPACES_SELECTOR);
    if (!spacesBtn) return false;
    if (spacesBtn.getAttribute("aria-expanded") !== "true") return true;
    if (lastCollapsedUrl === window.location.href) return true;

    spacesBtn.click();
    lastCollapsedUrl = window.location.href;
    return true;
  }

  // ── Starred items: scrape from popup ──────────────────

  function getStarredButton() {
    return [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Starred"
    );
  }

  function scrapeStarredItems() {
    return new Promise((resolve) => {
      const btn = getStarredButton();
      if (!btn) return resolve([]);

      // Open popup
      btn.click();

      setTimeout(() => {
        const items = [];
        const links = document.querySelectorAll("a[href]");
        for (const link of links) {
          const rect = link.getBoundingClientRect();
          // Popup links: center area, between search box and "View all" link
          if (
            rect.top > 180 &&
            rect.top < 550 &&
            rect.left > 150 &&
            rect.left < 600 &&
            rect.width > 100
          ) {
            const text = link.textContent.trim();
            if (text === "View all starred items") continue;
            items.push({ name: text, href: link.href });
          }
        }

        // Close popup
        btn.click();

        resolve(items);
      }, 600);
    });
  }

  // ── Render starred inline ─────────────────────────────

  function renderStarredInline(items) {
    if (document.getElementById(STARRED_SECTION_ID)) return;
    if (!items.length) return;

    const starredBtn = getStarredButton();
    if (!starredBtn) return;

    // Find the parent container to insert after
    const section = starredBtn.parentElement;
    if (!section) return;

    const container = document.createElement("div");
    container.id = STARRED_SECTION_ID;

    for (const item of items) {
      const link = document.createElement("a");
      link.className = "jr-starred-link";
      link.href = item.href;
      link.textContent = item.name;
      container.appendChild(link);
    }

    section.insertAdjacentElement("afterend", container);
  }

  // ── Init ──────────────────────────────────────────────

  async function init() {
    // Collapse spaces
    if (!collapseSpaces()) {
      setTimeout(init, 500);
      return;
    }

    // Scrape and render starred (once)
    if (!starredItems) {
      // Small delay to let sidebar fully render
      await new Promise((r) => setTimeout(r, 300));
      starredItems = await scrapeStarredItems();
    }

    if (document.getElementById(STARRED_SECTION_ID)) return;
    renderStarredInline(starredItems);
  }

  // ── SPA navigation ────────────────────────────────────

  let lastUrl = "";
  const navObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      // Re-collapse spaces on navigation
      setTimeout(() => {
        collapseSpaces();
        // Re-render starred if removed by Jira re-render
        if (!document.getElementById(STARRED_SECTION_ID) && starredItems) {
          renderStarredInline(starredItems);
        }
      }, 500);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(init, 800);
      navObserver.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    setTimeout(init, 800);
    navObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
