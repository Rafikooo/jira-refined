(() => {
  "use strict";

  const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  const BUTTON_CLASS = "jp-copy-btn";

  // Board view: card keys
  const BOARD_KEY_SELECTOR = '[data-testid="platform-card.common.ui.key.key"]';
  // Backlog view: issue keys
  const BACKLOG_KEY_SELECTOR =
    '[data-testid="software-backlog.card-list.card.card-contents.accessible-card-key"]';
  // Issue detail view
  const ISSUE_KEY_SELECTOR =
    '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]';
  const ISSUE_TITLE_SELECTOR =
    '[data-testid="issue.views.issue-base.foundation.summary.heading"]';
  const PERMALINK_SELECTOR = '[data-testid*="permalink-button"]';

  // ── Clipboard helpers ─────────────────────────────────

  function getIssueUrl(issueKey) {
    return `${window.location.origin}/browse/${issueKey}`;
  }

  function copyRichLink(issueKey, url) {
    const html = `<a href="${url}">${issueKey}</a>`;
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([issueKey], { type: "text/plain" }),
    });
    return navigator.clipboard.write([item]).catch(() => fallbackCopy(issueKey));
  }

  function copyPlainText(text) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }

  function copyRichLinkWithTitle(issueKey, url, title) {
    const html = `<a href="${url}">${issueKey}</a><br>${title}`;
    const plain = `${issueKey}\n${title}`;
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    });
    return navigator.clipboard.write([item]).catch(() => fallbackCopy(plain));
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  // ── UI helpers ────────────────────────────────────────

  function showCopiedFeedback(btn) {
    btn.innerHTML = CHECK_ICON;
    btn.classList.add("jp-copied");
    setTimeout(() => {
      btn.innerHTML = COPY_ICON;
      btn.classList.remove("jp-copied");
    }, 1500);
  }

  function createCopyBtn(onClick) {
    const btn = document.createElement("button");
    btn.className = BUTTON_CLASS;
    btn.innerHTML = COPY_ICON;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick().then(() => showCopiedFeedback(btn));
      btn.blur();
    });
    return btn;
  }

  // ── Board & Backlog copy buttons ──────────────────────

  function getIssueKey(container) {
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

      const btn = createCopyBtn(() =>
        copyRichLink(issueKey, getIssueUrl(issueKey))
      );
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
      const visibleKey = container.querySelector(
        '[data-testid="software-backlog.card-list.card.card-contents.key"]'
      );
      if (!visibleKey) continue;
      const issueKey = visibleKey.textContent.trim();
      if (!issueKey) continue;

      const btn = createCopyBtn(() =>
        copyRichLink(issueKey, getIssueUrl(issueKey))
      );
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.appendChild(btn);
    }
  }

  // ── Issue detail view copy buttons ────────────────────

  function injectIssueDetailButtons() {
    const issueKeyEl = document.querySelector(ISSUE_KEY_SELECTOR);
    const h1 = document.querySelector(ISSUE_TITLE_SELECTOR);
    if (!issueKeyEl || !h1) return;

    const issueKey = issueKeyEl.textContent.trim();
    const url = getIssueUrl(issueKey);
    const title = h1.textContent.trim();

    // 1. Copy rich link button next to issue key in breadcrumb
    const keyParent = issueKeyEl.closest("li") || issueKeyEl.parentElement;
    if (keyParent && !keyParent.querySelector(".jp-copy-link")) {
      const linkBtn = createCopyBtn(() => copyRichLink(issueKey, url));
      linkBtn.classList.add("jp-copy-link", "jp-copy-detail");
      linkBtn.title = issueKey;
      keyParent.style.display = "flex";
      keyParent.style.alignItems = "center";
      keyParent.appendChild(linkBtn);
    }

    // 2. Copy title button - inline after h1 text
    if (!h1.querySelector(".jp-copy-title")) {
      const titleBtn = createCopyBtn(() => copyPlainText(title));
      titleBtn.classList.add("jp-copy-title", "jp-copy-detail");
      titleBtn.title = "Copy title";
      h1.style.display = "flex";
      h1.style.alignItems = "center";
      h1.style.gap = "8px";
      h1.appendChild(titleBtn);
    }

    // 3. Copy link + title - separate row below h1 container
    const headingContainer = h1.closest(
      '[data-testid="issue-field-single-line-text-inline-edit-heading.ui.single-line-text-heading.read-view"]'
    ) || h1.parentElement;
    if (
      headingContainer &&
      !headingContainer.parentElement.querySelector(".jp-copy-combo")
    ) {
      const comboBtn = createCopyBtn(() =>
        copyRichLinkWithTitle(issueKey, url, title)
      );
      comboBtn.classList.add("jp-copy-combo", "jp-copy-detail");
      comboBtn.title = "Copy link + title";
      headingContainer.insertAdjacentElement("afterend", comboBtn);
    }
  }

  // ── Main ──────────────────────────────────────────────

  function injectCopyButtons() {
    injectBoardButtons();
    injectBacklogButtons();
    injectIssueDetailButtons();
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
