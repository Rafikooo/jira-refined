(() => {
  "use strict";

  let injected = false;
  let issueCache = null;

  function getBoardId() {
    const match = window.location.href.match(/boards\/(\d+)/);
    return match ? match[1] : null;
  }

  function isBacklogPage() {
    return window.location.href.includes("/backlog");
  }

  async function fetchAllIssues(boardId) {
    if (issueCache) return issueCache;

    const allIssues = [];
    let startAt = 0;
    const maxResults = 100;

    while (true) {
      const resp = await fetch(
        `/rest/agile/1.0/board/${boardId}/issue?startAt=${startAt}&maxResults=${maxResults}&fields=summary,status`,
        { credentials: "same-origin" }
      );
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();

      for (const issue of data.issues || []) {
        allIssues.push({
          key: issue.key,
          summary: issue.fields?.summary || "",
          status: issue.fields?.status?.name || "",
        });
      }

      if (startAt + maxResults >= data.total) break;
      startAt += maxResults;
    }

    issueCache = allIssues;
    return allIssues;
  }

  function injectSearchableList(issues) {
    const existing = document.getElementById("jr-searchable-backlog");
    if (existing) existing.remove();

    const scrollable = document.querySelector(
      '[data-testid="software-backlog.backlog-content.scrollable"]'
    );
    if (!scrollable) return;

    const container = document.createElement("div");
    container.id = "jr-searchable-backlog";

    const header = document.createElement("div");
    header.className = "jr-sbl-header";
    header.innerHTML = `<span class="jr-sbl-title">Wszystkie taski (${issues.length})</span>`;
    header.addEventListener("click", () => {
      const list = container.querySelector(".jr-sbl-list");
      const isCollapsed = list.style.display === "none";
      list.style.display = isCollapsed ? "" : "none";
      header.querySelector(".jr-sbl-toggle").textContent = isCollapsed
        ? "\u25BC"
        : "\u25B6";
    });

    const toggle = document.createElement("span");
    toggle.className = "jr-sbl-toggle";
    toggle.textContent = "\u25BC";
    header.prepend(toggle);

    container.appendChild(header);

    const list = document.createElement("div");
    list.className = "jr-sbl-list";

    for (const issue of issues) {
      const row = document.createElement("a");
      row.className = "jr-sbl-row";
      row.href = `/browse/${issue.key}`;

      const key = document.createElement("span");
      key.className = "jr-sbl-key";
      key.textContent = issue.key;

      const summary = document.createElement("span");
      summary.className = "jr-sbl-summary";
      summary.textContent = issue.summary;

      const status = document.createElement("span");
      status.className = "jr-sbl-status";
      status.textContent = issue.status;

      row.appendChild(key);
      row.appendChild(summary);
      row.appendChild(status);
      list.appendChild(row);
    }

    container.appendChild(list);

    // Append inside the scrollable container so Ctrl+F scrolls naturally
    scrollable.appendChild(container);
  }

  function showLoadingIndicator() {
    const scrollable = document.querySelector(
      '[data-testid="software-backlog.backlog-content.scrollable"]'
    );
    if (!scrollable) return;

    const indicator = document.createElement("div");
    indicator.id = "jr-searchable-loading";
    indicator.className = "jr-sbl-loading";
    indicator.textContent = "Ladowanie wszystkich taskow...";
    scrollable.appendChild(indicator);
    return indicator;
  }

  async function init() {
    if (!isBacklogPage()) return;
    if (injected) return;

    const boardId = getBoardId();
    if (!boardId) return;

    // Wait for backlog to render
    const scrollable = document.querySelector(
      '[data-testid="software-backlog.backlog-content.scrollable"]'
    );
    if (!scrollable) return;

    injected = true;
    const loading = showLoadingIndicator();

    try {
      const issues = await fetchAllIssues(boardId);
      if (loading) loading.remove();
      injectSearchableList(issues);
    } catch (err) {
      if (loading) loading.textContent = `Blad: ${err.message}`;
    }
  }

  // Jira is SPA - watch for navigation to backlog
  let lastUrl = "";
  function checkNavigation() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      injected = false;
      const existing = document.getElementById("jr-searchable-backlog");
      if (existing) existing.remove();
      if (isBacklogPage()) {
        setTimeout(() => init(), 1000);
      }
    }
  }

  const observer = new MutationObserver(checkNavigation);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => init(), 1000);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    setTimeout(() => init(), 1000);
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
