// Popup Script for LeetRev Companion

const PLATFORMS = [
  { id: "leetcode", name: "LeetCode", icon: "🧡", domain: "leetcode.com", cookieName: "LEETCODE_SESSION" },
  { id: "codeforces", name: "Codeforces", icon: "🟦", domain: "codeforces.com", cookieName: "360_session" },
  { id: "codechef", name: "CodeChef", icon: "🟤", domain: "codechef.com", cookieName: "remember_codechef_token" },
  { id: "geeksforgeeks", name: "GeeksforGeeks", icon: "🟩", domain: "geeksforgeeks.org", cookieName: "gfg_session" },
  { id: "atcoder", name: "AtCoder", icon: "⚪", domain: "atcoder.jp", cookieName: "RECOGNITION_AUTH" },
  { id: "codestudio", name: "CodeStudio", icon: "🟧", domain: "codingninjas.com", cookieName: "cn_session" },
  { id: "interviewbit", name: "InterviewBit", icon: "🟨", domain: "interviewbit.com", cookieName: "_remember_user_token" },
  { id: "hackerrank", name: "HackerRank", icon: "🟩", domain: "hackerrank.com", cookieName: "_hrank_session" },
  { id: "hackerearth", name: "HackerEarth", icon: "🟥", domain: "hackerearth.com", cookieName: "he_session" },
];

let activeCookies = {};

document.addEventListener("DOMContentLoaded", async () => {
  const leetrevUrlInput = document.getElementById("leetrevUrl");
  const platformGrid = document.getElementById("platformGrid");
  const connectedCountEl = document.getElementById("connectedCount");
  const btnSyncAll = document.getElementById("btnSyncAll");
  const openHelpLink = document.getElementById("openHelpLink");

  // Load saved target URL or default to current origin
  chrome.storage.local.get(["targetUrl"], (res) => {
    if (res.targetUrl) {
      leetrevUrlInput.value = res.targetUrl;
    }
  });

  leetrevUrlInput.addEventListener("change", () => {
    chrome.storage.local.set({ targetUrl: leetrevUrlInput.value.trim() });
  });

  // Scan all 9 platform cookies
  activeCookies = await detectCookies();
  renderPlatforms(platformGrid, connectedCountEl);

  // Handle Sync All action
  btnSyncAll.addEventListener("click", async () => {
    const targetUrl = (leetrevUrlInput.value || "https://leetrevision.approjects.me/").replace(/\/$/, "");
    btnSyncAll.disabled = true;
    btnSyncAll.innerText = "⏳ Syncing...";

    try {
      const payload = {
        platforms: activeCookies,
        timestamp: new Date().toISOString()
      };

      const resp = await fetch(`${targetUrl}/api/sync/multi-platform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch((err) => ({ ok: false, statusText: err.message }));

      if (resp.ok) {
        btnSyncAll.innerText = "✅ Synced Successfully!";
        setTimeout(() => {
          btnSyncAll.disabled = false;
          btnSyncAll.innerText = "🚀 Sync All Platforms Now";
        }, 2500);
      } else {
        alert(`Sync Notice: Sent credentials to ${targetUrl}. Please ensure you are logged into LeetRev in your browser.`);
        btnSyncAll.disabled = false;
        btnSyncAll.innerText = "🚀 Sync All Platforms Now";
      }
    } catch (err) {
      alert(`Error syncing: ${err.message}`);
      btnSyncAll.disabled = false;
      btnSyncAll.innerText = "🚀 Sync All Platforms Now";
    }
  });

  openHelpLink.addEventListener("click", (e) => {
    e.preventDefault();
    const targetUrl = (leetrevUrlInput.value || "http://localhost:3000").replace(/\/$/, "");
    chrome.tabs.create({ url: `${targetUrl}/extension` });
  });
});

async function detectCookies() {
  const result = {};
  for (const p of PLATFORMS) {
    try {
      const cookie = await new Promise((resolve) => {
        chrome.cookies.get({ url: `https://${p.domain}`, name: p.cookieName }, (c) => resolve(c));
      });
      result[p.id] = {
        name: p.name,
        icon: p.icon,
        domain: p.domain,
        connected: !!cookie,
        value: cookie ? cookie.value : null
      };
    } catch {
      result[p.id] = { name: p.name, icon: p.icon, domain: p.domain, connected: false, value: null };
    }
  }
  return result;
}

function renderPlatforms(grid, countEl) {
  grid.innerHTML = "";
  let activeCount = 0;

  PLATFORMS.forEach((p) => {
    const statusData = activeCookies[p.id] || { connected: false };
    if (statusData.connected) activeCount++;

    const card = document.createElement("div");
    card.className = "platform-card";
    card.innerHTML = `
      <div class="platform-info">
        <span>${p.icon}</span>
        <span>${p.name}</span>
      </div>
      <span class="status-pill ${statusData.connected ? 'status-connected' : 'status-disconnected'}">
        ${statusData.connected ? '● Active' : '○ Not Detected'}
      </span>
    `;
    grid.appendChild(card);
  });

  countEl.innerText = `${activeCount} Active`;
}
