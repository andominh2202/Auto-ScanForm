/**
 * FormMaster AI - Universal Form Field Detector (Hardened)
 * Bộ phát hiện và phân tích trường biểu mẫu đa nền tảng, an toàn và chống False Positive
 */

const FormMasterDetector = (function () {
  "use strict";

  /**
   * Kiểm tra xem trang hiện tại có cấu trúc Google Forms không
   */
  function isGoogleFormPage() {
    return (
      (window.location.hostname.includes("docs.google.com") && window.location.pathname.includes("/forms/")) ||
      document.querySelector(".freebirdFormviewerViewNumberedItemContainer, .Qr7Oae, .whsOnd, form[action*='formResponse']") !== null
    );
  }

  /**
   * Trích xuất văn bản nhãn toàn diện cho một phần tử (Label, ARIA, Placeholder, Preceding Text)
   */
  function getElementLabel(el) {
    if (!el) return "";
    const texts = [];

    // 1. ARIA-LABELLEDBY (Tiêu chuẩn W3C cao nhất)
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const ids = labelledBy.split(/\s+/).filter(Boolean);
      ids.forEach(id => {
        try {
          const refEl = document.getElementById(id);
          if (refEl) {
            const txt = (refEl.innerText || refEl.textContent || "").trim();
            if (txt) texts.push(txt);
          }
        } catch (e) {}
      });
    }

    // 2. Thuộc tính trực tiếp (aria-label, placeholder, title, aria-description)
    if (el.getAttribute("aria-label")) texts.push(el.getAttribute("aria-label"));
    if (el.getAttribute("placeholder")) texts.push(el.getAttribute("placeholder"));
    if (el.getAttribute("title")) texts.push(el.getAttribute("title"));
    if (el.getAttribute("aria-description")) texts.push(el.getAttribute("aria-description"));

    // 3. Thẻ <label for="id">
    if (el.id) {
      try {
        const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicitLabel) {
          texts.push(explicitLabel.innerText || explicitLabel.textContent);
        }
      } catch (e) {}
    }

    // 4. Thẻ cha <label>
    const parentLabel = el.closest("label");
    if (parentLabel) {
      texts.push(parentLabel.innerText || parentLabel.textContent);
    }

    // 5. Google Forms / Khối câu hỏi dạng Card
    const gFormCard = el.closest(".Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, div[role='listitem'], div[data-item-id]");
    if (gFormCard) {
      const gTitle = gFormCard.querySelector("[role='heading'], .M7eMe, .freebirdFormviewerComponentsQuestionBaseTitle, .HoLwm");
      if (gTitle) {
        texts.push(gTitle.innerText || gTitle.textContent);
      }
    }

    // 6. Thẻ bao bọc Form (.form-group, .field, .input-container, tr...)
    const wrapper = el.closest(".form-group, .form-row, .field, .input-container, .form-item, tr, dl, .ant-form-item, .el-form-item");
    if (wrapper) {
      const wrapperLabel = wrapper.querySelector("label, .label, dt, th, .control-label, legend, .ant-form-item-label");
      if (wrapperLabel && wrapperLabel !== parentLabel) {
        texts.push(wrapperLabel.innerText || wrapperLabel.textContent);
      }
      // Trong table: tìm ô td/th liền kề bên trái
      if (wrapper.tagName === "TR") {
        const currentTd = el.closest("td");
        if (currentTd && currentTd.previousElementSibling) {
          texts.push(currentTd.previousElementSibling.innerText || "");
        }
      }
    }

    // 7. Phần tử liền trước (preceding sibling)
    let prev = el.previousElementSibling;
    let count = 0;
    while (prev && count < 3) {
      if (["LABEL", "SPAN", "P", "H3", "H4", "H5", "H6", "DIV", "STRONG"].includes(prev.tagName)) {
        const txt = (prev.innerText || prev.textContent || "").trim();
        if (txt && txt.length < 120) {
          texts.push(txt);
          break;
        }
      }
      prev = prev.previousElementSibling;
      count++;
    }

    // 8. Thuộc tính name hoặc id dạng chữ
    if (el.name) {
      texts.push(el.name.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"));
    }
    if (el.id) {
      texts.push(el.id.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"));
    }

    // Chuẩn hóa và làm sạch
    const cleanTexts = texts
      .map(t => (t || "").replace(/\s+/g, " ").trim())
      .filter(t => t.length > 0 && t.length < 250);

    return cleanTexts.join(" | ");
  }

  /**
   * Phân tích và so khớp một phần tử input thông thường với Profile
   */
  function matchField(el, profile) {
    if (!el || !profile || !profile.data) return null;
    const rules = window.FormMasterRules;
    if (!rules) return null;

    const elType = (el.type || el.tagName).toLowerCase();

    // ==========================================
    // 1. NGUYÊN TẮC BẢO MẬT TUYỆT ĐỐI (SAFETY RULES)
    // ==========================================
    // Bỏ qua input mật khẩu, file, hidden, submit, button
    if (
      elType === "password" ||
      elType === "hidden" ||
      elType === "submit" ||
      elType === "button" ||
      elType === "reset" ||
      elType === "image" ||
      elType === "file" ||
      el.disabled ||
      el.readOnly
    ) {
      return null;
    }

    // Kiểm tra visibility (bỏ qua element ẩn hoàn toàn)
    if (el.style.display === "none" || el.style.visibility === "hidden" || el.hasAttribute("hidden")) {
      return null;
    }

    const labelText = getElementLabel(el);
    const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
    const nameAttr = el.name || "";
    const idAttr = el.id || "";
    const placeholder = el.getAttribute("placeholder") || "";

    // Bỏ qua trường nhạy cảm: Mật khẩu, Thẻ tín dụng, CVV, OTP, Captcha
    if (rules.isSensitiveField(labelText) || rules.isSensitiveField(nameAttr) || rules.isSensitiveField(idAttr) || rules.isSensitiveField(placeholder) || rules.isSensitiveField(autocomplete)) {
      return null;
    }

    // Bỏ qua Checkbox pháp lý / điều khoản / marketing consent
    if (elType === "checkbox") {
      if (rules.isLegalOrConsentCheckbox(labelText) || rules.isLegalOrConsentCheckbox(nameAttr) || rules.isLegalOrConsentCheckbox(idAttr)) {
        return null; // Không được tự động tick điều khoản pháp lý!
      }
    }

    const metadata = {
      labelText,
      elType,
      autocomplete,
      nameAttr,
      idAttr,
      placeholder
    };

    let bestMatch = null;
    let highestConfidence = 0.0;

    // ==========================================
    // 2. SO KHỚP CÁC TRƯỜNG CHUẨN (STANDARD FIELDS)
    // ==========================================
    for (const [fieldKey, fieldDef] of Object.entries(rules.FIELD_DEFINITIONS)) {
      const targetVal = profile.data[fieldKey];
      if (targetVal === undefined || targetVal === null || targetVal === "") continue;

      const evalResult = rules.evaluateConfidence(metadata, fieldKey, fieldDef);

      if (evalResult.confidence > highestConfidence && evalResult.confidence >= 0.65) {
        highestConfidence = evalResult.confidence;
        bestMatch = {
          element: el,
          fieldKey,
          targetValue: targetVal,
          labelText,
          confidence: evalResult.confidence,
          confidenceLevel: evalResult.level,
          source: evalResult.source,
          isCustom: false,
          isGoogleForm: false
        };
      }
    }

    // ==========================================
    // 3. SO KHỚP TRƯỜNG TÙY CHỈNH (CUSTOM FIELDS)
    // ==========================================
    if (Array.isArray(profile.data.customFields)) {
      for (const customField of profile.data.customFields) {
        if (!customField.value) continue;

        const evalResult = rules.evaluateCustomField(metadata, customField);

        if (evalResult.confidence > highestConfidence && evalResult.confidence >= 0.65) {
          highestConfidence = evalResult.confidence;
          bestMatch = {
            element: el,
            fieldKey: customField.key || customField.label,
            targetValue: customField.value,
            labelText,
            confidence: evalResult.confidence,
            confidenceLevel: evalResult.level,
            source: evalResult.source,
            isCustom: true,
            isGoogleForm: false
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Phát hiện chuyên sâu các loại câu hỏi trên Google Forms
   */
  function detectGoogleFormsFields(profile) {
    const results = [];
    const rules = window.FormMasterRules;
    if (!rules || !profile || !profile.data) return results;

    // Quét thẻ card chứa câu hỏi (hỗ trợ nhiều fallback class/attributes)
    const questionCards = document.querySelectorAll(
      ".Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, div[role='listitem'], div[data-item-id]"
    );

    questionCards.forEach(card => {
      const headingEl = card.querySelector("[role='heading'], .M7eMe, .freebirdFormviewerComponentsQuestionBaseTitle, .HoLwm");
      if (!headingEl) return;
      const questionText = (headingEl.innerText || headingEl.textContent || "").trim();
      if (!questionText || rules.isSensitiveField(questionText)) return;

      // 1. Text input hoặc Textarea trong câu hỏi Google Forms
      const textInput = card.querySelector("input.whsOnd, textarea.KHxj8b, input[type='text'], input[type='email'], input[type='tel'], input[type='date'], textarea");
      if (textInput) {
        const match = matchField(textInput, profile);
        if (match) {
          match.isGoogleForm = true;
          match.questionType = "text";
          results.push(match);
          return;
        }
      }

      // 2. Radio Button Group (Câu hỏi một lựa chọn)
      const radioGroup = card.querySelector("[role='radiogroup']");
      if (radioGroup) {
        for (const [fieldKey, fieldDef] of Object.entries(rules.FIELD_DEFINITIONS)) {
          const val = profile.data[fieldKey];
          if (!val) continue;

          const evalResult = rules.evaluateConfidence({ labelText: questionText }, fieldKey, fieldDef);
          if (evalResult.confidence >= 0.65) {
            const radios = card.querySelectorAll("[role='radio'], input[type='radio']");
            radios.forEach(r => {
              const optLabel = (r.getAttribute("data-value") || r.getAttribute("aria-label") || r.closest("label")?.innerText || r.parentElement?.innerText || "").trim();
              if (
                rules.removeAccents(optLabel) === rules.removeAccents(val) ||
                rules.removeAccents(optLabel).includes(rules.removeAccents(val)) ||
                rules.removeAccents(val).includes(rules.removeAccents(optLabel))
              ) {
                results.push({
                  element: r,
                  fieldKey,
                  targetValue: val,
                  labelText: `${questionText} -> ${optLabel}`,
                  confidence: 0.95,
                  confidenceLevel: "VERY_HIGH",
                  source: "gform-radio",
                  isGoogleForm: true,
                  questionType: "radio"
                });
              }
            });
            break;
          }
        }
        return;
      }

      // 3. Dropdown / Listbox trong Google Forms
      const listbox = card.querySelector("div[role='listbox'], select");
      if (listbox) {
        for (const [fieldKey, fieldDef] of Object.entries(rules.FIELD_DEFINITIONS)) {
          const val = profile.data[fieldKey];
          if (!val) continue;

          const evalResult = rules.evaluateConfidence({ labelText: questionText }, fieldKey, fieldDef);
          if (evalResult.confidence >= 0.65) {
            results.push({
              element: listbox,
              fieldKey,
              targetValue: val,
              labelText: questionText,
              confidence: evalResult.confidence,
              confidenceLevel: evalResult.level,
              source: "gform-listbox",
              isGoogleForm: true,
              questionType: "dropdown"
            });
            break;
          }
        }
        return;
      }

      // 4. Checkbox Group trong Google Forms
      const checkboxes = card.querySelectorAll("div[role='checkbox'], input[type='checkbox']");
      if (checkboxes.length > 0) {
        // Kiểm tra xem câu hỏi có phải điều khoản pháp lý không
        if (rules.isLegalOrConsentCheckbox(questionText)) return;

        for (const [fieldKey, fieldDef] of Object.entries(rules.FIELD_DEFINITIONS)) {
          const val = profile.data[fieldKey];
          if (!val) continue;

          const evalResult = rules.evaluateConfidence({ labelText: questionText }, fieldKey, fieldDef);
          if (evalResult.confidence >= 0.65) {
            checkboxes.forEach(cb => {
              const optLabel = (cb.getAttribute("aria-label") || cb.parentElement?.innerText || "").trim();
              if (rules.removeAccents(val).includes(rules.removeAccents(optLabel))) {
                results.push({
                  element: cb,
                  fieldKey,
                  targetValue: optLabel,
                  labelText: `${questionText} -> ${optLabel}`,
                  confidence: 0.88,
                  confidenceLevel: "HIGH",
                  source: "gform-checkbox",
                  isGoogleForm: true,
                  questionType: "checkbox"
                });
              }
            });
            break;
          }
        }
      }
    });

    return results;
  }

  /**
   * Phát hiện toàn bộ các trường khả dụng trên trang
   */
  function detectAll(profile) {
    if (!profile) return [];
    const results = [];
    const matchedElements = new Set();

    // 1. Ưu tiên quét cấu trúc chuyên biệt nếu là Google Forms
    if (isGoogleFormPage()) {
      const gFormMatches = detectGoogleFormsFields(profile);
      gFormMatches.forEach(m => {
        if (!matchedElements.has(m.element)) {
          matchedElements.add(m.element);
          results.push(m);
        }
      });
    }

    // 2. Quét toàn bộ input, textarea, select chuẩn HTML
    const inputs = document.querySelectorAll(
      "input:not([type='hidden']):not([type='password']):not([type='submit']):not([type='button']):not([type='reset']), textarea, select"
    );

    inputs.forEach(el => {
      if (matchedElements.has(el)) return;
      const match = matchField(el, profile);
      if (match) {
        matchedElements.add(el);
        results.push(match);
      }
    });

    return results;
  }

  return {
    isGoogleFormPage,
    getElementLabel,
    matchField,
    detectGoogleFormsFields,
    detectAll
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = FormMasterDetector;
} else if (typeof window !== "undefined") {
  window.FormMasterDetector = FormMasterDetector;
}
