/**
 * FormMaster AI - Google Forms URL Parser & Pre-fill Generator
 * Phân tích cấu trúc Google Form từ link và tự động tạo link điền sẵn
 */

const GoogleFormParser = (function () {
  "use strict";

  /**
   * Bóc tách Form ID từ các dạng link Google Forms phổ biến
   */
  function extractFormId(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/) ||
                  url.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Phân tích chuỗi HTML của Google Form để lấy cấu trúc câu hỏi
   */
  function parseFormHtml(html) {
    if (!html || typeof html !== "string") return null;

    // Tìm biến toàn cục FB_PUBLIC_LOAD_DATA_ trong mã nguồn Google Forms
    const match = html.match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*(.*?);\s*<\/script>/s);
    if (!match) return null;

    try {
      const data = JSON.parse(match[1]);
      if (!data || !Array.isArray(data) || data.length < 2) return null;

      const title = data[1][8] || data[1][0] || "Biểu mẫu Google Form";
      const description = data[1][0] || "";
      const rawItems = data[1][1] || [];

      const questions = [];

      rawItems.forEach(item => {
        if (!item || !Array.isArray(item) || item.length < 5 || !item[4] || !item[4][0]) {
          return;
        }

        const qTitle = item[1] || "";
        const qTypeId = item[3];
        const entryMeta = item[4][0];
        const entryId = entryMeta[0];

        // Danh sách options (với trắc nghiệm / dropdown / checkbox)
        const rawOptions = (entryMeta.length > 1 && Array.isArray(entryMeta[1])) ? entryMeta[1] : [];
        const options = rawOptions.map(opt => (Array.isArray(opt) ? opt[0] : opt)).filter(Boolean);
        const required = Boolean(entryMeta[2]);

        let typeStr = "short_text";
        if (qTypeId === 0) typeStr = "short_text";
        else if (qTypeId === 1) typeStr = "paragraph";
        else if (qTypeId === 2) typeStr = "multiple_choice";
        else if (qTypeId === 3) typeStr = "dropdown";
        else if (qTypeId === 4) typeStr = "checkbox";
        else if (qTypeId === 9) typeStr = "date";
        else if (qTypeId === 10) typeStr = "time";

        questions.push({
          entryId: String(entryId),
          title: qTitle,
          type: typeStr,
          options,
          required
        });
      });

      return {
        title,
        description,
        questions
      };
    } catch (err) {
      console.warn("[FormMaster] Lỗi parse FB_PUBLIC_LOAD_DATA_:", err);
      return null;
    }
  }

  /**
   * Tự động gán câu trả lời từ Profile cho danh sách câu hỏi của Google Form
   */
  function mapQuestionsWithProfile(questions, profile) {
    if (!Array.isArray(questions) || !profile || !profile.data) return [];
    const rules = window.FormMasterRules;

    return questions.map(q => {
      let mappedValue = "";
      let confidence = 0.0;
      let matchedKey = null;

      const metadata = {
        labelText: q.title,
        elType: q.type === "paragraph" ? "textarea" : "text",
        autocomplete: "",
        nameAttr: `entry.${q.entryId}`,
        idAttr: "",
        placeholder: ""
      };

      if (rules) {
        // So khớp trường chuẩn
        for (const [key, def] of Object.entries(rules.FIELD_DEFINITIONS)) {
          const val = profile.data[key];
          if (!val) continue;

          const evalRes = rules.evaluateConfidence(metadata, key, def);
          if (evalRes.confidence > confidence && evalRes.confidence >= 0.65) {
            confidence = evalRes.confidence;
            matchedKey = key;

            // Xử lý giá trị đối với trắc nghiệm (chọn option khớp nhất)
            if (q.options && q.options.length > 0) {
              const cleanVal = rules.removeAccents(String(val));
              const bestOpt = q.options.find(opt => {
                const cleanOpt = rules.removeAccents(opt);
                return cleanOpt === cleanVal || cleanOpt.includes(cleanVal) || cleanVal.includes(cleanOpt);
              });
              mappedValue = bestOpt || val;
            } else {
              mappedValue = val;
            }
          }
        }

        // So khớp trường tùy chỉnh
        if (Array.isArray(profile.data.customFields)) {
          for (const cf of profile.data.customFields) {
            if (!cf.value) continue;
            const evalRes = rules.evaluateCustomField(metadata, cf);
            if (evalRes.confidence > confidence && evalRes.confidence >= 0.65) {
              confidence = evalRes.confidence;
              matchedKey = cf.key || cf.label;
              mappedValue = cf.value;
            }
          }
        }
      }

      return {
        ...q,
        mappedValue,
        confidence,
        matchedKey
      };
    });
  }

  /**
   * Tạo đường dẫn Pre-filled URL chuẩn Google Forms (Mở ra là điền sẵn 100%)
   */
  function generatePrefilledUrl(originalUrl, mappedQuestions) {
    if (!originalUrl || !Array.isArray(mappedQuestions)) return originalUrl;

    try {
      const u = new URL(originalUrl);
      // Đảm bảo URL kết thúc bằng /viewform
      let basePath = u.pathname;
      if (!basePath.endsWith("/viewform")) {
        basePath = basePath.replace(/\/formResponse.*$/, "") + "/viewform";
      }

      const params = new URLSearchParams();
      params.set("usp", "pp_url");

      mappedQuestions.forEach(q => {
        if (q.entryId && q.mappedValue) {
          params.append(`entry.${q.entryId}`, q.mappedValue);
        }
      });

      return `${u.origin}${basePath}?${params.toString()}`;
    } catch (e) {
      return originalUrl;
    }
  }

  return {
    extractFormId,
    parseFormHtml,
    mapQuestionsWithProfile,
    generatePrefilledUrl
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = GoogleFormParser;
} else if (typeof window !== "undefined") {
  window.GoogleFormParser = GoogleFormParser;
}
