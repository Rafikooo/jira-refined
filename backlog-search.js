(() => {
  "use strict";

  function isBacklogPage() {
    return window.location.href.includes("/backlog");
  }

  function getSearchInput() {
    return document.querySelector(
      '[data-testid="software-filters.ui.stateless.search-field"] input'
    );
  }

  function init() {
    document.addEventListener("keydown", (e) => {
      if (!isBacklogPage()) return;
      if (e.key === "f" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const input = getSearchInput();
        if (!input) return;

        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
