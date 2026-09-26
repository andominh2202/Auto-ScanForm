/**
 * FormMaster AI - Dashboard & Options Logic (Hardened)
 * Bảo vệ chống XSS, kiểm thực dữ liệu JSON import chặt chẽ và phòng chống Prototype Pollution
 */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  // Biến trạng thái
  let profiles = [];
  let currentProfileId = null;
  let currentProfile = null;

  // DOM Elements
  const profileTabsContainer = document.getElementById("profile-tabs-container");
  const profNameInput = document.getElementById("prof-name-input");
  const profIsDefault = document.getElementById("prof-is-default");
  const customFieldsContainer = document.getElementById("custom-fields-container");
  const btnSaveAll = document.getElementById("btn-save-all");
  const btnNewProfile = document.getElementById("btn-new-profile");
  const btnDuplicateProfile = document.getElementById("btn-duplicate-profile");
  const btnDeleteProfile = document.getElementById("btn-delete-profile");
  const btnAddCustomField = document.getElementById("btn-add-custom-field");
  const appToast = document.getElementById("app-toast");
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");

  // Scanner Elements
  const scannerProfileSelect = document.getElementById("scanner-profile-select");
  const scannerUrlInput = document.getElementById("scanner-url-input");
  const btnStartScan = document.getElementById("btn-start-scan");
  const btnLoadDemoSurvey = document.getElementById("btn-load-demo-survey");
  const btnLoadDemoJob = document.getElementById("btn-load-demo-job");
  const scannerLoading = document.getElementById("scanner-loading");
  const scannerResultContainer = document.getElementById("scanner-result-container");
  const scannedFormTitle = document.getElementById("scanned-form-title");
  const scannedFormDesc = document.getElementById("scanned-form-desc");
  const scannedQCount = document.getElementById("scanned-q-count");
  const scannedTableBody = document.getElementById("scanned-table-body");
  const btnOpenPrefilled = document.getElementById("btn-open-prefilled");
  const btnCopyPrefilled = document.getElementById("btn-copy-prefilled");
  const btnRescan = document.getElementById("btn-rescan");

  // Playground Elements
  const pgProfilePicker = document.getElementById("pg-profile-picker");
  const btnPgFill = document.getElementById("btn-pg-fill");
  const btnPgRandom = document.getElementById("btn-pg-random");
  const btnPgClear = document.getElementById("btn-pg-clear");
  const pgStatsBar = document.getElementById("pg-stats-bar");
  const pgStatsText = document.getElementById("pg-stats-text");

  // Danh sách các ID input chuẩn
  const STANDARD_INPUT_IDS = [
    "fullName", "lastName", "firstName", "email", "phone", "phoneBackup",
    "dob", "gender", "idCard", "nationality", "maritalStatus",
    "address", "city", "district", "ward", "country", "zipCode",
    "university", "major", "educationLevel", "gradYear", "gpa",
    "jobTitle", "experienceYears", "currentCompany", "expectedSalary",
    "skills", "coverLetter", "linkedin", "github", "portfolio"
  ];

  // Hàm mã hóa an toàn chống XSS
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // 1. TẢI VÀ LƯU TRỮ HỒ SƠ
  // ==========================================
  async function loadStorage() {
    return new Promise(resolve => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["formmaster_profiles", "formmaster_active_id"], res => {
          if (res.formmaster_profiles && Array.isArray(res.formmaster_profiles) && res.formmaster_profiles.length > 0) {
            profiles = sanitizeProfilesList(res.formmaster_profiles);
            currentProfileId = res.formmaster_active_id || profiles[0].id;
          } else if (window.DEFAULT_PROFILES) {
            profiles = sanitizeProfilesList(window.DEFAULT_PROFILES);
            currentProfileId = profiles[0].id;
            saveStorage();
          }
          resolve();
        });
      } else {
        const local = localStorage.getItem("formmaster_profiles");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            profiles = sanitizeProfilesList(parsed);
            currentProfileId = localStorage.getItem("formmaster_active_id") || profiles[0].id;
          } catch (e) {
            profiles = sanitizeProfilesList(window.DEFAULT_PROFILES || []);
            currentProfileId = profiles[0]?.id;
          }
        } else if (window.DEFAULT_PROFILES) {
          profiles = sanitizeProfilesList(window.DEFAULT_PROFILES);
          currentProfileId = profiles[0].id;
          saveStorage();
        }
        resolve();
      }
    });
  }

  function saveStorage() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        formmaster_profiles: profiles,
        formmaster_active_id: currentProfileId
      });
    }
    localStorage.setItem("formmaster_profiles", JSON.stringify(profiles));
    localStorage.setItem("formmaster_active_id", currentProfileId);
  }

  function showToast(message, icon = "✅") {
    appToast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    appToast.classList.add("active");
    setTimeout(() => {
      appToast.classList.remove("active");
    }, 2800);
  }

  // ==========================================
  // 2. RENDER GIAO DIỆN HỒ SƠ
  // ==========================================
  function renderProfileTabs() {
    profileTabsContainer.innerHTML = "";
    pgProfilePicker.innerHTML = "";
    if (scannerProfileSelect) scannerProfileSelect.innerHTML = "";

    profiles.forEach(p => {
      // Tab trong màn hình hồ sơ
      const btn = document.createElement("button");
      btn.className = `prof-tab-btn ${p.id === currentProfileId ? "active" : ""}`;
      btn.textContent = p.name; // textContent an toàn chống XSS
      btn.addEventListener("click", () => {
        saveCurrentProfileFromInputs();
        currentProfileId = p.id;
        renderProfileTabs();
        loadProfileIntoEditor();
      });
      profileTabsContainer.appendChild(btn);

      // Option trong Playground selector
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name; // textContent an toàn chống XSS
      if (p.id === currentProfileId) opt.selected = true;
      pgProfilePicker.appendChild(opt);

      // Option trong Scanner selector
      if (scannerProfileSelect) {
        const sOpt = document.createElement("option");
        sOpt.value = p.id;
        sOpt.textContent = p.name;
        if (p.id === currentProfileId) sOpt.selected = true;
        scannerProfileSelect.appendChild(sOpt);
      }
    });
  }

  function loadProfileIntoEditor() {
    currentProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];
    if (!currentProfile) return;

    profNameInput.value = currentProfile.name || "";
    profIsDefault.checked = Boolean(currentProfile.isDefault);

    const d = currentProfile.data || {};

    STANDARD_INPUT_IDS.forEach(id => {
      const el = document.getElementById(`p-${id}`);
      if (el) {
        el.value = d[id] !== undefined ? d[id] : "";
      }
    });

    renderCustomFields();
  }

  function saveCurrentProfileFromInputs() {
    if (!currentProfile) return;

    // Giới hạn độ dài tên profile để bảo vệ storage
    const rawName = profNameInput.value.trim();
    currentProfile.name = rawName ? rawName.substring(0, 100) : "Hồ sơ không tên";
    currentProfile.isDefault = profIsDefault.checked;

    if (currentProfile.isDefault) {
      profiles.forEach(p => {
        if (p.id !== currentProfile.id) p.isDefault = false;
      });
    }

    if (!currentProfile.data) currentProfile.data = {};

    STANDARD_INPUT_IDS.forEach(id => {
      const el = document.getElementById(`p-${id}`);
      if (el) {
        // Giới hạn ký tự hợp lý
        const maxLen = id === "coverLetter" ? 10000 : 500;
        currentProfile.data[id] = el.value.trim().substring(0, maxLen);
      }
    });

    // Thu thập Custom Fields
    const cfRows = customFieldsContainer.querySelectorAll(".custom-field-row");
    const customFields = [];
    cfRows.forEach(row => {
      const label = row.querySelector(".cf-label")?.value.trim().substring(0, 100);
      const val = row.querySelector(".cf-value")?.value.trim().substring(0, 500);
      const kws = row.querySelector(".cf-kws")?.value.trim().substring(0, 300);
      if (label || val) {
        customFields.push({
          label: label || "Trường tùy chỉnh",
          key: label ? window.FormMasterRules.removeAccents(label).replace(/\s+/g, "_").substring(0, 50) : "custom",
          value: val || "",
          keywords: kws || label || ""
        });
      }
    });
    currentProfile.data.customFields = customFields;
  }

  function renderCustomFields() {
    customFieldsContainer.innerHTML = "";
    const list = currentProfile?.data?.customFields || [];

    if (list.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.cssText = "text-align: center; padding: 14px; color: var(--text-dim); font-size: 13px;";
      emptyDiv.textContent = "Chưa có trường tùy chỉnh nào. Bấm nút bên dưới để thêm!";
      customFieldsContainer.appendChild(emptyDiv);
      return;
    }

    list.forEach((cf, idx) => {
      const row = document.createElement("div");
      row.className = "custom-field-row";

      // Tạo các input bằng DOM API an toàn, gán .value trực tiếp chống XSS
      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.className = "input-text cf-label";
      labelInput.placeholder = "Tên trường (vd: Mã NV)";
      labelInput.value = cf.label || "";

      const valInput = document.createElement("input");
      valInput.type = "text";
      valInput.className = "input-text cf-value";
      valInput.placeholder = "Giá trị cần điền (vd: EMP-8899)";
      valInput.value = cf.value || "";

      const kwsInput = document.createElement("input");
      kwsInput.type = "text";
      kwsInput.className = "input-text cf-kws";
      kwsInput.placeholder = "Từ khóa nhận diện (cách nhau bởi dấu phẩy)";
      kwsInput.value = cf.keywords || "";

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-remove-cf";
      removeBtn.title = "Xóa trường này";
      removeBtn.textContent = "🗑️";
      removeBtn.addEventListener("click", () => {
        list.splice(idx, 1);
        renderCustomFields();
      });

      row.appendChild(labelInput);
      row.appendChild(valInput);
      row.appendChild(kwsInput);
      row.appendChild(removeBtn);

      customFieldsContainer.appendChild(row);
    });
  }

  // Sự kiện Thêm trường tùy chỉnh
  btnAddCustomField.addEventListener("click", () => {
    if (!currentProfile.data) currentProfile.data = {};
    if (!currentProfile.data.customFields) currentProfile.data.customFields = [];
    if (currentProfile.data.customFields.length >= 50) {
      alert("Bạn đã đạt giới hạn tối đa 50 trường tùy chỉnh cho mỗi hồ sơ.");
      return;
    }
    currentProfile.data.customFields.push({ label: "", value: "", keywords: "" });
    renderCustomFields();
  });

  // Sự kiện Tạo hồ sơ mới
  btnNewProfile.addEventListener("click", () => {
    if (profiles.length >= 20) {
      alert("Bạn đã đạt giới hạn tối đa 20 hồ sơ.");
      return;
    }
    saveCurrentProfileFromInputs();
    const newId = `profile_${Date.now()}`;
    const newProf = {
      id: newId,
      name: `✨ Hồ sơ mới #${profiles.length + 1}`,
      isDefault: false,
      data: {
        fullName: "",
        email: "",
        phone: "",
        address: "",
        customFields: []
      }
    };
    profiles.push(newProf);
    currentProfileId = newId;
    renderProfileTabs();
    loadProfileIntoEditor();
    saveStorage();
    showToast("Đã tạo hồ sơ mới thành công!");
  });

  // Sự kiện Nhân bản hồ sơ
  btnDuplicateProfile.addEventListener("click", () => {
    if (profiles.length >= 20) {
      alert("Bạn đã đạt giới hạn tối đa 20 hồ sơ.");
      return;
    }
    saveCurrentProfileFromInputs();
    const cloned = JSON.parse(JSON.stringify(currentProfile));
    cloned.id = `profile_${Date.now()}`;
    cloned.name = `${cloned.name} (Bản sao)`.substring(0, 100);
    cloned.isDefault = false;
    profiles.push(cloned);
    currentProfileId = cloned.id;
    renderProfileTabs();
    loadProfileIntoEditor();
    saveStorage();
    showToast("Đã nhân bản hồ sơ thành công!");
  });

  // Sự kiện Xóa hồ sơ
  btnDeleteProfile.addEventListener("click", () => {
    if (profiles.length <= 1) {
      alert("Bạn cần giữ lại ít nhất 1 hồ sơ!");
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa hồ sơ "${currentProfile.name}"?`)) {
      profiles = profiles.filter(p => p.id !== currentProfileId);
      currentProfileId = profiles[0].id;
      renderProfileTabs();
      loadProfileIntoEditor();
      saveStorage();
      showToast("Đã xóa hồ sơ!");
    }
  });

  // Nút Lưu Tất Cả
  btnSaveAll.addEventListener("click", () => {
    saveCurrentProfileFromInputs();
    saveStorage();
    renderProfileTabs();
    showToast("Đã lưu toàn bộ thông tin hồ sơ!");
  });

  // ==========================================
  // 3. TAB NAVIGATION
  // ==========================================
  const navItems = document.querySelectorAll(".nav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const pageHeading = document.getElementById("page-heading");
  const pageSubheading = document.getElementById("page-subheading");

  const tabTitles = {
    "tab-profiles": { title: "Quản Lý Hồ Sơ", subtitle: "Tạo và tinh chỉnh các bộ thông tin để điền biểu mẫu nhanh chóng" },
    "tab-scanner": { title: "Quét & Điền Bằng Link Google Forms", subtitle: "Phân tích cấu trúc câu hỏi từ link Google Form và tạo đường link điền sẵn 100%" },
    "tab-playground": { title: "Form Test Lab", subtitle: "Trực tiếp trải nghiệm và kiểm thử khả năng điền tự động trên các biểu mẫu thật" },
    "tab-dictionary": { title: "Từ Điển Nhận Diện", subtitle: "Quy tắc ngữ nghĩa và thuật toán quét từ khóa tiếng Việt & tiếng Anh" },
    "tab-guide": { title: "Cài Đặt Tiện Ích Trình Duyệt", subtitle: "Hướng dẫn 3 bước nạp extension vào Chrome hoặc Edge" },
    "tab-backup": { title: "Sao Lưu & Dữ Liệu", subtitle: "Xuất, nhập và khôi phục dữ liệu hồ sơ cá nhân" }
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.dataset.tab;
      navItems.forEach(n => n.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      item.classList.add("active");
      const activePane = document.getElementById(tabId);
      if (activePane) activePane.classList.add("active");

      if (tabTitles[tabId]) {
        pageHeading.textContent = tabTitles[tabId].title;
        pageSubheading.textContent = tabTitles[tabId].subtitle;
      }

      if (tabId === "tab-dictionary") {
        renderDictionaryTable();
      }

      if (tabId === "tab-scanner") {
        if (scannerProfileSelect) scannerProfileSelect.value = currentProfileId;
      }
    });
  });

  document.getElementById("btn-quick-test-top").addEventListener("click", () => {
    const pgTabBtn = document.querySelector('[data-tab="tab-playground"]');
    if (pgTabBtn) pgTabBtn.click();
  });

  // ==========================================
  // 3.5. GOOGLE FORMS SCANNER & PRE-FILL
  // ==========================================
  let currentScannedData = null;
  let currentScannedUrl = "";
  let currentMappedQuestions = [];

  const DEMO_FORMS = {
    survey: {
      url: "https://docs.google.com/forms/d/e/1FAIpQLScDemoSurvey7890/viewform",
      title: "Khảo Sát Nhu Cầu Tuyển Dụng & Đào Tạo 2026",
      description: "Biểu mẫu khảo sát nguyện vọng, kỹ năng công nghệ và thông tin liên hệ của ứng viên.",
      questions: [
        { entryId: "100101", title: "Họ và tên của bạn", type: "short_text", required: true, options: [] },
        { entryId: "100102", title: "Địa chỉ Email nhận phản hồi", type: "short_text", required: true, options: [] },
        { entryId: "100103", title: "Số điện thoại liên lạc", type: "short_text", required: true, options: [] },
        { entryId: "100104", title: "Giới tính", type: "multiple_choice", required: true, options: ["Nam", "Nữ", "Khác"] },
        { entryId: "100105", title: "Tỉnh / Thành phố hiện tại", type: "short_text", required: false, options: [] },
        { entryId: "100106", title: "Trường Đại học đã hoặc đang theo học", type: "short_text", required: false, options: [] },
        { entryId: "100107", title: "Số năm kinh nghiệm làm việc", type: "dropdown", required: true, options: ["Chưa có kinh nghiệm", "1 - 2 năm", "3 - 5 năm", "Trên 5 năm"] },
        { entryId: "100108", title: "Mục tiêu và kỳ vọng nghề nghiệp", type: "paragraph", required: false, options: [] }
      ]
    },
    job: {
      url: "https://docs.google.com/forms/d/e/1FAIpQLScDemoJobApplication456/viewform",
      title: "Đơn Đăng Ký Ứng Tuyển: Kỹ Sư Phần Mềm Fullstack",
      description: "Hệ thống tiếp nhận hồ sơ ứng viên tài năng gia nhập đội ngũ phát triển sản phẩm công nghệ.",
      questions: [
        { entryId: "200101", title: "Họ và tên ứng viên", type: "short_text", required: true, options: [] },
        { entryId: "200102", title: "Email liên hệ chính thức", type: "short_text", required: true, options: [] },
        { entryId: "200103", title: "Số điện thoại di động (Zalo)", type: "short_text", required: true, options: [] },
        { entryId: "200104", title: "Vị trí chuyên môn mong muốn", type: "short_text", required: true, options: [] },
        { entryId: "200105", title: "Mức lương mong muốn (Gross VNĐ)", type: "short_text", required: false, options: [] },
        { entryId: "200106", title: "Kỹ năng chuyên môn chính (Tech stack)", type: "paragraph", required: true, options: [] },
        { entryId: "200107", title: "Đường dẫn trang cá nhân LinkedIn hoặc GitHub", type: "short_text", required: false, options: [] },
        { entryId: "200108", title: "Thư giới thiệu bản thân / Cover Letter tóm tắt", type: "paragraph", required: false, options: [] }
      ]
    }
  };

  async function executeFormScan(rawUrl, demoKey = null) {
    saveCurrentProfileFromInputs();
    const selectedProfId = scannerProfileSelect ? scannerProfileSelect.value : currentProfileId;
    const activeProf = profiles.find(p => p.id === selectedProfId) || profiles[0];

    if (scannerLoading) scannerLoading.style.display = "block";
    if (scannerResultContainer) scannerResultContainer.style.display = "none";
    if (scannedTableBody) scannedTableBody.innerHTML = "";

    try {
      let formData = null;

      if (demoKey && DEMO_FORMS[demoKey]) {
        // Dữ liệu mô phỏng demo
        await new Promise(r => setTimeout(r, 400));
        formData = JSON.parse(JSON.stringify(DEMO_FORMS[demoKey]));
        currentScannedUrl = formData.url;
        if (scannerUrlInput) scannerUrlInput.value = formData.url;
      } else {
        const url = (rawUrl || "").trim();
        if (!url) {
          alert("Vui lòng nhập đường link Google Forms cần quét!");
          if (scannerLoading) scannerLoading.style.display = "none";
          return;
        }

        currentScannedUrl = url;

        // Gọi proxy API trên local server
        const apiUrl = `/api/scan-form?url=${encodeURIComponent(url)}`;
        let response = null;
        try {
          const res = await fetch(apiUrl);
          if (res.ok) {
            response = await res.json();
          }
        } catch (netErr) {
          console.warn("[Scanner] Lỗi kết nối API:", netErr);
        }

        if (response && response.success && response.questions && response.questions.length > 0) {
          formData = response;
          currentScannedUrl = response.url || url;
        } else {
          throw new Error((response && response.error) || "Không thể tải cấu trúc biểu mẫu từ đường dẫn này. Vui lòng kiểm tra lại link Google Form đã được chia sẻ công khai.");
        }
      }

      currentScannedData = formData;

      // So khớp câu hỏi với Profile bằng GoogleFormParser
      if (window.GoogleFormParser) {
        currentMappedQuestions = window.GoogleFormParser.mapQuestionsWithProfile(formData.questions, activeProf);
      } else {
        currentMappedQuestions = formData.questions.map(q => ({ ...q, mappedValue: "", confidence: 0 }));
      }

      renderScannedResults(formData, currentMappedQuestions);
      showToast(`Đã bóc tách thành công ${formData.questions.length} câu hỏi!`, "✨");
    } catch (err) {
      alert("Lỗi khi quét form: " + err.message);
    } finally {
      if (scannerLoading) scannerLoading.style.display = "none";
    }
  }

  function renderScannedResults(formData, mappedQuestions) {
    if (!scannerResultContainer || !scannedTableBody) return;

    if (scannedFormTitle) scannedFormTitle.textContent = formData.title || "Google Biểu Mẫu";
    if (scannedFormDesc) scannedFormDesc.textContent = formData.description || "Biểu mẫu đã được phân tích cấu trúc trường và câu hỏi.";

    const totalQ = mappedQuestions.length;
    const filledQ = mappedQuestions.filter(q => q.mappedValue).length;
    const matchRate = totalQ > 0 ? Math.round((filledQ / totalQ) * 100) : 0;

    if (scannedQCount) {
      scannedQCount.textContent = `${totalQ} câu hỏi • Tự khớp ${filledQ}/${totalQ} (${matchRate}%)`;
    }

    scannedTableBody.innerHTML = "";

    const typeLabels = {
      short_text: "Trả lời ngắn",
      paragraph: "Đoạn văn",
      multiple_choice: "Trắc nghiệm",
      dropdown: "Thả xuống",
      checkbox: "Hộp kiểm",
      date: "Ngày tháng",
      time: "Giờ giấc"
    };

    mappedQuestions.forEach((q, idx) => {
      const tr = document.createElement("tr");

      // Cột 1: Câu hỏi
      const tdTitle = document.createElement("td");
      const titleWrap = document.createElement("div");
      titleWrap.style.fontWeight = "600";
      titleWrap.style.color = "var(--text-main)";
      titleWrap.textContent = `${idx + 1}. ${q.title}`;
      if (q.required) {
        const reqSpan = document.createElement("span");
        reqSpan.style.color = "#ef4444";
        reqSpan.style.marginLeft = "4px";
        reqSpan.textContent = "*";
        titleWrap.appendChild(reqSpan);
      }
      const entrySpan = document.createElement("div");
      entrySpan.className = "entry-tag";
      entrySpan.textContent = `entry.${q.entryId}`;
      tdTitle.appendChild(titleWrap);
      tdTitle.appendChild(entrySpan);

      // Cột 2: Loại câu hỏi
      const tdType = document.createElement("td");
      const typeBadge = document.createElement("span");
      typeBadge.className = "badge-qtype";
      typeBadge.textContent = typeLabels[q.type] || q.type;
      tdType.appendChild(typeBadge);

      // Cột 3: Câu trả lời có thể chỉnh sửa
      const tdValue = document.createElement("td");
      if (q.type === "paragraph") {
        const textarea = document.createElement("textarea");
        textarea.className = "input-text-scan input-textarea-scan";
        textarea.value = q.mappedValue || "";
        textarea.dataset.entry = q.entryId;
        textarea.placeholder = "Nhập nội dung câu trả lời...";
        textarea.addEventListener("input", e => {
          q.mappedValue = e.target.value;
        });
        tdValue.appendChild(textarea);
      } else if ((q.type === "multiple_choice" || q.type === "dropdown") && q.options && q.options.length > 0) {
        const select = document.createElement("select");
        select.className = "input-select-scan";
        select.dataset.entry = q.entryId;
        
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "-- Chọn đáp án --";
        select.appendChild(defaultOpt);

        q.options.forEach(opt => {
          const optEl = document.createElement("option");
          optEl.value = opt;
          optEl.textContent = opt;
          if (opt === q.mappedValue) optEl.selected = true;
          select.appendChild(optEl);
        });

        select.addEventListener("change", e => {
          q.mappedValue = e.target.value;
        });
        tdValue.appendChild(select);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input-text-scan";
        input.value = q.mappedValue || "";
        input.dataset.entry = q.entryId;
        input.placeholder = "Nhập nội dung câu trả lời...";
        input.addEventListener("input", e => {
          q.mappedValue = e.target.value;
        });
        tdValue.appendChild(input);
      }

      // Cột 4: Độ tin cậy
      const tdConf = document.createElement("td");
      const confBadge = document.createElement("span");
      if (q.confidence >= 0.8) {
        confBadge.className = "badge-confidence badge-high";
        confBadge.innerHTML = `✓ ${Math.round(q.confidence * 100)}%`;
      } else if (q.confidence >= 0.65) {
        confBadge.className = "badge-confidence badge-mid";
        confBadge.innerHTML = `~ ${Math.round(q.confidence * 100)}%`;
      } else {
        confBadge.className = "badge-confidence badge-none";
        confBadge.textContent = "Chưa khớp";
      }
      tdConf.appendChild(confBadge);

      tr.appendChild(tdTitle);
      tr.appendChild(tdType);
      tr.appendChild(tdValue);
      tr.appendChild(tdConf);

      scannedTableBody.appendChild(tr);
    });

    scannerResultContainer.style.display = "block";
  }

  function getGeneratedPrefilledUrl() {
    if (!window.GoogleFormParser || !currentScannedUrl) return "";
    return window.GoogleFormParser.generatePrefilledUrl(currentScannedUrl, currentMappedQuestions);
  }

  if (btnStartScan) {
    btnStartScan.addEventListener("click", () => {
      const url = scannerUrlInput ? scannerUrlInput.value : "";
      executeFormScan(url);
    });
  }

  if (scannerUrlInput) {
    scannerUrlInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (btnStartScan) btnStartScan.click();
      }
    });
  }

  if (btnLoadDemoSurvey) {
    btnLoadDemoSurvey.addEventListener("click", () => {
      executeFormScan("", "survey");
    });
  }

  if (btnLoadDemoJob) {
    btnLoadDemoJob.addEventListener("click", () => {
      executeFormScan("", "job");
    });
  }

  if (btnOpenPrefilled) {
    btnOpenPrefilled.addEventListener("click", () => {
      const prefilledUrl = getGeneratedPrefilledUrl();
      if (!prefilledUrl) {
        alert("Vui lòng quét biểu mẫu trước!");
        return;
      }
      window.open(prefilledUrl, "_blank");
      showToast("🚀 Đang mở Google Form với câu trả lời điền sẵn 100%!", "🚀");
    });
  }

  if (btnCopyPrefilled) {
    btnCopyPrefilled.addEventListener("click", () => {
      const prefilledUrl = getGeneratedPrefilledUrl();
      if (!prefilledUrl) {
        alert("Vui lòng quét biểu mẫu trước!");
        return;
      }
      navigator.clipboard.writeText(prefilledUrl).then(() => {
        showToast("📋 Đã sao chép link điền sẵn vào bộ nhớ tạm!", "📋");
      }).catch(() => {
        prompt("Sao chép link này:", prefilledUrl);
      });
    });
  }

  if (btnRescan) {
    btnRescan.addEventListener("click", () => {
      if (scannerUrlInput && scannerUrlInput.value) {
        executeFormScan(scannerUrlInput.value);
      } else {
        if (scannerResultContainer) scannerResultContainer.style.display = "none";
        if (scannerUrlInput) scannerUrlInput.focus();
      }
    });
  }

  if (scannerProfileSelect) {
    scannerProfileSelect.addEventListener("change", () => {
      if (currentScannedData && currentScannedData.questions) {
        const selectedProf = profiles.find(p => p.id === scannerProfileSelect.value) || profiles[0];
        if (window.GoogleFormParser) {
          currentMappedQuestions = window.GoogleFormParser.mapQuestionsWithProfile(currentScannedData.questions, selectedProf);
          renderScannedResults(currentScannedData, currentMappedQuestions);
          showToast(`Đã đổi sang hồ sơ "${selectedProf.name}"!`, "🔄");
        }
      }
    });
  }

  // ==========================================
  // 4. FORM PLAYGROUND & TEST LAB
  // ==========================================
  const pgTabs = document.querySelectorAll(".pg-tab");
  const testFormWrappers = document.querySelectorAll(".test-form-wrapper");

  pgTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      pgTabs.forEach(t => t.classList.remove("active"));
      testFormWrappers.forEach(w => w.classList.remove("active"));

      tab.classList.add("active");
      const targetForm = document.getElementById(tab.dataset.form);
      if (targetForm) targetForm.classList.add("active");
      pgStatsBar.style.display = "none";
    });
  });

  // Đồng bộ chọn hồ sơ trong playground
  pgProfilePicker.addEventListener("change", e => {
    currentProfileId = e.target.value;
    renderProfileTabs();
    loadProfileIntoEditor();
  });

  // THỬ ĐIỀN FORM TRONG PLAYGROUND
  btnPgFill.addEventListener("click", () => {
    saveCurrentProfileFromInputs();
    const activeFormWrapper = document.querySelector(".test-form-wrapper.active");
    if (!activeFormWrapper) return;

    const startTime = performance.now();
    const activeProf = profiles.find(p => p.id === currentProfileId) || profiles[0];

    // Quét các trường bên trong khung form đang mở
    const detector = window.FormMasterDetector;
    const filler = window.FormMasterFiller;

    let matches = [];
    if (activeFormWrapper.id === "form-gform") {
      matches = detector.detectGoogleFormsFields(activeProf);
    } else {
      const inputs = activeFormWrapper.querySelectorAll("input, textarea, select");
      inputs.forEach(el => {
        const m = detector.matchField(el, activeProf);
        if (m) matches.push(m);
      });
    }

    if (matches.length === 0) {
      showToast("Không tìm thấy trường nào khớp với hồ sơ hiện tại.", "⚠️");
      return;
    }

    const res = filler.fillAllDetected(matches);
    const duration = ((performance.now() - startTime) / 1000).toFixed(3);

    // Hiển thị thanh thống kê
    pgStatsBar.style.display = "flex";
    pgStatsText.textContent = `⚡ Đã điền thành công ${res.filledCount}/${res.totalDetected} trường trong ${duration}s!`;
    showToast(`Đã tự động điền ${res.filledCount} trường!`, "⚡");
  });

  // ĐIỀN DỮ LIỆU NGẪU NHIÊN TEST
  btnPgRandom.addEventListener("click", () => {
    const activeFormWrapper = document.querySelector(".test-form-wrapper.active");
    if (!activeFormWrapper) return;

    const inputs = activeFormWrapper.querySelectorAll("input, textarea, select");
    inputs.forEach(el => {
      const type = (el.type || "").toLowerCase();
      const tag = el.tagName.toLowerCase();

      if (type === "radio" || type === "checkbox") {
        el.checked = true;
        window.FormMasterFiller.highlightElement(el);
      } else if (tag === "select") {
        if (el.options.length > 1) {
          el.selectedIndex = 1;
          window.FormMasterFiller.highlightElement(el);
        }
      } else if (type === "email") {
        window.FormMasterFiller.setNativeValue(el, `test_${Math.floor(Math.random() * 1000)}@qa-test.com`);
        window.FormMasterFiller.highlightElement(el);
      } else if (type === "tel") {
        window.FormMasterFiller.setNativeValue(el, "0987654321");
        window.FormMasterFiller.highlightElement(el);
      } else {
        window.FormMasterFiller.setNativeValue(el, `Dữ liệu Test #${Math.floor(Math.random() * 999)}`);
        window.FormMasterFiller.highlightElement(el);
      }
    });

    // Xử lý radio trong Google Forms simulator
    const gformRadios = activeFormWrapper.querySelectorAll(".gform-radio-circle");
    if (gformRadios.length > 0) {
      gformRadios[0].setAttribute("aria-checked", "true");
    }

    showToast("Đã điền dữ liệu ngẫu nhiên vào form!", "🎲");
  });

  // XÓA TRẮNG FORM
  btnPgClear.addEventListener("click", () => {
    const activeFormWrapper = document.querySelector(".test-form-wrapper.active");
    if (!activeFormWrapper) return;

    const inputs = activeFormWrapper.querySelectorAll("input, textarea, select");
    inputs.forEach(el => {
      if (el.type === "radio" || el.type === "checkbox") {
        el.checked = false;
      } else if (el.tagName.toLowerCase() === "select") {
        el.selectedIndex = 0;
      } else {
        el.value = "";
      }
    });

    // Reset GForm radios
    activeFormWrapper.querySelectorAll(".gform-radio-circle").forEach(r => {
      r.setAttribute("aria-checked", "false");
    });

    pgStatsBar.style.display = "none";
    showToast("Đã xóa trắng dữ liệu trên form!", "🧹");
  });

  // Google Forms simulator Radio click interaction
  document.querySelectorAll(".gform-radio-option").forEach(opt => {
    opt.addEventListener("click", () => {
      const group = opt.closest(".gform-radio-group");
      if (group) {
        group.querySelectorAll(".gform-radio-circle").forEach(c => c.setAttribute("aria-checked", "false"));
      }
      const circle = opt.querySelector(".gform-radio-circle");
      if (circle) circle.setAttribute("aria-checked", "true");
    });
  });

  // ==========================================
  // 5. TỪ ĐIỂN NHẬN DIỆN (DICTIONARY)
  // ==========================================
  const dictTableBody = document.getElementById("dict-table-body");
  const dictSearchInput = document.getElementById("dict-search-input");

  function renderDictionaryTable(filter = "") {
    const rules = window.FormMasterRules;
    if (!rules || !rules.FIELD_DEFINITIONS) return;

    dictTableBody.innerHTML = "";
    const cleanFilter = rules.removeAccents(filter);

    const fieldLabelsMap = {
      fullName: "Họ và tên đầy đủ",
      lastName: "Họ / Họ đệm",
      firstName: "Tên",
      email: "Email liên hệ",
      phone: "Số điện thoại",
      idCard: "CCCD / CMND / Hộ chiếu",
      dob: "Ngày sinh",
      gender: "Giới tính",
      nationality: "Quốc tịch",
      maritalStatus: "Tình trạng hôn nhân",
      address: "Địa chỉ cụ thể",
      ward: "Phường / Xã",
      district: "Quận / Huyện",
      city: "Tỉnh / Thành phố",
      country: "Quốc gia",
      zipCode: "Mã bưu điện (Zip)",
      university: "Trường Đại học",
      major: "Chuyên ngành",
      educationLevel: "Trình độ học vấn",
      gradYear: "Năm tốt nghiệp",
      gpa: "Điểm GPA",
      jobTitle: "Vị trí ứng tuyển",
      experienceYears: "Số năm kinh nghiệm",
      currentCompany: "Công ty hiện tại",
      expectedSalary: "Mức lương mong muốn",
      skills: "Kỹ năng chuyên môn",
      coverLetter: "Thư xin việc Cover Letter",
      linkedin: "Link LinkedIn",
      github: "Link GitHub",
      portfolio: "Link Portfolio/Website",
      notes: "Ghi chú thêm"
    };

    for (const [key, def] of Object.entries(rules.FIELD_DEFINITIONS)) {
      const label = fieldLabelsMap[key] || key;
      const allText = `${label} ${key} ${def.keywords.join(" ")}`;
      if (cleanFilter && !rules.removeAccents(allText).includes(cleanFilter)) {
        continue;
      }

      const tr = document.createElement("tr");

      const tdLabel = document.createElement("td");
      const strong = document.createElement("strong");
      strong.style.cssText = "color: var(--text-main); font-size: 13.5px;";
      strong.textContent = label;
      tdLabel.appendChild(strong);

      const tdKey = document.createElement("td");
      const code = document.createElement("code");
      code.style.cssText = "color: var(--accent); background: var(--bg-card-subtle); padding: 2px 6px; border-radius: 4px;";
      code.textContent = key;
      tdKey.appendChild(code);

      const tdKw = document.createElement("td");
      def.keywords.forEach(kw => {
        const span = document.createElement("span");
        span.className = "kw-badge";
        span.textContent = kw;
        tdKw.appendChild(span);
      });

      const tdPriority = document.createElement("td");
      const spanP = document.createElement("span");
      spanP.style.cssText = "color: #34d399; font-weight: 700;";
      spanP.textContent = `${Math.round(def.baseWeight * 100)}%`;
      tdPriority.appendChild(spanP);

      tr.appendChild(tdLabel);
      tr.appendChild(tdKey);
      tr.appendChild(tdKw);
      tr.appendChild(tdPriority);

      dictTableBody.appendChild(tr);
    }
  }

  dictSearchInput.addEventListener("input", e => {
    renderDictionaryTable(e.target.value.trim());
  });

  // ==========================================
  // 6. KIỂM THỰC DỮ LIỆU & IMPORT/EXPORT CHỐNG XSS
  // ==========================================
  const btnExportJson = document.getElementById("btn-export-json");
  const btnTriggerImport = document.getElementById("btn-trigger-import");
  const fileImportJson = document.getElementById("file-import-json");
  const btnResetDefaults = document.getElementById("btn-reset-defaults");

  // Schema Validator & Sanitizer cho danh sách profiles
  function sanitizeProfilesList(rawList) {
    if (!Array.isArray(rawList)) return [];

    const sanitized = [];
    const forbiddenKeys = ["__proto__", "constructor", "prototype"];

    rawList.slice(0, 20).forEach((item, index) => {
      if (!item || typeof item !== "object") return;

      const profile = Object.create(null);
      profile.id = typeof item.id === "string" && item.id.length < 100 ? item.id.replace(/[^a-zA-Z0-9_-]/g, "") : `profile_${Date.now()}_${index}`;
      profile.name = typeof item.name === "string" ? item.name.substring(0, 100) : `Hồ sơ #${index + 1}`;
      profile.isDefault = Boolean(item.isDefault);

      profile.data = Object.create(null);
      const rawData = item.data && typeof item.data === "object" ? item.data : {};

      STANDARD_INPUT_IDS.forEach(key => {
        if (!forbiddenKeys.includes(key) && rawData[key] !== undefined) {
          const maxLen = key === "coverLetter" ? 10000 : 500;
          profile.data[key] = String(rawData[key]).substring(0, maxLen);
        } else {
          profile.data[key] = "";
        }
      });

      // Custom fields sanitization
      profile.data.customFields = [];
      if (Array.isArray(rawData.customFields)) {
        rawData.customFields.slice(0, 50).forEach(cf => {
          if (cf && typeof cf === "object") {
            const cfLabel = typeof cf.label === "string" ? cf.label.substring(0, 100) : "";
            const cfVal = typeof cf.value === "string" ? cf.value.substring(0, 500) : "";
            const cfKw = typeof cf.keywords === "string" ? cf.keywords.substring(0, 300) : "";
            if (cfLabel || cfVal) {
              profile.data.customFields.push({
                label: cfLabel,
                key: cfLabel ? window.FormMasterRules.removeAccents(cfLabel).replace(/\s+/g, "_").substring(0, 50) : "custom",
                value: cfVal,
                keywords: cfKw
              });
            }
          }
        });
      }

      sanitized.push(profile);
    });

    return sanitized;
  }

  // Xuất file JSON
  btnExportJson.addEventListener("click", () => {
    saveCurrentProfileFromInputs();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `formmaster_profiles_backup_${Date.now()}.json`);
    dlAnchor.click();
    showToast("Đã tải xuống file sao lưu hồ sơ JSON!", "📥");
  });

  // Nhập file JSON với kiểm thực chặt chẽ
  btnTriggerImport.addEventListener("click", () => {
    fileImportJson.click();
  });

  fileImportJson.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File JSON quá lớn! Kích thước tối đa cho phép là 2MB.");
      fileImportJson.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        const validated = sanitizeProfilesList(imported);

        if (validated.length > 0) {
          profiles = validated;
          currentProfileId = profiles[0].id;
          saveStorage();
          renderProfileTabs();
          loadProfileIntoEditor();
          showToast(`Nhập thành công ${validated.length} hồ sơ an toàn!`, "🎉");
        } else {
          alert("File JSON không hợp lệ hoặc không có cấu trúc hồ sơ FormMaster!");
        }
      } catch (err) {
        alert("Lỗi khi đọc file JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    fileImportJson.value = "";
  });

  // Khôi phục mặc định
  btnResetDefaults.addEventListener("click", () => {
    if (confirm("Bạn có muốn khôi phục 3 bộ hồ sơ mặc định chuẩn Việt Nam?")) {
      profiles = sanitizeProfilesList(window.DEFAULT_PROFILES);
      currentProfileId = profiles[0].id;
      saveStorage();
      renderProfileTabs();
      loadProfileIntoEditor();
      showToast("Đã khôi phục hồ sơ mẫu thành công!", "♻️");
    }
  });

  // Sao chép đường dẫn cài đặt extension
  const btnCopyPath = document.getElementById("btn-copy-path");
  btnCopyPath.addEventListener("click", () => {
    navigator.clipboard.writeText("d:\\AppForm").then(() => {
      btnCopyPath.textContent = "✓";
      showToast("Đã sao chép đường dẫn: d:\\AppForm", "📋");
      setTimeout(() => { btnCopyPath.textContent = "📋"; }, 1500);
    });
  });

  // ==========================================
  // 7. THEME TOGGLE (DARK / LIGHT)
  // ==========================================
  const savedTheme = localStorage.getItem("formmaster_theme") || "dark";
  applyTheme(savedTheme);

  themeToggle.addEventListener("click", () => {
    const current = document.body.classList.contains("theme-light") ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
  });

  function applyTheme(theme) {
    if (theme === "light") {
      document.body.classList.add("theme-light");
      document.body.classList.remove("theme-dark");
      themeIcon.textContent = "☀️";
      themeText.textContent = "Chế độ sáng";
      localStorage.setItem("formmaster_theme", "light");
    } else {
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
      themeIcon.textContent = "🌙";
      themeText.textContent = "Chế độ tối";
      localStorage.setItem("formmaster_theme", "dark");
    }
  }

  // Khởi tạo
  await loadStorage();
  renderProfileTabs();
  loadProfileIntoEditor();

  // Hỗ trợ mở trực tiếp tab qua URL hash hoặc query param
  if (window.location.hash === "#scanner" || window.location.search.includes("tab=scanner")) {
    const scannerTabBtn = document.querySelector('[data-tab="tab-scanner"]');
    if (scannerTabBtn) scannerTabBtn.click();
  } else if (window.location.hash === "#playground" || window.location.search.includes("tab=playground")) {
    const pgTabBtn = document.querySelector('[data-tab="tab-playground"]');
    if (pgTabBtn) pgTabBtn.click();
  }
});
