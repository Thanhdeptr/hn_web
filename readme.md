# 🚀 AI Tech News - Full-Stack Event-Driven Cloud Architecture

Hệ thống cập nhật tin tức công nghệ AI tự động, vận hành hoàn toàn trên nền tảng **Amazon Web Services (AWS)**. Dự án kết hợp sức mạnh của kiến trúc Serverless (Lambda, DynamoDB) và máy chủ EC2 để tối ưu hóa hiệu suất, bảo mật HTTPS toàn phần và tự động hóa quy trình thu thập dữ liệu.

## 🏗️ Kiến trúc Hệ thống (System Architecture)

Dự án áp dụng mô hình **Event-Driven Cloud Architecture**, nơi các sự kiện được lập lịch để kích hoạt luồng xử lý dữ liệu tự động mà không cần sự can thiệp thủ công.



### **1. Các tầng thành phần (Core Layers)**

* **Edge Layer (Lớp Biên):**
    * **Amazon CloudFront**: Đóng vai trò là Reverse Proxy và điểm tiếp nhận duy nhất (Single Entry Point). Thực hiện phân luồng (Path-based routing) và cung cấp chứng chỉ SSL (HTTPS).
* **Automation Layer (Lớp Tự động hóa):**
    * **Amazon EventBridge**: Cơ chế lập lịch (Cron job) kích hoạt luồng công việc theo thời gian thực.
    * **AWS Lambda**: Hàm Serverless thực thi tác vụ cào dữ liệu (Scraper) từ các nguồn tin tức AI ngoại vi và cập nhật bảng xếp hạng LLM.
* **Persistence Layer (Lớp Dữ liệu):**
    * **Amazon DynamoDB**: Cơ sở dữ liệu NoSQL lưu trữ bài báo và dữ liệu leaderboard. Đảm bảo khả năng đọc/ghi đồng thời từ Lambda và EC2 với độ trễ cực thấp.
* **Compute & Storage Layer:**
    * **Amazon S3**: Lưu trữ Static Assets (HTML, CSS, JS, Images) cho Frontend.
    * **Amazon EC2 (Spot Instance)**: Chạy Node.js Express phục vụ các API requests từ người dùng cuối thông qua domain DuckDNS.

---

## ⚡ Tính năng Hệ thống (Key Features)

* **Tự động hóa 100% (Full Automation)**: Sự kết hợp giữa **EventBridge** và **Lambda** giúp dữ liệu luôn mới mà không tiêu tốn tài nguyên chạy ngầm trên máy chủ.
* **Hợp nhất Endpoint (Single Domain)**: Sử dụng CloudFront Behaviors để gộp S3 và EC2 vào một Domain duy nhất, giải quyết triệt để vấn đề **CORS** và bảo mật HTTPS.
* **Kiến trúc Tách rời (Decoupled Design)**: Tách biệt hoàn toàn luồng thu thập dữ liệu (Ingestion) và luồng phục vụ người dùng (Serving), giúp hệ thống ổn định và dễ dàng bảo trì.
* **Tối ưu chi phí (Cost Efficiency)**: Tận dụng **EC2 Spot Instance** và **AWS Free Tier** (Lambda, S3, DynamoDB, CloudFront) giúp hệ thống vận hành với chi phí cực thấp.
* **Cập nhật IP linh hoạt**: Tích hợp **DuckDNS** giúp duy trì kết nối giữa CloudFront và EC2 ngay cả khi máy chủ thay đổi địa chỉ IP công cộng.

---

## 🔌 Giao thức và Cơ chế Kết nối (Communication Protocols)

Hệ thống thiết lập các luồng dữ liệu thông qua các giao thức tiêu chuẩn công nghiệp:

| Luồng kết nối | Giao thức | Cổng (Port) | Mô tả |
| :--- | :--- | :--- | :--- |
| **Client ↔ CloudFront** | **HTTPS (TLS 1.3)** | 443 | Mã hóa an toàn dữ liệu người dùng cuối. |
| **EventBridge ↔ Lambda** | **AWS Internal** | - | Kích hoạt Trigger theo lịch trình (Scheduled Task). |
| **Lambda ↔ DynamoDB** | **HTTPS (AWS SDK)** | 443 | Ghi dữ liệu tin tức mới vào NoSQL Table. |
| **EC2 ↔ DynamoDB** | **HTTPS (AWS SDK)** | 443 | Truy xuất dữ liệu để trả về cho Client. |
| **CloudFront ↔ S3** | **HTTP** | 80 | Truy xuất file tĩnh qua S3 Website Endpoint. |
| **CloudFront ↔ EC2** | **HTTP** | 3000 | Chuyển tiếp API request tới Backend qua DuckDNS. |

---

## 📊 Luồng Dữ liệu (Data Flow)

1.  **Luồng Thu thập (Background):**
    * **EventBridge** phát tín hiệu → **Lambda** khởi chạy → Cào tin từ Internet → Lưu vào **DynamoDB**.
2.  **Luồng Truy cập (User Access):**
    * Người dùng truy cập CloudFront Domain qua cổng 443.
    * **CloudFront** phân tích đường dẫn:
        * Nếu đường dẫn là `/api/*`: Định tuyến về **EC2** → Lấy data từ **DynamoDB** → Trả về JSON.
        * Nếu đường dẫn là mặc định `(*)`: Định tuyến về **S3** → Trả về giao diện người dùng.

---

## 👨‍💻 Tác giả
* **Thành** - Dự án AI Tech News 2026.
* Công nghệ sử dụng: AWS (CloudFront, S3, EC2, Lambda, EventBridge, DynamoDB), Node.js, Tailwind CSS, DuckDNS.