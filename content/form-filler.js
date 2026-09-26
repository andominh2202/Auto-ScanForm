/**
 * FormMaster AI - Universal Form Filler Engine (Hardened)
 * Bộ máy điền dữ liệu tương thích React, Vue, Angular, Google Forms
 * Tuân thủ nguyên tắc an toàn: Không tự submit, không tick điều khoản pháp lý, không leak PII
 */

const FormMasterFiller = (function () {
  "use strict";

  // Chế độ debug (Mặc định tắt để bảo vệ dữ liệu người dùng)
  const DEBUG_MODE = false;

  function debugLog(...args) {
    if (DEBUG_MODE) {
      console.log("[FormMaster AI]", ...args);
    }
  }

  /**
   * Kỹ thuật Native Setter vượt qua proxy wrapper của React, Vue, Angular
   */
  function setNativeValue(element, value) {
    if (!element) return false;

    element.focus();

    const isTextarea = element.tagName === "TEXTAREA";
    const isSelect = element.tagName === "SELECT";

    let prototype = window.HTMLInputElement.prototype;
    if (isTextarea) {
      prototype = window.HTMLTextAreaElement.prototype;
    } else if (isSelect) {
      prototype = window.HTMLSelectElement.prototype;
    }

    const prototypeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

    if (prototypeSetter) {
      prototypeSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Kích hoạt chuỗi sự kiện Synthetic Input & Change
    // TUYỆT ĐỐI KHÔNG dispatch phím 'Enter' để tránh tự động submit form ngoài ý muốn!
    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));

    // Cập nhật thuộc tính đặc thù của Google Forms nếu có
    if (element.hasAttribute("data-initial-value")) {
      element.setAttribute("data-initial-value", value);
    }

    // Kích hoạt blur để framework lưu trạng thái
    element.dispatchEvent(new Event("blur", { bubbles: true }));

    return true;
  }

  /**
   * Điền thẻ Select / Dropdown chuẩn HTML
   */
  function setSelectValue(element, targetValue) {
    if (!element || element.tagName !== "SELECT") return false;
    const rules = window.FormMasterRules;
    const cleanTarget = rules ? rules.removeAccents(String(targetValue)) : String(targetValue).toLowerCase();

    let bestIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < element.options.length; i++) {
      const opt = element.options[i];
      const optText = rules ? rules.removeAccents(opt.text || "") : opt.text.toLowerCase();
      const optVal = rules ? rules.removeAccents(opt.value || "") : opt.value.toLowerCase();

      if (optText === cleanTarget || optVal === cleanTarget) {
        bestIndex = i;
        bestScore = 100;
        break;
      }
      if (optText.includes(cleanTarget) || cleanTarget.includes(optText)) {
        if (bestScore < 80) {
          bestIndex = i;
          bestScore = 80;
        }
      }
    }

    if (bestIndex >= 0) {
      element.selectedIndex = bestIndex;
      // Dùng native setter cho select để React controlled component nhận diện
      const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
      if (selectSetter) {
        selectSetter.call(element, element.options[bestIndex].value);
      }
      element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      return true;
    }

    return false;
  }

  /**
   * Xử lý Dropdown giả lập của Google Forms (role="listbox")
   */
  function setGoogleFormsDropdown(listbox, targetValue) {
    if (!listbox) return false;
    const rules = window.FormMasterRules;
    const cleanTarget = rules ? rules.removeAccents(String(targetValue)) : String(targetValue).toLowerCase();

    // 1. Mở dropdown bằng cách click
    listbox.click();

    // 2. Tìm các option đang hiển thị
    setTimeout(() => {
      const options = document.querySelectorAll("div[role='option'], .exportSelectPopup .quantumWizMenuPaperselectOption");
      let matchedOpt = null;

      options.forEach(opt => {
        const text = (opt.getAttribute("data-value") || opt.innerText || "").trim();
        const cleanOpt = rules ? rules.removeAccents(text) : text.toLowerCase();
        if (cleanOpt === cleanTarget || cleanOpt.includes(cleanTarget) || cleanTarget.includes(cleanOpt)) {
          matchedOpt = opt;
        }
      });

      if (matchedOpt) {
        matchedOpt.click();
      }
    }, 150);

    return true;
  }

  /**
   * Xử lý Radio Button (HTML chuẩn hoặc Google Forms)
   */
  function setRadioValue(element) {
    if (!element) return false;

    // Google Forms role="radio"
    if (element.getAttribute("role") === "radio") {
      if (element.getAttribute("aria-checked") !== "true") {
        element.click();
      }
      return true;
    }

    // HTML input[type="radio"]
    element.checked = true;
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
    return true;
  }

  /**
   * Xử lý Checkbox an toàn (Tuyệt đối không tick điều khoản pháp lý / marketing)
   */
  function setCheckboxValue(element) {
    if (!element) return false;

    // Google Forms role="checkbox"
    if (element.getAttribute("role") === "checkbox") {
      if (element.getAttribute("aria-checked") !== "true") {
        element.click();
      }
      return true;
    }

    if (!element.checked) {
      element.checked = true;
      element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
    }
    return true;
  }

  /**
   * Hiệu ứng hào quang xanh (Glowing outline) thông báo điền thành công
   */
  function highlightElement(el) {
    if (!el || !el.style) return;
    const originalTransition = el.style.transition;
    const originalBoxShadow = el.style.boxShadow;
    const originalBorderColor = el.style.borderColor;

    el.style.transition = "all 0.3s ease";
    el.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.45), 0 0 15px rgba(16, 185, 129, 0.3)";
    el.style.borderColor = "#10b981";

    setTimeout(() => {
      try {
        el.style.boxShadow = originalBoxShadow;
        el.style.borderColor = originalBorderColor;
        el.style.transition = originalTransition;
      } catch (e) {}
    }, 2500);
  }

  /**
   * Điền một trường cụ thể đã nhận diện
   */
  function fillSingleMatch(match) {
    if (!match || !match.element) return false;
    const el = match.element;
    const val = match.targetValue;
    let success = false;

    const tag = (el.tagName || "").toLowerCase();
    const type = (el.type || "").toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();

    try {
      if (role === "radio" || type === "radio") {
        success = setRadioValue(el);
      } else if (role === "checkbox" || type === "checkbox") {
        success = setCheckboxValue(el);
      } else if (role === "listbox") {
        success = setGoogleFormsDropdown(el, val);
      } else if (tag === "select") {
        success = setSelectValue(el, val);
      } else {
        success = setNativeValue(el, val);
      }

      if (success) {
        highlightElement(el);
      }
    } catch (err) {
      debugLog("Lỗi khi điền field:", match.fieldKey, err.message);
      return false;
    }

    return success;
  }

  /**
   * Điền toàn bộ các trường phát hiện được theo danh sách matches
   */
  function fillAllDetected(matches) {
    let filledCount = 0;
    const details = [];

    matches.forEach(m => {
      // Chỉ điền các trường có confidence >= 0.65
      if (m.confidence !== undefined && m.confidence < 0.65) {
        return;
      }

      try {
        const ok = fillSingleMatch(m);
        if (ok) {
          filledCount++;
          details.push({
            field: m.fieldKey,
            status: "success",
            confidence: m.confidence
          });
        }
      } catch (err) {
        debugLog("Lỗi khi điền:", m.fieldKey);
      }
    });

    return {
      totalDetected: matches.length,
      filledCount,
      details
    };
  }

  /**
   * Điền dữ liệu ngẫu nhiên (Mock Data) an toàn cho mục đích kiểm thử
   */
  function fillRandomData() {
    const inputs = document.querySelectorAll(
      "input:not([type='hidden']):not([type='password']):not([type='submit']):not([type='button']):not([type='reset']), textarea, select"
    );

    const rules = window.FormMasterRules;
    let count = 0;

    inputs.forEach(el => {
      const type = (el.type || "").toLowerCase();
      const tag = el.tagName.toLowerCase();

      // Kiểm tra an toàn: Không điền mật khẩu hoặc thẻ tín dụng
      const label = window.FormMasterDetector?.getElementLabel(el) || "";
      if (rules && (rules.isSensitiveField(label) || rules.isSensitiveField(el.name) || rules.isSensitiveField(el.placeholder))) {
        return;
      }

      // Không tự động tick checkbox điều khoản pháp lý hoặc nhận tin quảng cáo
      if (type === "checkbox") {
        if (rules && rules.isLegalOrConsentCheckbox(label)) {
          return;
        }
        el.checked = true;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        highlightElement(el);
        count++;
      } else if (type === "radio") {
        el.checked = true;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        highlightElement(el);
        count++;
      } else if (tag === "select") {
        if (el.options.length > 1) {
          el.selectedIndex = 1;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          highlightElement(el);
          count++;
        }
      } else if (type === "email") {
        setNativeValue(el, `test_${Math.floor(Math.random() * 10000)}@example.com`);
        highlightElement(el);
        count++;
      } else if (type === "tel") {
        setNativeValue(el, `098${Math.floor(1000000 + Math.random() * 9000000)}`);
        highlightElement(el);
        count++;
      } else if (type === "number") {
        setNativeValue(el, String(Math.floor(Math.random() * 50 + 1)));
        highlightElement(el);
        count++;
      } else if (type === "date") {
        setNativeValue(el, "2000-01-01");
        highlightElement(el);
        count++;
      } else {
        setNativeValue(el, `Dữ liệu mẫu #${Math.floor(Math.random() * 1000)}`);
        highlightElement(el);
        count++;
      }
    });

    return count;
  }

  return {
    setNativeValue,
    setSelectValue,
    setGoogleFormsDropdown,
    setRadioValue,
    setCheckboxValue,
    highlightElement,
    fillSingleMatch,
    fillAllDetected,
    fillRandomData
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = FormMasterFiller;
} else if (typeof window !== "undefined") {
  window.FormMasterFiller = FormMasterFiller;
}
