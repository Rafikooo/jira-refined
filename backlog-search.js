(() => {
  "use strict";

  const CARD_SELECTOR =
    '[data-testid^="software-backlog.card-list.card.content-container"]';
  const SEARCH_FIELD_SELECTOR =
    '[data-testid="software-filters.ui.stateless.search-field"]';

  let counterEl = null;
  let currentIndex = -1;
  let initialized = false;

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
    if (counterEl && counterEl.isConnected) return counterEl;
    counterEl = null;

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

    document
      .querySelectorAll(".jr-search-highlight")
      .forEach((el) => el.classList.remove("jr-search-highlight"));

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
    initialized = true;

    let debounce = null;
    input.addEventListener("input", () => {
      currentIndex = -1;
      document
        .querySelectorAll(".jr-search-highlight")
        .forEach((el) => el.classList.remove("jr-search-highlight"));
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(updateCounter, 400);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const cards = getVisibleCards();
        if (cards.length === 0) return;

        if (e.shiftKey) {
          currentIndex =
            currentIndex <= 0 ? cards.length - 1 : currentIndex - 1;
        } else {
          currentIndex =
            currentIndex >= cards.length - 1 ? 0 : currentIndex + 1;
        }
        scrollToCard(currentIndex);
      }
    });

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

  // Watch for DOM changes from document_start - retry until search field appears
  let lastUrl = location.href;

  const domObserver = new MutationObserver(() => {
    // URL change detection
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      counterEl = null;
      currentIndex = -1;
      initialized = false;
    }

    if (!isBacklogPage()) return;
    if (initialized) return;

    // Try to init when search field appears in DOM
    if (getSearchInput()) {
      init();
    }
  });

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
