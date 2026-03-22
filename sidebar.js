(() => {
  "use strict";

  const SPACES_SELECTOR = '[data-testid="NAV4_jira.sidebar.projects"]';

  let lastCollapsedUrl = "";

  function collapseSpaces() {
    const spacesBtn = document.querySelector(SPACES_SELECTOR);
    if (!spacesBtn) return false;
    if (spacesBtn.getAttribute("aria-expanded") !== "true") return true;

    // Only collapse once per navigation
    if (lastCollapsedUrl === window.location.href) return true;

    spacesBtn.click();
    lastCollapsedUrl = window.location.href;
    return true;
  }

  function init() {
    // Retry until sidebar renders
    if (!collapseSpaces()) {
      setTimeout(init, 500);
      return;
    }
  }

  // Watch for SPA navigation
  let lastUrl = "";
  const navObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(init, 300);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(init, 500);
      navObserver.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    setTimeout(init, 500);
    navObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
