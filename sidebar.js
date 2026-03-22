(() => {
  "use strict";

  const SPACES_CONTAINER_SELECTOR =
    '[data-testid="NAV4_jira.sidebar.projects-container"]';
  const SPACES_BTN_SELECTOR =
    '[data-testid="NAV4_jira.sidebar.projects"]';
  const STARRED_SECTION_ID = "jr-starred-inline";
  const CACHE_KEY = "jr-starred-items";
  const CACHE_TTL = 1000 * 60 * 30;

  let starredItems = null;
  let spacesListenerAttached = false;
  let scrapingInProgress = false;

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
    } catch {}
  }

  // ── Spaces toggle listener ────────────────────────────

  function attachSpacesToggle(btn) {
    if (spacesListenerAttached) return;
    spacesListenerAttached = true;

    btn.addEventListener("click", () => {
      const container = document.querySelector(SPACES_CONTAINER_SELECTOR);
      if (container) container.classList.toggle("jr-user-expanded");
    });
  }

  // ── Starred items rendering ───────────────────────────

  function renderStarredInline(items, anchorEl) {
    if (document.getElementById(STARRED_SECTION_ID)) return;
    if (!items || !items.length) return;

    const starredBtn =
      anchorEl ||
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === "Starred"
      );
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

  // ── Starred items scraping (invisible) ────────────────

  function scrapeStarredItems() {
    if (scrapingInProgress) return;
    scrapingInProgress = true;

    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Starred"
    );
    if (!btn) {
      scrapingInProgress = false;
      return;
    }

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

      btn.click();
      setTimeout(() => document.body.classList.remove("jr-scraping"), 100);

      starredItems = items;
      setCachedStarred(items);
      renderStarredInline(items);
      scrapingInProgress = false;
    }, 600);
  }

  // ── Core injection (called from MutationObserver) ─────

  function tryInject(root) {
    // Look for the Spaces button in the added subtree
    const spacesBtn = root.matches?.(SPACES_BTN_SELECTOR)
      ? root
      : root.querySelector?.(SPACES_BTN_SELECTOR);

    if (spacesBtn) {
      attachSpacesToggle(spacesBtn);
    }

    // Look for Starred button to inject items
    if (document.getElementById(STARRED_SECTION_ID)) return;

    const starredBtn = root.querySelector
      ? [...(root.querySelectorAll?.("button") || [])].find(
          (b) => b.textContent.trim() === "Starred"
        )
      : null;

    if (!starredBtn && root.textContent?.trim() === "Starred" && root.tagName === "BUTTON") {
      // The added node itself is the Starred button
      injectFromCache(root);
      return;
    }

    if (starredBtn) {
      injectFromCache(starredBtn);
    }
  }

  function injectFromCache(starredBtn) {
    if (document.getElementById(STARRED_SECTION_ID)) return;

    if (!starredItems) {
      starredItems = getCachedStarred();
    }

    if (starredItems) {
      renderStarredInline(starredItems, starredBtn);
    } else {
      // No cache - scrape lazily after page settles
      setTimeout(scrapeStarredItems, 1500);
    }
  }

  // ── MutationObserver from document_start ──────────────
  // Fires as microtask BEFORE paint - injections are flicker-free

  const domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        tryInject(node);
      }
    }
  });

  // Start observing immediately - even before <body> exists
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ── SPA navigation: override history.pushState ────────

  const navScript = document.createElement("script");
  navScript.textContent = `(function(){
    var orig = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function(){
      orig.apply(this, arguments);
      window.dispatchEvent(new Event('jr-navigation'));
    };
    history.replaceState = function(){
      origReplace.apply(this, arguments);
      window.dispatchEvent(new Event('jr-navigation'));
    };
  })();`;
  (document.head || document.documentElement).appendChild(navScript);
  navScript.remove();

  window.addEventListener("jr-navigation", onNavigation);
  window.addEventListener("popstate", onNavigation);

  function onNavigation() {
    // Reset spaces state
    const container = document.querySelector(SPACES_CONTAINER_SELECTOR);
    if (container) container.classList.remove("jr-user-expanded");
    spacesListenerAttached = false;

    // Starred items will be re-injected by MutationObserver
    // when React re-renders the sidebar
  }
})();
