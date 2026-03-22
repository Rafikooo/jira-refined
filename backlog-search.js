(() => {
  "use strict";

  const CARD_SELECTOR =
    '[data-testid^="software-backlog.card-list.card.content-container"]';
  const SEARCH_FIELD_SELECTOR =
    '[data-testid="software-filters.ui.stateless.search-field"]';

  let counterEl = null;
  let currentIndex = -1;

  function isBacklogPage() {
    return window.location.href.includes("/backlog");
  }

  function getSearchInput() {
    return document.querySelector(`${SEARCH_FIELD_SELECTOR} input`);
  }

  function getVisibleCards() {
    return document.querySelectorAll(CARD_SELECTOR);
  }

  function createCounter() {
    if (counterEl) return counterEl;

    const wrapper = document.querySelector(SEARCH_FIELD_SELECTOR);
    if (!wrapper) return null;

    counterEl = document.createElement("span");
    counterEl.className = "jr-search-counter";
    wrapper.style.position = "relative";
    wrapper.appendChild(counterEl);
    return counterEl;
  }

  function updateCounter() {
    const input = getSearchInput();
    if (!input) return;

    const counter = createCounter();
    if (!counter) return;

    const query = input.value.trim();
    if (!query) {
      counter.style.display = "none";
      currentIndex = -1;
      return;
    }

    const cards = getVisibleCards();
    counter.style.display = "flex";

    if (cards.length === 0) {
      counter.textContent = "0";
      counter.classList.add("jr-search-counter-zero");
    } else {
      // Clamp currentIndex
      if (currentIndex < 0 || currentIndex >= cards.length) {
        currentIndex = -1;
      }
      counter.textContent =
        currentIndex >= 0
          ? `${currentIndex + 1}/${cards.length}`
          : `${cards.length}`;
      counter.classList.remove("jr-search-counter-zero");
    }
  }

  function scrollToCard(index) {
    const cards = getVisibleCards();
    if (cards.length === 0) return;

    currentIndex = index % cards.length;
    const card = cards[currentIndex];

    // Remove previous highlight
    document
      .querySelectorAll(".jr-search-highlight")
      .forEach((el) => el.classList.remove("jr-search-highlight"));

    // Highlight and scroll
    card.classList.add("jr-search-highlight");
    card.scrollIntoView({ behavior: "smooth", block: "center" });

    updateCounter();
  }

  function init() {
    if (!isBacklogPage()) return;

    const input = getSearchInput();
    if (!input) return;
    if (input.dataset.jrEnhanced) return;
    input.dataset.jrEnhanced = "true";

    // Update counter on input changes
    let debounce = null;
    input.addEventListener("input", () => {
      currentIndex = -1;
      document
        .querySelectorAll(".jr-search-highlight")
        .forEach((el) => el.classList.remove("jr-search-highlight"));
      if (debounce) clearTimeout(debounce);
      // Delay to let Jira filter the list first
      debounce = setTimeout(updateCounter, 400);
    });

    // Enter to navigate between results
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const cards = getVisibleCards();
        if (cards.length === 0) return;

        if (e.shiftKey) {
          // Shift+Enter = previous
          currentIndex =
            currentIndex <= 0 ? cards.length - 1 : currentIndex - 1;
        } else {
          // Enter = next
          currentIndex =
            currentIndex >= cards.length - 1 ? 0 : currentIndex + 1;
        }
        scrollToCard(currentIndex);
      }
    });

    // Also watch for DOM changes (Jira re-renders list on filter)
    const scrollable = document.querySelector(
      '[data-testid="software-backlog.backlog-content.scrollable"]'
    );
    if (scrollable) {
      let mutDebounce = null;
      const observer = new MutationObserver(() => {
        if (!input.value.trim()) return;
        if (mutDebounce) clearTimeout(mutDebounce);
        mutDebounce = setTimeout(updateCounter, 300);
      });
      observer.observe(scrollable, { childList: true, subtree: true });
    }
  }

  // SPA navigation support
  let lastUrl = "";
  const navObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      counterEl = null;
      currentIndex = -1;
      if (isBacklogPage()) {
        setTimeout(init, 1000);
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(init, 1000);
      navObserver.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    setTimeout(init, 1000);
    navObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
