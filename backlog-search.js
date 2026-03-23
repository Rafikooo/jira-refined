(() => {
  "use strict";

  const CARD_SELECTOR =
    '[data-testid^="software-backlog.card-list.card.content-container"]';

  let counterEl = null;
  let currentIndex = -1;
  let initialized = false;

  function isBacklogPage() {
    return window.location.href.includes("/backlog");
  }

  function getSearchInput() {
    // Input may have data-testid directly OR be a child of a testid container
    return (
      document.querySelector(
        'input[data-testid="software-filters.ui.stateless.search-field"]'
      ) ||
      document.querySelector(
        '[data-testid="software-filters.ui.stateless.search-field"] input'
      ) ||
      document.querySelector(
        'input[placeholder="Search backlog"]'
      ) ||
      document.querySelector(
        'input[placeholder*="backlog" i]'
      )
    );
  }

  function getSearchWrapper(input) {
    return (
      input.closest('[data-testid="software-filters.ui.stateless.search-field-container"]') ||
      input.closest('[data-testid="software-filters.ui.stateless.search-field"]') ||
      input.closest('[role="search"]') ||
      input.parentElement
    );
  }

  function getVisibleCards() {
    return document.querySelectorAll(CARD_SELECTOR);
  }

  function createCounter(input) {
    // Remove ALL existing counters to prevent duplicates
    document.querySelectorAll(".jr-search-counter").forEach((el) => el.remove());

    counterEl = document.createElement("span");
    counterEl.className = "jr-search-counter";

    const wrapper = getSearchWrapper(input);
    if (wrapper?.nextElementSibling) {
      wrapper.insertAdjacentElement("afterend", counterEl);
    } else {
      input.parentElement.insertAdjacentElement("afterend", counterEl);
    }
    return counterEl;
  }

  function updateCounter() {
    const input = getSearchInput();
    if (!input) return;

    const counter = createCounter(input);
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

    // Remove previous highlights
    document
      .querySelectorAll(".jr-search-highlight")
      .forEach((el) => el.classList.remove("jr-search-highlight"));

    // Target the innermost visible card element
    const inner =
      card.querySelector('[data-testid="software-backlog.card-list.card.card-contents.card"]') ||
      card.querySelector('[data-testid*="card-contents"]') ||
      card;
    inner.classList.add("jr-search-highlight");
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

    // Change placeholder, widen input, auto-focus
    input.setAttribute("placeholder", "Press 'f' to search, 'esc' to clear");
    const wrapper = getSearchWrapper(input);
    if (wrapper) wrapper.style.minWidth = "280px";
    input.focus();

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
      if (e.key === "Escape") {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.blur();
        document
          .querySelectorAll(".jr-search-highlight")
          .forEach((el) => el.classList.remove("jr-search-highlight"));
        currentIndex = -1;
        updateCounter();
        return;
      }

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

  let lastUrl = location.href;

  // MutationObserver for early detection
  const domObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      counterEl = null;
      currentIndex = -1;
      initialized = false;
    }

    if (!isBacklogPage()) return;

    // Detect if Jira re-rendered the input (loses our jrEnhanced flag)
    const input = getSearchInput();
    if (initialized && input && !input.dataset.jrEnhanced) {
      initialized = false;
    }

    if (initialized) return;
    if (input) init();
  });

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Backup polling - MutationObserver may miss if DOM already built
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      counterEl = null;
      currentIndex = -1;
      initialized = false;
    }
    if (!isBacklogPage()) return;
    if (initialized) return;
    if (getSearchInput()) init();
  }, 1000);
})();
