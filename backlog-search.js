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

  // Use capturing phase to intercept before browser's built-in Cmd+F
  document.addEventListener(
    "keydown",
    (e) => {
      if (!isBacklogPage()) return;
      if (e.key === "f" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const input = getSearchInput();
        if (!input) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        input.focus();
        input.select();
      }
    },
    true
  );
})();
