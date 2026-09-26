/**
 * FormMaster AI - Floating Widget Script (Hardened with Shadow DOM & Dynamic MutationObserver)
 * Thanh công cụ nổi thông minh ghim trên mọi trang web với bảo vệ xung đột CSS 100%
 */

(function () {
  "use strict";

  // Ngăn chặn inject trùng lặp
  if (window.__FORMMASTER_LOADED__) return;
  window.__FORMMASTER_LOADED__ = true;

  let profiles = [];
  let currentProfile = null;
  let detectedMatches = [];
  let isPanelOpen = false;
  let shadowRoot = null;
  let widgetContainer = null;
  let mutationObserver = null;
  let debounceScanTimer = null;

  // Lấy dữ liệu hồ sơ từ Chrome Storage hoặc LocalStorage
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
        const local = localStorage.getItem("formmaster_profiles");
        if (local) {
          try {
            profiles = JSON.parse(local);
            const activeId = localStorage.getItem("formmaster_active_id");
            currentProfile = profiles.find(p => p.id === activeId) || profiles[0];
          } catch (e) {
            profiles = window.DEFAULT_PROFILES || [];
            currentProfile = profiles[0] || null;
          }
        } else if (window.DEFAULT_PROFILES) {
          profiles = window.DEFAULT_PROFILES;
          currentProfile = profiles[0];
        }
        resolve();
      }
    });
  }

  // Quét các trường trên trang hiện tại
  function scanFields() {
    if (!currentProfile || !window.FormMasterDetector) return [];
    detectedMatches = window.FormMasterDetector.detectAll(currentProfile);
    return detectedMatches;
  }

  // Hiển thị Toast thông báo cô lập
  function showToast(message, icon = "⚡") {
    const existing = document.querySelector(".fm-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "fm-toast";
    toast.innerHTML = `<span style="font-size: 18px;">${icon}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Kiểm tra xem trang có biểu mẫu hoặc trường nhập liệu không
  function pageHasInputs() {
    return (
      document.querySelector("input, textarea, select, .whsOnd, [role='radiogroup'], [role='listbox']") !== null ||
      Boolean(window.FormMasterDetector?.isGoogleFormPage())
    );
  }

  // Tạo và nhúng Floating Widget vào DOM sử dụng Shadow DOM
  async function createWidget() {
    if (!pageHasInputs()) {
      initDynamicObserver();
      return;
    }

    scanFields();

    // Tạo Host Element cho Shadow DOM
    const host = document.createElement("div");
    host.id = "formmaster-root";
    document.body.appendChild(host);
    widgetContainer = host;

    // Đính kèm Shadow Root (chế độ open) để cách ly 100% style
    shadowRoot = host.attachShadow({ mode: "open" });

    // Tải CSS vào Shadow DOM
    const styleEl = document.createElement("style");
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        const cssUrl = chrome.runtime.getURL("content/floating-widget.css");
        const resp = await fetch(cssUrl);
        styleEl.textContent = await resp.text();
      } else {
        // Fallback cho standalone
        const existingLink = document.querySelector("link[href*='floating-widget.css']");
        if (existingLink) {
          const resp = await fetch(existingLink.href);
          styleEl.textContent = await resp.text();
        }
      }
      if (!styleEl.textContent) {
        styleEl.textContent = `
          :host { all: initial; position: fixed; z-index: 2147483647; bottom: 24px; right: 24px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.5; color: #0f172a; direction: ltr; user-select: none; }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .fm-trigger-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 10px 16px; border-radius: 9999px; box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.45); cursor: grab; border: 1px solid rgba(255, 255, 255, 0.25); }
          .fm-title { font-weight: 700; font-size: 13.5px; }
          .fm-badge { background: rgba(255, 255, 255, 0.25); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; }
          .fm-panel { display: none; position: absolute; bottom: 56px; right: 0; width: 320px; background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2); overflow: hidden; }
          .fm-panel.active { display: block; }
          .fm-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
          .fm-header-info { display: flex; align-items: center; gap: 8px; }
          .fm-header-title { font-size: 14px; font-weight: 700; color: #1e1b4b; }
          .fm-close-btn { background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px; }
          .fm-panel-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
          .fm-field-group { display: flex; flex-direction: column; gap: 6px; }
          .fm-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; }
          .fm-select { width: 100%; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; color: #0f172a; font-size: 13px; font-weight: 500; outline: none; }
          .fm-btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #fff; padding: 11px 16px; border-radius: 12px; font-weight: 600; font-size: 13.5px; border: none; cursor: pointer; }
          .fm-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .fm-btn-secondary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #f1f5f9; color: #334155; padding: 9px 14px; border-radius: 10px; font-weight: 600; font-size: 12.5px; border: 1px solid #e2e8f0; cursor: pointer; }
          .fm-panel-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 11.5px; color: #64748b; }
          .fm-link { color: #4f46e5; text-decoration: none; font-weight: 600; cursor: pointer; }
        `;
      }
    } catch (e) {
      console.warn("[FormMaster AI] Shadow DOM CSS fetch fallback:", e);
    }
    shadowRoot.appendChild(styleEl);

    // Khôi phục vị trí đã lưu trong session nếu có
    const savedPos = sessionStorage.getItem("formmaster_pos");
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        host.style.bottom = "auto";
        host.style.right = "auto";
        host.style.left = `${left}px`;
        host.style.top = `${top}px`;
      } catch (e) {}
    }

    const countBadgeText = detectedMatches.length > 0 ? `${detectedMatches.length}` : "0";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="fm-trigger-btn" id="fm-trigger" role="button" aria-expanded="false" aria-label="Mở FormMaster AI" tabindex="0">
        <span class="fm-icon">🪄</span>
        <span class="fm-title">FormMaster</span>
        <span class="fm-badge" id="fm-count-badge">${countBadgeText}</span>
      </div>

      <div class="fm-panel" id="fm-panel" role="dialog" aria-modal="false" aria-label="Bảng điều khiển FormMaster">
        <div class="fm-panel-header">
          <div class="fm-header-info">
            <span style="font-size: 18px;">✨</span>
            <span class="fm-header-title">FormMaster AI</span>
          </div>
          <button class="fm-close-btn" id="fm-close" title="Đóng" aria-label="Đóng panel">✕</button>
        </div>

        <div class="fm-panel-body">
          <div class="fm-field-group">
            <label class="fm-label" for="fm-profile-select">Chọn hồ sơ điền:</label>
            <select class="fm-select" id="fm-profile-select">
              ${profiles.map(p => `<option value="${escapeAttr(p.id)}" ${p.id === currentProfile?.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
            </select>
          </div>

          <button class="fm-btn-primary" id="fm-btn-fill">
            <span>⚡</span>
            <span>Tự Động Điền (${detectedMatches.length} trường)</span>
          </button>

          <div class="fm-action-grid">
            <button class="fm-btn-secondary" id="fm-btn-highlight" title="Đánh dấu các trường nhận diện được">
              <span>🎯</span>
              <span>Soi trường</span>
            </button>
            <button class="fm-btn-secondary" id="fm-btn-random" title="Điền dữ liệu ngẫu nhiên để test">
              <span>🎲</span>
              <span>Dữ liệu Test</span>
            </button>
          </div>
        </div>

        <div class="fm-panel-footer">
          <span>Phím tắt: <kbd style="background:#e2e8f0; padding:2px 4px; border-radius:4px; font-weight:600;">Alt+Shift+F</kbd></span>
          <a class="fm-link" id="fm-link-settings">⚙️ Cài đặt</a>
        </div>
      </div>
    `;

    shadowRoot.appendChild(wrapper);
    setupEvents();
    initDynamicObserver();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // Khởi tạo MutationObserver theo dõi Dynamic Forms (React / Vue / SPA)
  function initDynamicObserver() {
    if (mutationObserver) return;

    mutationObserver = new MutationObserver(mutations => {
      let hasRelevantChange = false;
      for (const m of mutations) {
        if (m.type === "childList" && m.addedNodes.length > 0) {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (
                node.matches &&
                (node.matches("input, textarea, select, .whsOnd, [role='radiogroup'], [role='listbox']") ||
                 node.querySelector("input, textarea, select, .whsOnd, [role='radiogroup'], [role='listbox']"))
              ) {
                hasRelevantChange = true;
                break;
              }
            }
          }
        }
        if (hasRelevantChange) break;
      }

      if (hasRelevantChange) {
        clearTimeout(debounceScanTimer);
        debounceScanTimer = setTimeout(() => {
          if (!widgetContainer && pageHasInputs()) {
            createWidget();
          } else if (widgetContainer) {
            scanFields();
            updateUI();
          }
        }, 500);
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function updateUI() {
    if (!shadowRoot) return;
    const count = detectedMatches.length;
    const countBadge = shadowRoot.querySelector("#fm-count-badge");
    const fillBtn = shadowRoot.querySelector("#fm-btn-fill");

    if (countBadge) countBadge.textContent = String(count);
    if (fillBtn) {
      fillBtn.innerHTML = `<span>⚡</span><span>Tự Động Điền (${count} trường)</span>`;
    }
  }

  // Gắn các sự kiện tương tác trong Shadow DOM
  function setupEvents() {
    const trigger = shadowRoot.querySelector("#fm-trigger");
    const panel = shadowRoot.querySelector("#fm-panel");
    const closeBtn = shadowRoot.querySelector("#fm-close");
    const fillBtn = shadowRoot.querySelector("#fm-btn-fill");
    const highlightBtn = shadowRoot.querySelector("#fm-btn-highlight");
    const randomBtn = shadowRoot.querySelector("#fm-btn-random");
    const profileSelect = shadowRoot.querySelector("#fm-profile-select");
    const settingsLink = shadowRoot.querySelector("#fm-link-settings");

    // Bật tắt panel
    function togglePanel(open) {
      isPanelOpen = typeof open === "boolean" ? open : !isPanelOpen;
      panel.classList.toggle("active", isPanelOpen);
      trigger.setAttribute("aria-expanded", String(isPanelOpen));
      if (isPanelOpen) {
        scanFields();
        updateUI();
      }
    }

    trigger.addEventListener("click", () => {
      if (isDragging) return;
      togglePanel();
    });

    trigger.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        togglePanel();
      }
    });

    closeBtn.addEventListener("click", () => {
      togglePanel(false);
    });

    // Đóng bằng phím Escape
    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && isPanelOpen) {
        togglePanel(false);
      }
    });

    // Đổi Profile
    profileSelect.addEventListener("change", e => {
      const selectedId = e.target.value;
      currentProfile = profiles.find(p => p.id === selectedId) || currentProfile;
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ formmaster_active_id: selectedId });
      } else {
        localStorage.setItem("formmaster_active_id", selectedId);
      }
      scanFields();
      updateUI();
      showToast(`Đã chuyển sang: ${currentProfile.name}`, "👤");
    });

    // Điền tự động
    fillBtn.addEventListener("click", () => {
      executeAutoFill();
    });

    // Soi trường
    highlightBtn.addEventListener("click", () => {
      scanFields();
      if (detectedMatches.length === 0) {
        showToast("Không tìm thấy trường nào phù hợp trên trang.", "⚠️");
        return;
      }
      detectedMatches.forEach(m => {
        window.FormMasterFiller?.highlightElement(m.element);
      });
      showToast(`Đã đánh dấu ${detectedMatches.length} trường phù hợp!`, "🎯");
    });

    // Dữ liệu test ngẫu nhiên
    randomBtn.addEventListener("click", () => {
      const count = window.FormMasterFiller?.fillRandomData() || 0;
      showToast(`Đã điền dữ liệu test vào ${count} trường!`, "🎲");
      togglePanel(false);
    });

    // Mở trang quản lý hồ sơ
    settingsLink.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(window.location.origin + "/index.html", "_blank");
      }
    });

    // Xử lý kéo thả có giới hạn Viewport (Boundary Clamping)
    let isDragging = false;
    let startX, startY, origX, origY;

    trigger.addEventListener("mousedown", e => {
      if (e.target.closest("#fm-panel")) return;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widgetContainer.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;

      function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragging = true;
          const widgetWidth = widgetContainer.offsetWidth || 150;
          const widgetHeight = widgetContainer.offsetHeight || 50;

          // Giới hạn trong màn hình
          const clampedX = Math.max(10, Math.min(window.innerWidth - widgetWidth - 10, origX + dx));
          const clampedY = Math.max(10, Math.min(window.innerHeight - widgetHeight - 10, origY + dy));

          widgetContainer.style.bottom = "auto";
          widgetContainer.style.right = "auto";
          widgetContainer.style.left = `${clampedX}px`;
          widgetContainer.style.top = `${clampedY}px`;
        }
      }

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        if (isDragging) {
          // Lưu vị trí vào sessionStorage
          const rect = widgetContainer.getBoundingClientRect();
          sessionStorage.setItem("formmaster_pos", JSON.stringify({ left: rect.left, top: rect.top }));
        }
        setTimeout(() => { isDragging = false; }, 60);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  // Thực thi điền tự động
  function executeAutoFill() {
    scanFields();
    if (detectedMatches.length === 0) {
      showToast("Không tìm thấy trường nào phù hợp trên trang này.", "ℹ️");
      return;
    }

    const result = window.FormMasterFiller?.fillAllDetected(detectedMatches);
    if (result) {
      showToast(`Tuyệt vời! Đã điền ${result.filledCount}/${result.totalDetected} trường!`, "✅");
    }

    const panel = shadowRoot?.querySelector("#fm-panel");
    if (panel) {
      panel.classList.remove("active");
      isPanelOpen = false;
    }
  }

  // Lắng nghe Message Passing từ Background hoặc Popup
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "EXECUTE_AUTO_FILL") {
        executeAutoFill();
        sendResponse({ success: true, count: detectedMatches.length });
      } else if (request.action === "GET_PAGE_STATUS") {
        scanFields();
        sendResponse({
          detectedCount: detectedMatches.length,
          profileName: currentProfile?.name || "Mặc định",
          url: window.location.href
        });
      }
      return true;
    });
  }

  // Phím tắt toàn cục trên trang: Alt + Shift + F
  window.addEventListener("keydown", e => {
    if (e.altKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
      e.preventDefault();
      executeAutoFill();
    }
  });

  // Tự động khởi chạy
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadProfiles().then(createWidget);
    });
  } else {
    loadProfiles().then(createWidget);
  }
})();
