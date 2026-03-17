(() => {
  "use strict";

  const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  const CLOSE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const COPY_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const CHECK_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SPINNER = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="jr-spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;

  let panel = null;
  let issueCache = null;
  let cacheKey = null;

  function getBoardId() {
    const match = window.location.href.match(/boards\/(\d+)/);
    return match ? match[1] : null;
  }

  function getProjectKey() {
    const match = window.location.href.match(/projects\/([A-Z]+)/);
    return match ? match[1] : null;
  }

  function isBacklogPage() {
    return window.location.href.includes("/backlog");
  }

  async function fetchAllIssues(boardId) {
    const key = `board-${boardId}`;
    if (issueCache && cacheKey === key) return issueCache;

    const allIssues = [];
    let startAt = 0;
    const maxResults = 100;

    while (true) {
      const resp = await fetch(
        `/rest/agile/1.0/board/${boardId}/issue?startAt=${startAt}&maxResults=${maxResults}&fields=summary,status,issuetype,priority`,
        { credentials: "same-origin" }
      );
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();

      for (const issue of data.issues || []) {
        allIssues.push({
          key: issue.key,
          summary: issue.fields?.summary || "",
          status: issue.fields?.status?.name || "",
          type: issue.fields?.issuetype?.name || "",
          priority: issue.fields?.priority?.name || "",
        });
      }

      if (startAt + maxResults >= data.total) break;
      startAt += maxResults;
    }

    issueCache = allIssues;
    cacheKey = key;
    return allIssues;
  }

  function filterIssues(issues, query) {
    if (!query) return issues;
    const q = query.toLowerCase();
    return issues.filter(
      (i) =>
        i.key.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
    );
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  }

  function copyKey(key, btn) {
    navigator.clipboard.writeText(key).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = key;
      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    });
    btn.innerHTML = CHECK_ICON;
    btn.classList.add("jr-copied");
    setTimeout(() => {
      btn.innerHTML = COPY_ICON;
      btn.classList.remove("jr-copied");
    }, 1200);
  }

  function renderResults(container, issues, query) {
    container.innerHTML = "";

    if (issues.length === 0) {
      container.innerHTML = `<div class="jr-no-results">Brak wynikow</div>`;
      return;
    }

    for (const issue of issues.slice(0, 100)) {
      const row = document.createElement("a");
      row.className = "jr-result-row";
      row.href = `/browse/${issue.key}`;
      row.target = "_blank";

      const copyBtn = document.createElement("button");
      copyBtn.className = "jr-result-copy";
      copyBtn.innerHTML = COPY_ICON;
      copyBtn.title = issue.key;
      copyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyKey(issue.key, copyBtn);
      });

      const keySpan = document.createElement("span");
      keySpan.className = "jr-result-key";
      keySpan.innerHTML = highlightMatch(issue.key, query);

      const summarySpan = document.createElement("span");
      summarySpan.className = "jr-result-summary";
      summarySpan.innerHTML = highlightMatch(issue.summary, query);

      const statusSpan = document.createElement("span");
      statusSpan.className = "jr-result-status";
      statusSpan.textContent = issue.status;

      row.appendChild(copyBtn);
      row.appendChild(keySpan);
      row.appendChild(summarySpan);
      row.appendChild(statusSpan);
      container.appendChild(row);
    }
  }

  function createPanel() {
    if (panel) {
      panel.style.display = "flex";
      const input = panel.querySelector(".jr-search-input");
      input?.focus();
      return;
    }

    panel = document.createElement("div");
    panel.className = "jr-search-panel";
    panel.innerHTML = `
      <div class="jr-search-header">
        <div class="jr-search-input-wrap">
          <span class="jr-search-icon">${SEARCH_ICON}</span>
          <input type="text" class="jr-search-input" placeholder="Szukaj po kluczu, tytule lub statusie..." />
          <span class="jr-search-count"></span>
        </div>
        <button class="jr-search-close">${CLOSE_ICON}</button>
      </div>
      <div class="jr-search-loading">${SPINNER} Pobieranie taskow...</div>
      <div class="jr-search-results"></div>
    `;
    document.body.appendChild(panel);

    const input = panel.querySelector(".jr-search-input");
    const results = panel.querySelector(".jr-search-results");
    const countEl = panel.querySelector(".jr-search-count");
    const loading = panel.querySelector(".jr-search-loading");
    const closeBtn = panel.querySelector(".jr-search-close");

    closeBtn.addEventListener("click", () => {
      panel.style.display = "none";
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        panel.style.display = "none";
      }
    });

    // Prevent Jira from capturing our keystrokes
    input.addEventListener("keydown", (e) => e.stopPropagation());
    input.addEventListener("keyup", (e) => e.stopPropagation());
    input.addEventListener("keypress", (e) => e.stopPropagation());

    const boardId = getBoardId();
    if (!boardId) {
      loading.textContent = "Nie znaleziono board ID w URL";
      return;
    }

    fetchAllIssues(boardId)
      .then((issues) => {
        loading.style.display = "none";
        countEl.textContent = `${issues.length}`;
        renderResults(results, issues, "");

        let debounce = null;
        input.addEventListener("input", () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            const q = input.value.trim();
            const filtered = filterIssues(issues, q);
            countEl.textContent = q
              ? `${filtered.length} / ${issues.length}`
              : `${issues.length}`;
            renderResults(results, filtered, q);
          }, 150);
        });

        input.focus();
      })
      .catch((err) => {
        loading.textContent = `Blad: ${err.message}`;
      });
  }

  function injectTriggerButton() {
    if (document.querySelector(".jr-search-trigger")) return;
    if (!isBacklogPage()) return;

    const searchBar = document.querySelector(
      '[data-testid="software-backlog.header.search-field"]'
    );
    const target = searchBar?.parentElement || document.querySelector('[data-testid="software-backlog.backlog"]');
    if (!target) return;

    const btn = document.createElement("button");
    btn.className = "jr-search-trigger";
    btn.innerHTML = `${SEARCH_ICON} <span>Szukaj wszystko</span>`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      createPanel();
    });

    target.insertAdjacentElement("afterbegin", btn);
  }

  function init() {
    // Keyboard shortcut: Ctrl+Shift+F
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        if (panel?.style.display !== "none" && panel) {
          panel.style.display = "none";
        } else {
          createPanel();
        }
      }
    });

    // Inject trigger button on backlog pages
    if (isBacklogPage()) {
      injectTriggerButton();
      const observer = new MutationObserver(() => injectTriggerButton());
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
