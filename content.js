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

  const FONT = 'style="font-size:16pt;mso-bidi-font-size:16pt;font-family:Calibri,sans-serif;mso-fareast-font-family:Calibri;margin:0;padding:0"';

  function copyRichLink(issueKey, url) {
    const html = `<span ${FONT}><a href="${url}" ${FONT}>${issueKey}</a></span>`;
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
    const html = `<span ${FONT}><a href="${url}" ${FONT}>${issueKey}</a><br>${title}</span>`;
    const plain = `${issueKey}\n${title}`;
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    });
    return navigator.clipboard.write([item]).catch(() => fallbackCopy(plain));
  }

  function copyAsTableRow(issueKey, url, title) {
    const html = `<table ${FONT}><tr><td ${FONT}><a href="${url}" ${FONT}>${issueKey}</a></td><td ${FONT}>${title}</td></tr></table>`;
    const plain = `${issueKey}\t${title}`;
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

    // 3. Copy link + title - separate row below heading
    // Walk up from h1 until we find a block-level container
    let blockParent = h1.parentElement;
    while (blockParent && getComputedStyle(blockParent).display !== "block") {
      blockParent = blockParent.parentElement;
    }
    if (blockParent && !blockParent.querySelector(".jp-copy-combo")) {
      const comboBtn = createCopyBtn(() =>
        copyRichLinkWithTitle(issueKey, url, title)
      );
      comboBtn.classList.add("jp-copy-combo", "jp-copy-detail");
      comboBtn.title = "Copy link + title";
      // Insert as first child of the block parent, after the heading row
      const headingRow = h1.closest(
        '[data-testid="issue-field-single-line-text-inline-edit-heading.ui.single-line-text-heading.read-view"]'
      )?.parentElement || h1.parentElement;
      headingRow.insertAdjacentElement("afterend", comboBtn);
    }
  }

  // ── Sprint report table copy buttons ─────────────────

  const SPACER_CLASS = "jp-report-spacer";
  const SPACER_STORAGE_KEY = "jr-report-spacer";

  function moveSpacerAfterRow(row) {
    // Remove existing spacer
    document.querySelectorAll(`.${SPACER_CLASS}`).forEach((s) => s.remove());

    // Insert spacer after this row
    const spacer = document.createElement("tr");
    spacer.className = SPACER_CLASS;
    const td = document.createElement("td");
    td.colSpan = 99;
    spacer.appendChild(td);
    row.insertAdjacentElement("afterend", spacer);

    // Persist position by issue key
    const link = row.querySelector('a[href*="/browse/"]');
    if (link) {
      try {
        localStorage.setItem(
          SPACER_STORAGE_KEY,
          JSON.stringify({
            key: link.textContent.trim(),
            url: window.location.href.split("?")[0],
          })
        );
      } catch {}
    }
  }

  function restoreSpacerPosition() {
    try {
      const raw = localStorage.getItem(SPACER_STORAGE_KEY);
      if (!raw) return;
      const { key, url } = JSON.parse(raw);
      if (!window.location.href.startsWith(url)) return;

      const rows = document.querySelectorAll("table tr");
      for (const row of rows) {
        const link = row.querySelector('a[href*="/browse/"]');
        if (link?.textContent.trim() === key) {
          moveSpacerAfterRow(row);
          return;
        }
      }
    } catch {}
  }

  function injectReportButtons() {
    const rows = document.querySelectorAll("table tr");
    let injected = false;
    for (const row of rows) {
      if (row.querySelector(".jp-report-btns")) continue;
      const keyCell = row.querySelector("td:first-child");
      const link = keyCell?.querySelector('a[href*="/browse/"]');
      if (!link) continue;

      const summaryCell = row.querySelector("td:nth-child(2)");
      const issueKey = link.textContent.trim();
      const summary = summaryCell?.textContent?.trim() || "";
      const url = link.href;

      const onCopy = (copyFn) => () => {
        return copyFn().then(() => moveSpacerAfterRow(row));
      };

      const wrapper = document.createElement("span");
      wrapper.className = "jp-report-btns";

      const linkBtn = createCopyBtn(onCopy(() => copyRichLink(issueKey, url)));
      linkBtn.title = "Copy link";

      const sep = document.createElement("span");
      sep.className = "jp-report-sep";
      sep.textContent = "|";

      const titleBtn = createCopyBtn(onCopy(() => copyPlainText(summary)));
      titleBtn.title = "Copy title";

      const tableBtn = createCopyBtn(
        onCopy(() => copyAsTableRow(issueKey, url, summary))
      );
      tableBtn.title = "Copy as table row";

      wrapper.appendChild(linkBtn);
      wrapper.appendChild(titleBtn);
      wrapper.appendChild(sep);
      wrapper.appendChild(tableBtn);
      keyCell.prepend(wrapper);
      injected = true;
    }

    // Restore spacer from localStorage on first injection
    if (injected && !document.querySelector(`.${SPACER_CLASS}`)) {
      restoreSpacerPosition();
    }
  }

  // ── Main ──────────────────────────────────────────────

  function injectCopyButtons() {
    injectBoardButtons();
    injectBacklogButtons();
    injectIssueDetailButtons();
    injectReportButtons();
  }

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectCopyButtons, 300);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
