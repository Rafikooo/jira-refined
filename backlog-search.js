(() => {
  "use strict";

  let initialized = false;
  let shadowContainer = null;
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

  function getRenderedKeys() {
    const keys = new Set();
    const els = document.querySelectorAll(
      '[data-testid="software-backlog.card-list.card.card-contents.key"]'
    );
    for (const el of els) {
      const text = el.textContent.trim();
      if (text) keys.add(text);
    }
    return keys;
  }

  function updateShadowVisibility() {
    if (!shadowContainer) return;
    const renderedKeys = getRenderedKeys();
    const items = shadowContainer.querySelectorAll("[data-jr-key]");
    for (const item of items) {
      const key = item.getAttribute("data-jr-key");
      if (renderedKeys.has(key)) {
        // Jira has this in DOM - hide shadow from Ctrl+F
        item.style.visibility = "hidden";
        item.style.opacity = "";
      } else {
        // Jira doesn't have this - make shadow findable
        item.style.visibility = "";
        item.style.opacity = "0";
      }
    }
  }

  function injectShadowList(issues) {
    if (shadowContainer) shadowContainer.remove();

    const scrollable = document.querySelector(
      '[data-testid="software-backlog.backlog-content.scrollable"]'
    );
    if (!scrollable) return;

    shadowContainer = document.createElement("div");
    shadowContainer.id = "jr-shadow-backlog";
    shadowContainer.setAttribute("aria-hidden", "true");

    for (const issue of issues) {
      const item = document.createElement("a");
      item.setAttribute("data-jr-key", issue.key);
      item.href = `/browse/${issue.key}`;
      item.className = "jr-shadow-item";
      // Text content makes it findable by Ctrl+F
      item.textContent = `${issue.key} ${issue.summary}`;
      shadowContainer.appendChild(item);
    }

    scrollable.appendChild(shadowContainer);
    updateShadowVisibility();
  }

  let updateTimer = null;
  function scheduleUpdate() {
    if (updateTimer) return;
    updateTimer = setTimeout(() => {
      updateTimer = null;
      updateShadowVisibility();
    }, 200);
  }

  async function init() {
    if (!isBacklogPage()) return;
    if (initialized) return;

    const boardId = getBoardId();
    if (!boardId) return;

    const scrollable = document.querySelector(
      '[data-testid="software-backlog.backlog-content.scrollable"]'
    );
    if (!scrollable) return;

    initialized = true;

    try {
      const issues = await fetchAllIssues(boardId);
      injectShadowList(issues);

      // Update visibility on scroll (virtual scroll changes rendered items)
      scrollable.addEventListener("scroll", scheduleUpdate, { passive: true });

      // Update on DOM changes (Jira SPA renders/removes items)
      const observer = new MutationObserver(scheduleUpdate);
      observer.observe(scrollable, { childList: true, subtree: true });
    } catch (err) {
      console.error("[Jira Refined] Failed to load issues:", err);
    }
  }

  // Watch for SPA navigation
  let lastUrl = "";
  function checkNavigation() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      initialized = false;
      issueCache = null;
      if (shadowContainer) {
        shadowContainer.remove();
        shadowContainer = null;
      }
      if (isBacklogPage()) {
        setTimeout(() => init(), 1000);
      }
    }
  }

  const navObserver = new MutationObserver(checkNavigation);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => init(), 1000);
      navObserver.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    setTimeout(() => init(), 1000);
    navObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
