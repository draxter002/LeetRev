// LeetRev Companion Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetRev Companion Extension installed successfully.");
});

// Listener for background messages from popup or web page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PLATFORM_COOKIES") {
    getAllPlatformCookies().then((cookies) => {
      sendResponse({ success: true, cookies });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }
});

const PLATFORMS = [
  { id: "leetcode", name: "LeetCode", url: "https://leetcode.com", cookieName: "LEETCODE_SESSION" },
  { id: "codeforces", name: "Codeforces", url: "https://codeforces.com", cookieName: "360_session" },
  { id: "codechef", name: "CodeChef", url: "https://codechef.com", cookieName: "remember_codechef_token" },
  { id: "geeksforgeeks", name: "GeeksforGeeks", url: "https://geeksforgeeks.org", cookieName: "gfg_session" },
  { id: "atcoder", name: "AtCoder", url: "https://atcoder.jp", cookieName: "RECOGNITION_AUTH" },
  { id: "codestudio", name: "CodeStudio", url: "https://codingninjas.com", cookieName: "cn_session" },
  { id: "interviewbit", name: "InterviewBit", url: "https://interviewbit.com", cookieName: "_remember_user_token" },
  { id: "hackerrank", name: "HackerRank", url: "https://hackerrank.com", cookieName: "_hrank_session" },
  { id: "hackerearth", name: "HackerEarth", url: "https://hackerearth.com", cookieName: "he_session" },
];

async function getAllPlatformCookies() {
  const results = {};
  for (const p of PLATFORMS) {
    try {
      const cookie = await getCookie(p.url, p.cookieName);
      results[p.id] = {
        name: p.name,
        connected: !!cookie,
        value: cookie ? cookie.value : null
      };
    } catch {
      results[p.id] = { name: p.name, connected: false, value: null };
    }
  }
  return results;
}

function getCookie(url, name) {
  return new Promise((resolve) => {
    chrome.cookies.get({ url, name }, (cookie) => {
      resolve(cookie || null);
    });
  });
}
