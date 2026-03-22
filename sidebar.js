(() => {
  "use strict";

  const SPACES_SELECTOR = '[data-testid="NAV4_jira.sidebar.projects"]';
  const STARRED_SECTION_ID = "jr-starred-inline";
  const CACHE_KEY = "jr-starred-items";
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  let lastCollapsedUrl = "";
  let starredItems = null;

  // ── LocalStorage cache ────────────────────────────────

  function getCachedStarred() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { items, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return items;
    } catch {
      return null;
    }
  }

  function setCachedStarred(items) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ items, ts: Date.now() })
      );
    } catch {
      // storage full or blocked
    }
  }

  // ── Spaces auto-collapse ──────────────────────────────

  function collapseSpaces() {
    const spacesBtn = document.querySelector(SPACES_SELECTOR);
    if (!spacesBtn) return false;

    if (spacesBtn.getAttribute("aria-expanded") === "true") {
      if (lastCollapsedUrl !== window.location.href) {
        spacesBtn.click();
        lastCollapsedUrl = window.location.href;
      }
    }

    document.body.classList.add("jr-spaces-ready");
    return true;
  }

  // ── Starred items: invisible scrape from popup ────────

  function getStarredButton() {
    return [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Starred"
    );
  }

  function scrapeStarredItems() {
    return new Promise((resolve) => {
      const btn = getStarredButton();
      if (!btn) return resolve([]);

      // Hide popup visually during scrape
      document.body.classList.add("jr-scraping");

      btn.click();

      setTimeout(() => {
        const items = [];
        const links = document.querySelectorAll("a[href]");
        for (const link of links) {
          const rect = link.getBoundingClientRect();
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

        // Close popup and remove scraping guard
        btn.click();
        setTimeout(() => {
          document.body.classList.remove("jr-scraping");
        }, 100);

        // Cache for next load
        setCachedStarred(items);

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
    if (!collapseSpaces()) {
      setTimeout(init, 500);
      return;
    }

    // Use cached starred items if available (no popup flash)
    if (!starredItems) {
      starredItems = getCachedStarred();
    }

    // If no cache, scrape invisibly
    if (!starredItems) {
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
      document.body.classList.remove("jr-spaces-ready");
      setTimeout(() => {
        collapseSpaces();
        if (!document.getElementById(STARRED_SECTION_ID) && starredItems) {
          renderStarredInline(starredItems);
        }
      }, 300);
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
