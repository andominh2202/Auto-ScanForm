/**
 * FormMaster AI - Background Service Worker (Hardened)
 * Xử lý cài đặt mặc định, context menu và phím tắt an toàn
 */

importScripts("../data/default-profiles.js");

// Khởi tạo dữ liệu khi vừa cài đặt extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["formmaster_profiles"], result => {
    if (!result.formmaster_profiles || result.formmaster_profiles.length === 0) {
      chrome.storage.local.set({
        formmaster_profiles: DEFAULT_PROFILES,
        formmaster_active_id: "profile_job_dev"
      });
    }
  });

  // Tạo Context Menu chuột phải an toàn
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "fm_fill_all",
      title: "⚡ Điền form bằng FormMaster AI (Alt+Shift+F)",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "fm_open_options",
      title: "⚙️ Mở Bảng điều khiển FormMaster",
      contexts: ["all"]
    });
  });
});

// Xử lý khi click vào Context Menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fm_fill_all" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "EXECUTE_AUTO_FILL" }, () => {
      // Xử lý lastError để không gây unhandled exception
      if (chrome.runtime.lastError) {
        // Tab không có content script (trang hệ thống hoặc chưa nạp)
      }
    });
  } else if (info.menuItemId === "fm_open_options") {
    chrome.runtime.openOptionsPage();
  }
});

// Xử lý phím tắt Alt + Shift + F
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "autofill_active_page" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "EXECUTE_AUTO_FILL" }, () => {
      if (chrome.runtime.lastError) {
        // Tab không có content script
      }
    });
  }
});

// Hỗ trợ fetch HTML Google Forms từ background service worker (Bypass CORS)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FETCH_GFORM_HTML" && msg.url) {
    fetch(msg.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    })
      .then(res => res.text())
      .then(html => sendResponse({ success: true, html }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Giữ kênh sendResponse bất đồng bộ
  }
});
