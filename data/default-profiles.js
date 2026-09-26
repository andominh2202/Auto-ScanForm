/**
 * FormMaster AI - Default Profiles Data
 * Bộ hồ sơ mẫu sẵn có cho người dùng Việt Nam
 */

const DEFAULT_PROFILES = [
  {
    id: "profile_job_dev",
    name: "💼 Hồ sơ xin việc (IT / Lập trình viên)",
    isDefault: true,
    data: {
      // 1. Thông tin cá nhân
      fullName: "Nguyễn Văn An",
      firstName: "An",
      lastName: "Nguyễn Văn",
      email: "nguyenvanan.dev@gmail.com",
      phone: "0988123456",
      phoneBackup: "0912345678",
      dob: "1998-08-15",
      gender: "Nam",
      idCard: "001098012345",
      nationality: "Việt Nam",
      maritalStatus: "Độc thân",

      // 2. Địa chỉ
      address: "Số 88 Đường Cầu Giấy, Phường Dịch Vọng",
      street: "88 Cầu Giấy",
      ward: "Phường Dịch Vọng",
      district: "Quận Cầu Giấy",
      city: "Hà Nội",
      country: "Việt Nam",
      zipCode: "100000",

      // 3. Học vấn
      educationLevel: "Đại học",
      university: "Đại học Bách Khoa Hà Nội",
      major: "Công nghệ thông tin",
      gradYear: "2020",
      gpa: "3.6/4.0",

      // 4. Kinh nghiệm & Tuyển dụng
      jobTitle: "Senior Fullstack Developer",
      experienceYears: "4",
      currentCompany: "FPT Software",
      expectedSalary: "35.000.000 VNĐ",
      noticePeriod: "1 tháng",
      skills: "JavaScript, TypeScript, React, Node.js, Python, Docker, AWS, PostgreSQL",
      coverLetter: "Kính gửi quý công ty, tôi là Nguyễn Văn An với hơn 4 năm kinh nghiệm phát triển các hệ thống web quy mô lớn và ứng dụng hiệu năng cao. Tôi luôn đam mê giải quyết các bài toán công nghệ thách thức, tối ưu hóa trải nghiệm người dùng và làm việc nhóm hiệu quả. Rất mong có cơ hội đóng góp giá trị cho sự phát triển của công ty.",
      selfIntroduction: "Lập trình viên nhiệt huyết, có tư duy logic tốt, khả năng tự học nhanh và thích ứng công nghệ mới.",

      // 5. Liên kết & Mạng xã hội
      linkedin: "https://linkedin.com/in/nguyenvanan-dev",
      github: "https://github.com/nguyenvanan",
      portfolio: "https://nguyenvanan.dev",
      website: "https://nguyenvanan.dev",

      // 6. Ghi chú
      notes: "Có thể nhận việc sau 2 tuần phỏng vấn thành công.",

      // 7. Custom key-values (Trường tùy chỉnh mở rộng)
      customFields: [
        { key: "certifications", label: "Chứng chỉ", value: "AWS Certified Solutions Architect, IELTS 7.5", keywords: "chứng chỉ, certificate, aws, ielts" },
        { key: "fav_work_mode", label: "Hình thức làm việc", value: "Hybrid / Remote", keywords: "hình thức làm việc, work mode, remote, hybrid" },
        { key: "emergency_contact", label: "Người liên hệ khẩn cấp", value: "Nguyễn Văn Bình - 0987654321", keywords: "người liên hệ khẩn cấp, emergency contact, thân nhân" }
      ]
    }
  },
  {
    id: "profile_shopping",
    name: "🛒 Thông tin cá nhân & Mua hàng (Checkout)",
    isDefault: false,
    data: {
      fullName: "Nguyễn Văn An",
      firstName: "An",
      lastName: "Nguyễn",
      email: "an.nguyen.shopping@gmail.com",
      phone: "0988123456",
      dob: "1998-08-15",
      gender: "Nam",
      idCard: "001098012345",
      address: "Tầng 5, Tòa nhà Landmark 72, Đường Phạm Hùng",
      street: "Đường Phạm Hùng",
      ward: "Phường Mễ Trì",
      district: "Quận Nam Từ Liêm",
      city: "Hà Nội",
      country: "Việt Nam",
      zipCode: "100000",
      notes: "Giao hàng giờ hành chính, gọi điện trước khi giao hàng 15 phút.",
      customFields: [
        { key: "payment_pref", label: "Thanh toán ưu tiên", value: "Thanh toán khi nhận hàng (COD)", keywords: "phương thức thanh toán, payment method, cod" }
      ]
    }
  },
  {
    id: "profile_survey",
    name: "📋 Hồ sơ khảo sát & Google Forms",
    isDefault: false,
    data: {
      fullName: "Nguyễn Văn An",
      firstName: "An",
      lastName: "Nguyễn Văn",
      email: "nguyenvanan.research@gmail.com",
      phone: "0988123456",
      dob: "1998-08-15",
      gender: "Nam",
      educationLevel: "Đại học",
      university: "Đại học Bách Khoa",
      jobTitle: "Kỹ sư phần mềm",
      city: "Hà Nội",
      notes: "Tôi đồng ý tham gia khảo sát và nhận thông tin qua email.",
      customFields: [
        { key: "feedback", label: "Góp ý chung", value: "Dịch vụ và nội dung rất hữu ích, hy vọng có thêm nhiều tính năng mới!", keywords: "ý kiến đóng góp, feedback, nhận xét, góp ý" }
      ]
    }
  }
];

// Xuất nếu dùng trong module hoặc window
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_PROFILES };
} else if (typeof window !== "undefined") {
  window.DEFAULT_PROFILES = DEFAULT_PROFILES;
}
