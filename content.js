(() => {
  "use strict";

  const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  const BUTTON_CLASS = "jp-copy-btn";

  // Board view: card keys
  const BOARD_KEY_SELECTOR = '[data-testid="platform-card.common.ui.key.key"]';
  // Backlog view: issue keys
  const BACKLOG_KEY_SELECTOR = '[data-testid="software-backlog.card-list.card.card-contents.accessible-card-key"]';

  function getIssueUrl(issueKey) {
    return `${window.location.origin}/browse/${issueKey}`;
  }

  function copyAsRichLink(issueKey) {
    const url = getIssueUrl(issueKey);
    const html = `<a href="${url}">${issueKey}</a>`;
    const blob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([issueKey], { type: "text/plain" });
    const item = new ClipboardItem({
      "text/html": blob,
      "text/plain": textBlob,
    });
    return navigator.clipboard.write([item]).catch(() => {
      // Fallback: copy plain text
      const ta = document.createElement("textarea");
      ta.value = issueKey;
      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    });
  }

  function showCopiedFeedback(btn) {
    btn.innerHTML = CHECK_ICON;
    btn.classList.add("jp-copied");
    setTimeout(() => {
      btn.innerHTML = COPY_ICON;
      btn.classList.remove("jp-copied");
    }, 1500);
  }

  function createCopyButton(issueKey) {
    const btn = document.createElement("button");
    btn.className = BUTTON_CLASS;
    btn.innerHTML = COPY_ICON;
    btn.setAttribute("aria-label", `Copy ${issueKey}`);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyAsRichLink(issueKey).then(() => showCopiedFeedback(btn));
      btn.blur();
    });

    return btn;
  }

  function getIssueKey(container) {
    // Board view: div > a > div with text
    // Backlog view: div > a with text
    const anchor = container.querySelector("a");
    if (anchor) {
      const textDiv = anchor.querySelector("div");
      if (textDiv) return textDiv.textContent.trim();
      return anchor.textContent.trim();
    }
    return container.textContent.trim();
  }

  function injectBoardButtons() {
    const keyElements = document.querySelectorAll(BOARD_KEY_SELECTOR);
    for (const keyEl of keyElements) {
      if (keyEl.querySelector(`.${BUTTON_CLASS}`)) continue;

      const issueKey = getIssueKey(keyEl);
      if (!issueKey) continue;

      const btn = createCopyButton(issueKey);
      keyEl.style.display = "flex";
      keyEl.style.alignItems = "center";
      keyEl.style.direction = "ltr";
      keyEl.appendChild(btn);
    }
  }

  function injectBacklogButtons() {
    const containers = document.querySelectorAll(BACKLOG_KEY_SELECTOR);
    for (const container of containers) {
      if (container.querySelector(`.${BUTTON_CLASS}`)) continue;

      // Get the visible key link (not the screen-reader one)
      const visibleKey = container.querySelector('[data-testid="software-backlog.card-list.card.card-contents.key"]');
      if (!visibleKey) continue;

      const issueKey = visibleKey.textContent.trim();
      if (!issueKey) continue;

      const btn = createCopyButton(issueKey);
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.appendChild(btn);
    }
  }

  function injectCopyButtons() {
    injectBoardButtons();
    injectBacklogButtons();
  }

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectCopyButtons, 300);
  });

  function init() {
    injectCopyButtons();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
