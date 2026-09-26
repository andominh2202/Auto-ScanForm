# 🪄 FormMaster AI - Tiện Ích & Ứng Dụng Điền Mọi Loại Form Thông Minh (Bản Nâng Cấp 1.1.0)

> Tự động phát hiện và điền chính xác mọi loại biểu mẫu trên web: **Google Forms**, **Typeform**, **Trang web tuyển dụng** (TopCV, VietnamWorks, LinkedIn, Lever, Greenhouse), **Thương mại điện tử & Mua hàng**, **Khảo sát & Đăng ký dịch vụ**.

---

## 🌟 Tính Năng & Kiến Trúc Nổi Bật

1. **Nhận Diện Ngữ Nghĩa & Hệ Thống Confidence (30+ Trường Dữ Liệu)**:
   - Tự động chuẩn hóa, bỏ dấu tiếng Việt và so khớp từ khóa cho: Họ và tên, Họ, Tên, Email, Số điện thoại, CCCD/CMND, Ngày sinh, Giới tính, Địa chỉ, Tỉnh/TP, Quận/Huyện, Phường/Xã, Quốc gia, Mã bưu điện, Trường đại học, Chuyên ngành, Năm tốt nghiệp, GPA, Vị trí ứng tuyển, Năm kinh nghiệm, Mức lương mong muốn, Kỹ năng, Thư xin việc (Cover Letter), Giới thiệu bản thân, LinkedIn, GitHub, Portfolio...
   - **Đánh giá trọng số tin cậy (Confidence Score [0.0 - 1.0])**: Phân cấp Rất cao (≥0.90), Cao (≥0.75), Trung bình (≥0.65). Chỉ tự động điền các trường có độ tin cậy từ 0.65 trở lên để triệt tiêu lỗi điền nhầm.
   - **Khử nhập nhằng (Disambiguation)**: Dùng từ khóa loại trừ (Negative Keywords) để tránh nhầm lẫn giữa thông tin công ty làm việc với công ty xuất hóa đơn VAT, hoặc địa chỉ thanh toán với địa chỉ giao hàng.

2. **Bảo Mật & An Toàn Tuyệt Đối (Security & Safety First)**:
   - **Không bao giờ chạm vào trường nhạy cảm**: Tự động chặn và bỏ qua 100% các ô Mật khẩu (`password`), Mã PIN, Thẻ tín dụng (`credit card`, CVV/CVC, số thẻ), Mã xác thực OTP và Captcha.
   - **Bảo vệ pháp lý**: Tuyệt đối không tự động đánh dấu vào các checkbox Điều khoản dịch vụ (Terms of Service), Chính sách bảo mật (Privacy Policy) hoặc Đăng ký nhận tin quảng cáo (Marketing Consent).
   - **Tuyệt đối không tự động Submit**: Không bao giờ gửi phím Enter hoặc tự kích hoạt nút Gửi / Thanh toán ngoài ý muốn của người dùng.
   - **Quyền riêng tư Local-first**: Toàn bộ dữ liệu hồ sơ chỉ lưu trữ cục bộ trên máy của bạn (`chrome.storage.local`), không gửi ra bất kỳ máy chủ bên ngoài nào.

3. **Hỗ Trợ Toàn Diện Các Loại Form Phức Tạp & Framework Hiện Đại**:
   - **Google Forms**: Tự động nhận diện cấu trúc thẻ câu hỏi, click chọn Radio Button `[role="radio"]`, tick Checkbox `[role="checkbox"]`, chọn Dropdown `[role="listbox"]` và điền Text/Textarea kích hoạt đầy đủ chuỗi sự kiện nội bộ của Google.
   - **Single Page Apps (React, Vue, Angular, Svelte)**: Sử dụng kỹ thuật ghi đè native prototype setter cho cả Input, Textarea và Select, kích hoạt chuỗi sự kiện `input`, `change`, `blur` chuẩn W3C giúp state của framework luôn ghi nhận dữ liệu chính xác.
   - **Dynamic Forms & SPAs**: Tích hợp `MutationObserver` có debounce (500ms) tự động phát hiện các trường form được render động qua AJAX/Fetch/chuyển bước mà không gây giật lag trình duyệt.

4. **Thanh Nổi Cô Lập Shadow DOM (Floating Magic Widget)**:
   - Được đóng gói hoàn toàn trong **Shadow DOM (open mode)**, đảm bảo CSS của website không thể làm vỡ giao diện tiện ích và CSS tiện ích không ảnh hưởng đến website.
   - Tự động giới hạn kéo thả trong màn hình (Viewport Clamping), ghi nhớ vị trí kéo thả trong phiên làm việc.
   - Phím tắt siêu tốc: <kbd>Alt + Shift + F</kbd> hoặc phím <kbd>Escape</kbd> để đóng nhanh.

5. **Trình Thử Nghiệm Biểu Mẫu Trực Tiếp (Form Test Lab)**:
   - Tích hợp sẵn 4 mẫu biểu mẫu thực tế để thử nghiệm ngay lập tức:
     - 💼 Đơn ứng tuyển việc làm (TopCV/Lever)
     - 📋 Google Forms Simulator (Chuẩn 100% giao diện & hành vi Google Forms)
     - 🛒 Đơn mua hàng & Giao nhận (E-Commerce Checkout)
     - 📊 Biểu mẫu khảo sát & Hội thảo
   - Thống kê thời gian điền chính xác (chỉ ~0.03 giây).

6. **Quản Lý Nhiều Hồ Sơ & Kiểm Thực Dữ Liệu Chặt Chẽ**:
   - Tạo không giới hạn hồ sơ: Hồ sơ xin việc IT, Hồ sơ cá nhân & mua sắm, Hồ sơ khảo sát, Hồ sơ người thân...
   - Sao lưu & xuất/nhập file `.json` có bộ lọc kiểm thực dữ liệu (Schema Validation, chống Prototype Pollution và XSS).

---

## 🚀 Hướng Dẫn Cài Đặt Vào Trình Duyệt (Chrome / Edge / Cốc Cốc / Brave)

Chỉ mất **10 giây** để cài đặt trực tiếp mà không cần tải từ store:

1. Mở trình duyệt và truy cập:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Cốc Cốc: `coccoc://extensions`
2. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
3. Bấm vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
4. Chọn thư mục dự án: `d:\AppForm`
5. 🎉 **Xong!** Biểu tượng FormMaster AI xuất hiện trên thanh công cụ và thanh nổi 🪄 sẽ sẵn sàng trên mọi trang web có form.

---

## 🖥️ Cách Mở Bảng Điều Khiển Web App Trực Tiếp

Bạn có thể mở giao diện quản lý hồ sơ và Form Test Lab bằng một trong các cách sau:
- **Cách 1**: Mở trực tiếp file [index.html](file:///d:/AppForm/index.html) bằng trình duyệt bất kỳ.
- **Cách 2**: Chạy máy chủ nội bộ (server đang chạy tại `http://localhost:3000`).

---

## ⌨️ Phím Tắt

- **Alt + Shift + F**: Tự động điền trang web đang mở bằng hồ sơ đang kích hoạt.
- **Escape**: Đóng nhanh menu thanh công cụ nổi.
