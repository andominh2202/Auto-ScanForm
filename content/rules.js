/**
 * FormMaster AI - Field Detection Rules & Semantic Matcher (Hardened)
 * Bộ từ điển chuẩn hóa, thuật toán tính điểm Confidence và bộ lọc an toàn
 */

const FormMasterRules = (function () {
  "use strict";

  // Loại bỏ dấu tiếng Việt và ký tự đặc biệt để so khớp mờ (fuzzy matching)
  function removeAccents(str) {
    if (!str || typeof str !== "string") return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Danh sách từ khóa cấm tuyệt đối (Bảo mật: Mật khẩu, Thẻ tín dụng, OTP, Captcha)
  const SENSITIVE_PATTERNS = [
    // Password / PIN
    "password", "mat khau", "mật khẩu", "passcode", "secret", "passphrase", "pin", "ma pin", "mã pin",
    // Credit card / Payment
    "card number", "cardnumber", "card_number", "card-number", "cc-number", "cc_number",
    "cvv", "cvc", "csc", "cvv2", "exp month", "exp year", "expiry", "so the", "số thẻ",
    "ma bao mat", "mã bảo mật", "credit card", "bank account", "so tai khoan", "stk",
    // OTP / Captcha
    "otp", "one time", "verification code", "ma xac thuc", "mã xác thực", "captcha", "recaptcha",
    "security code", "ma bao ve"
  ];

  // Danh sách từ khóa điều khoản pháp lý / Marketing (Tuyệt đối không tự động tick checkbox)
  const LEGAL_CONSENT_PATTERNS = [
    "terms", "dieukhoan", "điều khoản", "condition", "dieu kien", "điều kiện",
    "policy", "chinhsach", "chính sách", "privacy", "quyen rieng tu", "quyền riêng tư",
    "consent", "dong y", "đồng ý", "agree", "accept", "chap nhan", "chấp nhận",
    "newsletter", "ban tin", "bản tin", "marketing", "quang cao", "quảng cáo",
    "subscribe", "nhan thong tin", "nhận thông tin", "khuyen mai", "khuyến mãi"
  ];

  /**
   * Kiểm tra xem một chuỗi nhãn / thuộc tính có chứa từ khóa nhạy cảm không
   */
  function isSensitiveField(text) {
    if (!text || typeof text !== "string") return false;
    const clean = removeAccents(text);
    return SENSITIVE_PATTERNS.some(p => clean.includes(p));
  }

  /**
   * Kiểm tra xem một phần tử có phải là checkbox chấp thuận điều khoản pháp lý / marketing không
   */
  function isLegalOrConsentCheckbox(text) {
    if (!text || typeof text !== "string") return false;
    const clean = removeAccents(text);
    return LEGAL_CONSENT_PATTERNS.some(p => clean.includes(p));
  }

  // Bảng định nghĩa từ khóa ngữ nghĩa chuẩn hóa (30+ fields)
  const FIELD_DEFINITIONS = {
    // 1. Tên đầy đủ
    fullName: {
      keys: ["fullName"],
      keywords: [
        "ho va ten", "ho ten", "ho va chu lot", "ten day du", "ho va ten day du",
        "full name", "fullname", "your name", "applicant name", "candidate name",
        "ten cua ban", "nhap ho va ten", "nguoi lien he", "ten khach hang", "chu so huu"
      ],
      negativeKeywords: ["cong ty", "nguoi nhan hang", "ten truong", "ten cong ty", "chuc vu"],
      types: ["text"],
      autocomplete: ["name"],
      baseWeight: 0.95
    },

    // 2. Họ / Họ đệm
    lastName: {
      keys: ["lastName"],
      keywords: [
        "ho", "ho dem", "ho va ten dem", "last name", "lastname", "surname", "family name"
      ],
      negativeKeywords: ["ho chieu", "ho ten", "thanh pho", "full name"],
      types: ["text"],
      autocomplete: ["family-name"],
      baseWeight: 0.85
    },

    // 3. Tên
    firstName: {
      keys: ["firstName"],
      keywords: [
        "ten", "ten goi", "first name", "firstname", "given name", "forename"
      ],
      negativeKeywords: ["ho ten", "full name", "ten cong ty", "ten truong", "ten du an", "ten dang nhap"],
      types: ["text"],
      autocomplete: ["given-name"],
      baseWeight: 0.85
    },

    // 4. Email
    email: {
      keys: ["email"],
      keywords: [
        "email", "e mail", "thu dien tu", "dia chi email", "email address",
        "contact email", "hom thu", "nhap email", "user email", "work email"
      ],
      negativeKeywords: [],
      types: ["email", "text"],
      autocomplete: ["email"],
      baseWeight: 0.98
    },

    // 5. Số điện thoại
    phone: {
      keys: ["phone", "phoneBackup"],
      keywords: [
        "so dien thoai", "sdt", "dien thoai", "phone", "mobile", "telephone",
        "phone number", "cell phone", "contact number", "so di dong", "nhap so dien thoai",
        "phone no", "tel", "di dong", "hotline", "so lien lac"
      ],
      negativeKeywords: ["fax", "so nha", "so the", "so cccd", "so cmnd", "so ho chieu"],
      types: ["tel", "text", "number"],
      autocomplete: ["tel", "mobile"],
      baseWeight: 0.95
    },

    // 6. CCCD / CMND / Hộ chiếu
    idCard: {
      keys: ["idCard"],
      keywords: [
        "cccd", "cmnd", "can cuoc cong dan", "chung minh nhan dan", "so cccd", "so cmnd",
        "id card", "national id", "citizen id", "passport", "ho chieu", "identity number",
        "so dinh danh", "can cuoc", "ma so ca nhan"
      ],
      negativeKeywords: ["ma sinh vien", "ma nhan vien", "so dien thoai", "ma bieu mau"],
      types: ["text", "number"],
      autocomplete: [],
      baseWeight: 0.92
    },

    // 7. Ngày sinh
    dob: {
      keys: ["dob"],
      keywords: [
        "ngay sinh", "sinh nhat", "date of birth", "dob", "birth date", "birthday",
        "nam sinh", "ngay thang nam sinh", "ngay thang nam sinh"
      ],
      negativeKeywords: ["ngay cap", "ngay het han", "ngay bat dau", "ngay ket thuc"],
      types: ["date", "text"],
      autocomplete: ["bday"],
      baseWeight: 0.92
    },

    // 8. Giới tính
    gender: {
      keys: ["gender"],
      keywords: ["gioi tinh", "gender", "sex"],
      negativeKeywords: [],
      types: ["radio", "select-one", "text"],
      autocomplete: ["sex"],
      baseWeight: 0.90
    },

    // 9. Quốc tịch
    nationality: {
      keys: ["nationality"],
      keywords: ["quoc tich", "nationality", "country of origin"],
      negativeKeywords: [],
      types: ["text", "select-one"],
      autocomplete: ["country-name"],
      baseWeight: 0.85
    },

    // 10. Tình trạng hôn nhân
    maritalStatus: {
      keys: ["maritalStatus"],
      keywords: ["tinh trang hon nhan", "hon nhan", "marital status", "tinh trang gia dinh"],
      negativeKeywords: [],
      types: ["text", "select-one"],
      autocomplete: [],
      baseWeight: 0.80
    },

    // 11. Địa chỉ chi tiết
    address: {
      keys: ["address", "street"],
      keywords: [
        "dia chi", "dia chi cu the", "dia chi thuong tru", "dia chi lien he", "dia chi nhan hang",
        "so nha", "ten duong", "duong pho", "address", "street address", "residential address",
        "full address", "delivery address", "shipping address"
      ],
      negativeKeywords: ["dia chi email", "email address", "ip address", "mac address"],
      types: ["text", "textarea"],
      autocomplete: ["street-address", "address-line1"],
      baseWeight: 0.88
    },

    // 12. Phường / Xã
    ward: {
      keys: ["ward"],
      keywords: ["phuong", "xa", "phuong xa", "thi tran", "ward", "commune"],
      negativeKeywords: [],
      types: ["text", "select-one"],
      autocomplete: [],
      baseWeight: 0.82
    },

    // 13. Quận / Huyện
    district: {
      keys: ["district"],
      keywords: ["quan", "huyen", "quan huyen", "thi xa", "district"],
      negativeKeywords: [],
      types: ["text", "select-one"],
      autocomplete: [],
      baseWeight: 0.82
    },

    // 14. Tỉnh / Thành phố
    city: {
      keys: ["city"],
      keywords: ["tinh", "thanh pho", "tinh thanh pho", "tinh thanh", "city", "province", "state"],
      negativeKeywords: [],
      types: ["text", "select-one"],
      autocomplete: ["address-level1", "address-level2"],
      baseWeight: 0.85
    },

    // 15. Quốc gia
    country: {
      keys: ["country"],
      keywords: ["quoc gia", "country", "nation"],
      negativeKeywords: [],
      types: ["text", "select-one"],
      autocomplete: ["country-name"],
      baseWeight: 0.80
    },

    // 16. Mã bưu điện / Zip
    zipCode: {
      keys: ["zipCode"],
      keywords: ["ma buu dien", "ma buu chinh", "zip code", "zipcode", "postal code", "postcode", "zip"],
      negativeKeywords: [],
      types: ["text", "number"],
      autocomplete: ["postal-code"],
      baseWeight: 0.82
    },

    // 17. Trường học / Đại học
    university: {
      keys: ["university"],
      keywords: [
        "truong", "dai hoc", "cao dang", "hoc vien", "university", "college",
        "school", "truong tot nghiep", "educational institution"
      ],
      negativeKeywords: ["truong phong", "truong nhom"],
      types: ["text"],
      autocomplete: [],
      baseWeight: 0.86
    },

    // 18. Chuyên ngành
    major: {
      keys: ["major"],
      keywords: [
        "chuyen nganh", "nganh hoc", "khoa", "major",
        "field of study", "department", "specialization"
      ],
      negativeKeywords: [],
      types: ["text"],
      autocomplete: [],
      baseWeight: 0.85
    },

    // 19. Trình độ học vấn / Bằng cấp
    educationLevel: {
      keys: ["educationLevel"],
      keywords: [
        "hoc van", "trinh do hoc van", "bang cap", "degree", "education level",
        "bang cap cao nhat", "trinh do"
      ],
      negativeKeywords: [],
      types: ["text", "select-one"],
      autocomplete: [],
      baseWeight: 0.82
    },

    // 20. Năm tốt nghiệp
    gradYear: {
      keys: ["gradYear"],
      keywords: [
        "nam tot nghiep", "thoi gian tot nghiep", "graduation year",
        "grad year", "year of graduation"
      ],
      negativeKeywords: ["nam sinh", "nam kinh nghiem"],
      types: ["text", "number"],
      autocomplete: [],
      baseWeight: 0.86
    },

    // 21. GPA / Điểm trung bình
    gpa: {
      keys: ["gpa"],
      keywords: ["gpa", "diem trung binh", "diem tich luy", "grade point average", "diem gpa"],
      negativeKeywords: [],
      types: ["text", "number"],
      autocomplete: [],
      baseWeight: 0.85
    },

    // 22. Vị trí ứng tuyển / Chức danh
    jobTitle: {
      keys: ["jobTitle"],
      keywords: [
        "vi tri ung tuyen", "chuc danh", "vi tri", "job title", "position",
        "role", "applying for", "vi tri mong muon", "chuc vu", "desired position"
      ],
      negativeKeywords: ["vi tri dia ly", "vi tri ngoi"],
      types: ["text"],
      autocomplete: ["organization-title"],
      baseWeight: 0.88
    },

    // 23. Năm kinh nghiệm
    experienceYears: {
      keys: ["experienceYears"],
      keywords: [
        "nam kinh nghiem", "so nam kinh nghiem", "kinh nghiem lam viec",
        "years of experience", "experience years", "kinh nghiem", "total experience"
      ],
      negativeKeywords: ["nam sinh", "nam tot nghiep"],
      types: ["text", "number", "select-one"],
      autocomplete: [],
      baseWeight: 0.86
    },

    // 24. Công ty hiện tại / gần nhất
    currentCompany: {
      keys: ["currentCompany"],
      keywords: [
        "cong ty hien tai", "cong ty gan nhat", "noi lam viec hien tai",
        "current company", "company", "employer", "previous company", "cong ty cu", "noi lam viec"
      ],
      // Chặn false positive: Không điền công ty hiện tại vào trường xuất hóa đơn VAT!
      negativeKeywords: ["hoa don", "xuat hoa don", "invoice", "tax", "ma so thue", "mst"],
      types: ["text"],
      autocomplete: ["organization"],
      baseWeight: 0.84
    },

    // 25. Mức lương mong muốn
    expectedSalary: {
      keys: ["expectedSalary"],
      keywords: [
        "muc luong mong muon", "luong mong muon", "thu nhap ky vong",
        "expected salary", "desired salary", "salary expectation", "luong de xuat",
        "muc luong", "salary"
      ],
      negativeKeywords: [],
      types: ["text", "number"],
      autocomplete: [],
      baseWeight: 0.88
    },

    // 26. Kỹ năng
    skills: {
      keys: ["skills"],
      keywords: [
        "ky nang", "ky nang chuyen mon", "skills", "technical skills",
        "key skills", "cong nghe su dung", "so truong", "the manh"
      ],
      negativeKeywords: [],
      types: ["text", "textarea"],
      autocomplete: [],
      baseWeight: 0.82
    },

    // 27. Thư xin việc / Cover letter / Giới thiệu bản thân
    coverLetter: {
      keys: ["coverLetter", "selfIntroduction"],
      keywords: [
        "thu xin viec", "thu gioi thieu", "gioi thieu ban than", "muc tieu nghe nghiep",
        "cover letter", "about you", "introduction", "summary", "ly do ung tuyen",
        "tai sao ban muon lam viec", "why hire you", "gioi thieu van tat"
      ],
      negativeKeywords: [],
      types: ["textarea", "text"],
      autocomplete: [],
      baseWeight: 0.87
    },

    // 28. LinkedIn
    linkedin: {
      keys: ["linkedin"],
      keywords: ["linkedin", "link linkedin", "linkedin url", "linkedin profile"],
      negativeKeywords: [],
      types: ["url", "text"],
      autocomplete: [],
      baseWeight: 0.95
    },

    // 29. GitHub
    github: {
      keys: ["github"],
      keywords: ["github", "link github", "github url", "github profile"],
      negativeKeywords: [],
      types: ["url", "text"],
      autocomplete: [],
      baseWeight: 0.95
    },

    // 30. Portfolio / Website
    portfolio: {
      keys: ["portfolio", "website"],
      keywords: [
        "portfolio", "website", "trang ca nhan", "link du an", "portfolio url",
        "personal website", "blog", "du an ca nhan"
      ],
      negativeKeywords: ["cong ty", "linkedin", "github", "facebook"],
      types: ["url", "text"],
      autocomplete: ["url"],
      baseWeight: 0.90
    },

    // 31. Ghi chú / Yêu cầu thêm
    notes: {
      keys: ["notes"],
      keywords: [
        "ghi chu", "thong tin them", "yeu cau khac", "notes", "additional information",
        "comments", "remarks", "loi nhan", "yeu cau dac biet", "loi dan"
      ],
      negativeKeywords: [],
      types: ["textarea", "text"],
      autocomplete: [],
      baseWeight: 0.75
    }
  };

  /**
   * Tính toán Normalized Confidence [0.0 - 1.0] và thông tin nguồn
   */
  function evaluateConfidence(metadata, fieldKey, fieldDef) {
    const { labelText, elType, autocomplete, nameAttr, idAttr, placeholder } = metadata;
    let confidence = 0.0;
    let source = "unknown";

    // 1. Kiểm tra Negative Keywords để loại trừ trường hợp nhận diện nhầm
    const allCandidateTexts = [labelText, nameAttr, idAttr, placeholder].filter(Boolean).join(" ");
    const cleanAll = removeAccents(allCandidateTexts);

    if (fieldDef.negativeKeywords && fieldDef.negativeKeywords.length > 0) {
      for (const neg of fieldDef.negativeKeywords) {
        if (cleanAll.includes(removeAccents(neg))) {
          // Bị loại trừ bởi từ khóa phủ định
          return { confidence: 0.0, level: "LOW", source: "negative-keyword" };
        }
      }
    }

    // 2. So khớp theo Autocomplete chuẩn HTML5 (Rất tin cậy)
    if (autocomplete && fieldDef.autocomplete && fieldDef.autocomplete.includes(autocomplete.toLowerCase())) {
      confidence = 0.98;
      source = "autocomplete";
      return formatResult(confidence, source);
    }

    // 3. So khớp theo Label Text
    if (labelText) {
      const cleanLabel = removeAccents(labelText);
      for (const kw of fieldDef.keywords) {
        const cleanKw = removeAccents(kw);
        if (cleanLabel === cleanKw) {
          confidence = Math.max(confidence, fieldDef.baseWeight);
          source = "label-exact";
          break;
        } else if (cleanLabel.includes(cleanKw)) {
          // Khớp mờ theo độ dài tương đối
          const ratio = Math.min(1.0, cleanKw.length / cleanLabel.length + 0.3);
          const score = fieldDef.baseWeight * 0.90 * ratio;
          if (score > confidence) {
            confidence = score;
            source = "label-substring";
          }
        }
      }
    }

    // 4. So khớp theo Name / ID
    const nameOrId = [nameAttr, idAttr].filter(Boolean).join(" ");
    if (nameOrId) {
      const cleanName = removeAccents(nameOrId);
      for (const kw of fieldDef.keywords) {
        const cleanKw = removeAccents(kw).replace(/\s+/g, "");
        const cleanNoSpace = cleanName.replace(/\s+/g, "");
        if (cleanNoSpace === cleanKw || cleanNoSpace.includes(cleanKw)) {
          const score = fieldDef.baseWeight * 0.85;
          if (score > confidence) {
            confidence = score;
            source = "name-id";
          }
        }
      }
    }

    // 5. So khớp theo Placeholder
    if (placeholder) {
      const cleanPl = removeAccents(placeholder);
      for (const kw of fieldDef.keywords) {
        const cleanKw = removeAccents(kw);
        if (cleanPl.includes(cleanKw)) {
          const score = fieldDef.baseWeight * 0.80;
          if (score > confidence) {
            confidence = score;
            source = "placeholder";
          }
        }
      }
    }

    // Điểm thưởng nếu input type khớp chuẩn
    if (fieldDef.types && elType && fieldDef.types.includes(elType)) {
      confidence = Math.min(1.0, confidence + 0.05);
    }

    return formatResult(confidence, source);
  }

  /**
   * So khớp trường tùy chỉnh của người dùng (Custom Fields)
   */
  function evaluateCustomField(metadata, customField) {
    if (!customField || (!customField.label && !customField.keywords)) {
      return { confidence: 0.0, level: "LOW", source: "none" };
    }

    const { labelText, nameAttr, idAttr, placeholder } = metadata;
    const allCandidateTexts = [labelText, nameAttr, idAttr, placeholder].filter(Boolean).join(" ");
    const cleanAll = removeAccents(allCandidateTexts);

    let confidence = 0.0;
    let source = "custom";

    if (customField.label) {
      const cleanLabel = removeAccents(customField.label);
      if (cleanAll === cleanLabel) {
        confidence = 0.95;
        source = "custom-exact-label";
      } else if (cleanAll.includes(cleanLabel)) {
        confidence = 0.85;
        source = "custom-substring-label";
      }
    }

    if (customField.keywords) {
      const kws = customField.keywords.split(",").map(k => removeAccents(k.trim())).filter(Boolean);
      for (const kw of kws) {
        if (cleanAll === kw) {
          confidence = Math.max(confidence, 0.95);
          source = "custom-exact-kw";
          break;
        } else if (cleanAll.includes(kw)) {
          confidence = Math.max(confidence, 0.82);
          source = "custom-substring-kw";
        }
      }
    }

    return formatResult(confidence, source);
  }

  function formatResult(score, source) {
    let level = "LOW";
    if (score >= 0.90) level = "VERY_HIGH";
    else if (score >= 0.75) level = "HIGH";
    else if (score >= 0.60) level = "MEDIUM";

    return {
      confidence: parseFloat(score.toFixed(3)),
      level,
      source
    };
  }

  return {
    FIELD_DEFINITIONS,
    SENSITIVE_PATTERNS,
    removeAccents,
    isSensitiveField,
    isLegalOrConsentCheckbox,
    evaluateConfidence,
    evaluateCustomField
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = FormMasterRules;
} else if (typeof window !== "undefined") {
  window.FormMasterRules = FormMasterRules;
}
