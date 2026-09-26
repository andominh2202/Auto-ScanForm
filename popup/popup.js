/**
 * FormMaster AI - Popup Script (Hardened)
 * Chống XSS, xử lý an toàn trang hệ thống và lỗi giao tiếp tab
 */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const profileSelect = document.getElementById("profile-select");
  const fieldCountEl = document.getElementById("field-count");
  const pageTitleEl = document.getElementById("page-title");
  const pageIconEl = document.getElementById("page-icon");
  const btnFillNow = document.getElementById("btn-fill-now");
  const btnHighlight = document.getElementById("btn-highlight");
  const btnRandomTest = document.getElementById("btn-random-test");
  const quickCopyChips = document.getElementById("quick-copy-chips");
  const linkOptions = document.getElementById("link-options");
  const linkScanner = document.getElementById("link-scanner");
  const linkPlayground = document.getElementById("link-playground");

  let profiles = [];
  let currentProfile = null;
  let activeTab = null;

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Lấy active tab hiện tại
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs[0];
      if (activeTab?.url) {
        try {
          const u = new URL(activeTab.url);
          pageTitleEl.textContent = u.hostname;
          if (u.hostname.includes("docs.google.com")) {
            pageIconEl.textContent = "📋";
            pageTitleEl.textContent = "Google Forms";
          }
        } catch (e) {
          pageTitleEl.textContent = activeTab.title ? activeTab.title.substring(0, 30) : "Trang web";
        }
      }
    } catch (err) {
      console.warn("[FormMaster AI] Tab query error:", err);
    }
  }

  // Tải danh sách Profiles từ chrome.storage.local
  async function loadProfiles() {
    return new Promise(resolve => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["formmaster_profiles", "formmaster_active_id"], result => {
          if (result.formmaster_profiles && result.formmaster_profiles.length > 0) {
            profiles = result.formmaster_profiles;
            const activeId = result.formmaster_active_id;
            currentProfile = profiles.find(p => p.id === activeId) || profiles[0];
          } else if (window.DEFAULT_PROFILES) {
            profiles = window.DEFAULT_PROFILES;
            currentProfile = profiles[0];
          }
          resolve();
        });
      } else {
        profiles = window.DEFAULT_PROFILES || [];
        currentProfile = profiles[0] || null;
        resolve();
      }
    });
  }

  await loadProfiles();

  // Render dropdown profiles chống XSS
  function renderProfiles() {
    profileSelect.innerHTML = profiles.map(p => 
      `<option value="${escapeHtml(p.id)}" ${p.id === currentProfile?.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`
    ).join("");
    renderQuickCopy();
  }

  // Render các chip copy nhanh chống XSS
  function renderQuickCopy() {
    if (!currentProfile || !currentProfile.data) return;
    const d = currentProfile.data;
    const items = [
      { label: "Email", val: d.email },
      { label: "SĐT", val: d.phone },
      { label: "Họ tên", val: d.fullName },
      { label: "CCCD", val: d.idCard },
      { label: "Địa chỉ", val: d.address },
      { label: "LinkedIn", val: d.linkedin }
    ].filter(i => Boolean(i.val));

    quickCopyChips.innerHTML = items.map(item => `
      <div class="copy-chip" data-val="${encodeURIComponent(item.val)}" title="Bấm để sao chép: ${escapeHtml(item.val)}">
        <span>📋</span>
        <span>${escapeHtml(item.label)}</span>
      </div>
    `).join("");

    // Sự kiện click copy an toàn
    quickCopyChips.querySelectorAll(".copy-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const val = decodeURIComponent(chip.dataset.val || "");
        if (!val) return;
        navigator.clipboard.writeText(val).then(() => {
          const original = chip.innerHTML;
          chip.innerHTML = "<span>✓ Đã chép</span>";
          setTimeout(() => { chip.innerHTML = original; }, 1500);
        }).catch(err => {
          console.warn("[FormMaster AI] Clipboard write failed:", err);
        });
      });
    });
  }

  renderProfiles();

  // Đổi hồ sơ
  profileSelect.addEventListener("change", e => {
    const selectedId = e.target.value;
    currentProfile = profiles.find(p => p.id === selectedId) || currentProfile;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ formmaster_active_id: selectedId });
    }
    renderQuickCopy();
    requestPageStatus();
  });

  // Kiểm tra xem URL có bị trình duyệt chặn can thiệp không
  function isRestrictedUrl(url) {
    if (!url) return true;
    const lower = url.toLowerCase();
    return (
      lower.startsWith("chrome://") ||
      lower.startsWith("edge://") ||
      lower.startsWith("about:") ||
      lower.startsWith("chrome-extension://") ||
      lower.startsWith("view-source:") ||
      lower.includes("chromewebstore.google.com") ||
      lower.includes("chrome.google.com/webstore") ||
      lower.endsWith(".pdf")
    );
  }

  // Gửi tin nhắn yêu cầu trang báo cáo trạng thái form
  function requestPageStatus() {
    if (!activeTab?.id) {
      fieldCountEl.textContent = "Không tìm thấy tab đang mở";
      btnFillNow.disabled = true;
      btnFillNow.style.opacity = "0.5";
      return;
    }

    if (isRestrictedUrl(activeTab.url)) {
      fieldCountEl.textContent = "Trang hệ thống trình duyệt (Bị chặn can thiệp)";
      btnFillNow.disabled = true;
      btnFillNow.style.opacity = "0.5";
      btnHighlight.disabled = true;
      btnRandomTest.disabled = true;
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { action: "GET_PAGE_STATUS" }, res => {
      if (chrome.runtime.lastError || !res) {
        fieldCountEl.textContent = "Chưa phát hiện form (F5 lại trang nếu vừa cài)";
      } else {
        fieldCountEl.textContent = `Phát hiện: ${res.detectedCount} trường khớp hồ sơ`;
      }
    });
  }

  requestPageStatus();

  // Bấm Điền Form Tự Động
  btnFillNow.addEventListener("click", () => {
    if (!activeTab?.id || isRestrictedUrl(activeTab.url)) return;

    btnFillNow.classList.add("loading");
    btnFillNow.innerHTML = `<span>⏳ Đang tự động điền...</span>`;

    chrome.tabs.sendMessage(activeTab.id, { action: "EXECUTE_AUTO_FILL" }, res => {
      if (chrome.runtime.lastError) {
        btnFillNow.innerHTML = `<span>⚠️ Vui lòng F5 trang</span>`;
        setTimeout(() => {
          btnFillNow.innerHTML = `<span class="btn-icon">⚡</span><span class="btn-text">Điền Form Tự Động</span><span class="btn-shortcut">Alt+Shift+F</span>`;
        }, 2000);
        return;
      }
      setTimeout(() => {
        btnFillNow.innerHTML = `<span>✓ Đã Điền Xong!</span>`;
        setTimeout(() => {
          window.close();
        }, 700);
      }, 300);
    });
  });

  // Bấm Soi trường
  btnHighlight.addEventListener("click", () => {
    if (!activeTab?.id || isRestrictedUrl(activeTab.url)) return;
    chrome.scripting?.executeScript({
      target: { tabId: activeTab.id },
      func: () => {
        const matches = window.FormMasterDetector?.detectAll(window.currentProfile);
        matches?.forEach(m => window.FormMasterFiller?.highlightElement(m.element));
      }
    }).catch(err => console.warn(err));
    window.close();
  });

  // Bấm Điền Random Test
  btnRandomTest.addEventListener("click", () => {
    if (!activeTab?.id || isRestrictedUrl(activeTab.url)) return;
    chrome.scripting?.executeScript({
      target: { tabId: activeTab.id },
      func: () => {
        window.FormMasterFiller?.fillRandomData();
      }
    }).catch(err => console.warn(err));
    window.close();
  });

  // Mở Options / Quản lý hồ sơ
  linkOptions.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open("../options/options.html", "_blank");
    }
  });

  // Mở Quét & Điền Bằng Link Google Forms
  if (linkScanner) {
    linkScanner.addEventListener("click", () => {
      if (chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html#scanner") });
      } else {
        window.open("../options/options.html#scanner", "_blank");
      }
    });
  }

  // Mở Playground Test Lab
  linkPlayground.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open("../index.html", "_blank");
    }
  });
});
