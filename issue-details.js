(() => {
  "use strict";

  const DETAILS_ID = "jr-details-block";

  function getIssueKey() {
    const el = document.querySelector(
      '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]'
    );
    return el?.textContent?.trim();
  }

  function isIssuePage() {
    return /\/browse\/[A-Z]+-\d+/.test(window.location.href);
  }

  async function fetchIssueFields(issueKey) {
    const resp = await fetch(
      `/rest/api/3/issue/${issueKey}?fields=status,issuetype,priority,resolution,labels,assignee,reporter,created,updated,customfield_10014,customfield_10020`,
      { credentials: "same-origin" }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const f = data.fields;

    // Extract active sprint from customfield_10020
    let sprint = null;
    if (Array.isArray(f.customfield_10020)) {
      const active = f.customfield_10020.find((s) => s.state === "active");
      sprint = active?.name || f.customfield_10020[0]?.name || null;
    }

    return {
      type: f.issuetype?.name,
      typeIcon: f.issuetype?.iconUrl,
      priority: f.priority?.name,
      priorityIcon: f.priority?.iconUrl,
      status: f.status?.name,
      statusCategory: f.status?.statusCategory?.colorName,
      resolution: f.resolution?.name || "Unresolved",
      labels: f.labels?.length ? f.labels.join(", ") : "None",
      assignee: f.assignee?.displayName || "Unassigned",
      assigneeAvatar: f.assignee?.avatarUrls?.["16x16"],
      reporter: f.reporter?.displayName,
      reporterAvatar: f.reporter?.avatarUrls?.["16x16"],
      created: formatDate(f.created),
      updated: formatDate(f.updated),
      epicName: f.customfield_10014,
      sprint: sprint,
    };
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function statusClass(colorName) {
    if (colorName === "green") return "jr-status-done";
    if (colorName === "blue-gray") return "jr-status-todo";
    return "jr-status-progress";
  }

  function renderDetailsBlock(fields) {
    const existing = document.getElementById(DETAILS_ID);
    if (existing) existing.remove();

    const block = document.createElement("div");
    block.id = DETAILS_ID;

    const rows = [
      ["Type", iconVal(fields.typeIcon, fields.type)],
      ["Priority", iconVal(fields.priorityIcon, fields.priority)],
      ["Status", `<span class="jr-d-status ${statusClass(fields.statusCategory)}">${fields.status}</span>`],
      ["Resolution", fields.resolution],
      ["Labels", fields.labels],
    ];

    if (fields.epicName) rows.push(["Epic", fields.epicName]);
    if (fields.sprint) rows.push(["Sprint", fields.sprint]);

    const rightRows = [
      ["Assignee", avatarVal(fields.assigneeAvatar, fields.assignee)],
      ["Reporter", avatarVal(fields.reporterAvatar, fields.reporter)],
      ["Created", fields.created],
      ["Updated", fields.updated],
    ];

    block.innerHTML = `
      <div class="jr-d-header">Details</div>
      <div class="jr-d-grid">
        <div class="jr-d-col">${rows.map((r) => row(r[0], r[1])).join("")}</div>
        <div class="jr-d-col">${rightRows.map((r) => row(r[0], r[1])).join("")}</div>
      </div>
    `;

    // Insert before Description section
    const descLabel = document.querySelector(
      '[data-testid="issue.views.issue-base.common.description.label"]'
    );
    const insertTarget =
      descLabel?.closest('[data-testid="issue.views.field.rich-text.description"]')?.parentElement ||
      descLabel?.parentElement?.parentElement;

    if (insertTarget) {
      insertTarget.insertAdjacentElement("beforebegin", block);
    }
  }

  function row(label, value) {
    return `<div class="jr-d-row"><span class="jr-d-label">${label}:</span><span class="jr-d-value">${value}</span></div>`;
  }

  function iconVal(iconUrl, text) {
    if (!iconUrl) return text || "";
    return `<img src="${iconUrl}" class="jr-d-icon" alt="" />${text}`;
  }

  function avatarVal(avatarUrl, name) {
    if (!avatarUrl) return name || "";
    return `<img src="${avatarUrl}" class="jr-d-avatar" alt="" />${name}`;
  }

  async function init() {
    if (!isIssuePage()) return;
    if (document.getElementById(DETAILS_ID)) return;

    const issueKey = getIssueKey();
    if (!issueKey) return;

    const fields = await fetchIssueFields(issueKey);
    if (fields) renderDetailsBlock(fields);
  }

  // MutationObserver for SPA navigation
  const observer = new MutationObserver(() => {
    if (!isIssuePage()) return;
    if (document.getElementById(DETAILS_ID)) return;
    if (!document.querySelector('[data-testid="issue.views.issue-base.common.description.label"]')) return;
    init();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // URL change detection - MutationObserver handles re-injection
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const existing = document.getElementById(DETAILS_ID);
      if (existing) existing.remove();
    }
  }, 200);
})();
