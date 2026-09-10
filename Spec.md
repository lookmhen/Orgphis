# System Specification: Central Phishing Simulation Platform
**Version:** 2.1.0 (Reviewed & Architecturally Hardened)  
**Last Updated:** 2026-09-10  
**Project:** Centralized Phishing Simulation & Security Awareness System (PhishCentral)  
**Review Status:** Reviewed by AppSec, Backend Architecture & Frontend UX Specialists

---

## 1. Executive Summary & Objectives

เดิมทีระบบเดิม (`app.js` / `app-kpi.js`) เป็นระบบอย่างง่ายที่เขียนด้วย Node.js Express + EJS Templates โดยฮาร์ดโค้ดหน้าฟอร์ม (Form EJS) สำหรับองค์กรเดียว และบันทึกผลการเข้าชม/กรอกรหัสผ่านลงในไฟล์ CSV ซึ่งมีข้อจำกัดด้านความปลอดภัย การรองรับ Concurrency การจัดการเทมเพลต และการวิเคราะห์ผลลัพธ์ในภาพรวม

**เป้าหมายของระบบใหม่ (PhishCentral):**
1. **Centralized Platform:** เป็นศูนย์กลางจัดการแคมเปญทดสอบ Phishing สำหรับทุกหน่วยงาน/แผนกในองค์กร
2. **Modern Friendly UI:** หน้า Admin Portal ที่สวยงาม อบอุ่น สบายตา ด้วยสไตล์ **Warm Earthtone** ไม่ใช้สี Gradient สีม่วงที่ดูเครียด
3. **Dynamic Template Engine & Starter Library:** มีเทมเพลตมาตรฐานยอดนิยม (Microsoft 365, Google Workspace, Reset Password, HR/Payroll) พร้อมระบบ **1-Click Clone & Customize**
4. **End-to-End Simulation & Anti-Scanner Defense:** จัดการกลุ่มเป้าหมาย (CSV/Excel), ส่งอีเมลจำลองพร้อมคิวหน่วงเวลา, ดักจับสถิติแม่นยำด้วยระบบกรอง Bot/Mail Gateway Scanners (M365 Safe Links, Proofpoint)
5. **Security & PDPA/ISO 27001 Compliant:** **ไม่เก็บรหัสผ่านจริง** ของพนักงาน บันทึกเฉพาะสถานะ Compromised และพฤติกรรมความปลอดภัย พร้อมระบบป้องกัน Domain Blacklist

---

## 2. System Architecture

```
                                +-------------------------------------------+
                                |               Administrators              |
                                +-------------------------------------------+
                                                      |
                                          (HTTPS / Admin Key Auth)
                                                      v
                                        +---------------------------+
                                        |    React Admin Portal     |
                                        |  (Earthtone / Sandboxed)  |
                                        +---------------------------+
                                                      |
                                                  (REST API)
                                                      v
+-----------------------------------------------------------------------------------------------+
|                                    Node.js Backend Engine                                     |
|                                                                                               |
|   +-------------------+    +--------------------+    +------------------+                     |
|   |  Campaign Engine  |    |  Template Builder  |    |  Tracking Engine |                     |
|   | (DB State Machine)|    | (DOMPurify/Sandbox)|    | (Bot Filter/Gate)|                     |
|   +-------------------+    +--------------------+    +------------------+                     |
|             |                       |                         |                               |
|             |                       |                         v                               |
|             |                       |                +------------------+                     |
|             |                       |                | In-Memory Buffer | (Spike Ingestion)   |
|             |                       |                +------------------+                     |
|             v                       v                         | (Flush Batch)                 |
|   +---------------------------------------------------------------------+                     |
|   |                       Prisma ORM (Data Layer)                       |                     |
|   +---------------------------------------------------------------------+                     |
|                                     |                                                         |
+-------------------------------------|---------------------------------------------------------+
                                      v
                      +-------------------------------+
                      |   SQLite (WAL) / PostgreSQL   |
                      +-------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v (SMTP Connection Pooling)                               v (Serve Landing / Tracking)
+-------------------+                                     +---------------------------------+
|   SMTP Profiles   |                                     | Target Employee (Browser/Email) |
| (Throttled Queue) |                                     | - Pixel Open (Bot Filtered)     |
+-------------------+                                     | - Click Token (URL-Safe NanoId) |
         |                                                | - Submit Form (Zero-Password)   |
         v                                                | - Phishing Report & Freeze State|
+-------------------+                                     +---------------------------------+
| Target Mailboxes  | ------------------------------------>
+-------------------+
```

---

## 3. Technology Stack

| Layer | Technology | Rationale & Specifications |
|---|---|---|
| **Frontend UI** | React 18+ (Vite), Tailwind CSS (Earthtone Tokens), Lucide Icons, Shadcn/Radix UI, Recharts | UI สไตล์ Warm Earthtone, โหลดไว จัดการ State ด้วย TanStack Query |
| **Frontend State & Utilities** | `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `zod`, `dompurify`, `@uiw/react-codemirror` | รองรับ Auto-polling แคมเปญ, Form validation, Data streaming และ Editor |
| **Backend API** | Node.js (Express / TypeScript) | Type-safety สูง รองรับ Event-driven architecture และ Stream Processing |
| **ORM & Database** | Prisma ORM + SQLite (WAL Mode) / PostgreSQL | สำหรับ Standalone ใช้ SQLite ที่เปิด WAL Mode + busy_timeout=5000 (หากเกิน 1,000 targets แนะนำ PostgreSQL) |
| **Email Dispatcher** | Nodemailer (Connection Pooling: `pool: true`, `maxConnections: 3-5`) | มี DB-backed Queue State Machine รองรับ Crash Recovery และ Exponential Backoff สำหรับ SMTP 4xx |
| **Token Generator** | `nanoid(21)` หรือ `crypto.randomBytes(16).toString('base64url')` | High Entropy ($2^{128}$) ไร้รอยต่อ URL-Safe ป้องกัน Scanner สังเกต Pattern UUID |
| **Template Engine** | Handlebars Engine (Pre-compiled with HTML Auto-escaping) | รองรับ Dynamic Variables เช่น `{{name}}`, `{{email}}`, `{{phishing_url}}` โดยไม่เกิด Stored XSS |
| **Security & Middleware** | `helmet`, `express-rate-limit`, Zero-Password Sanitizer Middleware | ป้องกัน Brute-force, Clickjacking และตัดค่ารหัสผ่านออกจาก Request ทันทีก่อนถึง Log |

---

## 4. Core Features & Functional Specifications

### 4.1 Admin Access & Future RBAC (Phased Approach)
- **Current MVP Phase (Functional First with Essential Protection):**
  - มี **Single Master Admin Key / Passcode** ผ่าน Environment Variable (`ADMIN_API_KEY`) หรือ Local Passcode เข้าหน้า Portal ได้ทันที เพื่อป้องกันไม่ให้บุคคลภายนอกหรือผู้ใช้ในเครือข่ายแอบเข้ามาใช้งานระบบส่งอีเมล
  - ไม่ต้องมีหน้า Login ซับซ้อน เพื่อความรวดเร็วในการพัฒนาและเริ่มใช้งานจริง
- **Post-MVP Phase (System Hardening & Multi-User):**
  - ยกระดับเป็น Role-Based Access Control (RBAC) เต็มรูปแบบ: `Super Admin`, `Campaign Manager`, `Auditor` ด้วย JWT Authentication

### 4.2 Target Management (กลุ่มเป้าหมาย)
- **Import Targets:** นำเข้ารายชื่อผ่านไฟล์ CSV หรือ Excel (`.xlsx`)
  - ฟิลด์ที่รองรับ: `Email`, `First Name`, `Last Name`, `Employee ID`, `Department`, `Position`
  - มี Client-Side Validation ตรวจสอบรูปแบบอีเมลและพรีวิว 5 แถวแรกก่อนส่งขึ้นเซิร์ฟเวอร์
- **Target Groups:** จัดกลุ่มเป้าหมาย (เช่น ฝ่ายการเงิน, ฝ่าย IT, สาขาต่างจังหวัด)
- **Blacklist / Exclusion List:** รายชื่ออีเมลที่ไม่ต้องการให้ส่งทดสอบ (เช่น ผู้บริหารระดับ C-Level หรือ External Vendor)
- **Data Integrity Protection:** การลบ Target หรือ Group จะใช้ **Restrict** หรือ **Soft Delete (`deletedAt`)** เพื่อไม่ให้ประวัติผลการทดสอบในอดีตสูญหาย

### 4.3 Email Template Builder & Starter Library
- **Dynamic Variable Injection (with Quick-Insert Chips):**
  - `{{name}}`: ชื่อ-นามสกุลพนักงาน
  - `{{email}}`: อีเมลเป้าหมาย
  - `{{department}}`: แผนก
  - `{{empid}}`: รหัสพนักงาน
  - `{{phishing_url}}`: ลิงก์ฟิชชิ่งเฉพาะบุคคล (Unique URL-safe Token)
  - `{{current_date}}`: วันที่ปัจจุบัน
- **Built-in Starter Template Library (Read-only System Presets):**
  1. **IT Urgent Password Expiry:** แจ้งเตือนรหัสผ่านหมดอายุ ต้องเปลี่ยนทันที
  2. **HR / Annual Bonus & Payroll Review:** ตรวจสอบสิทธิประโยชน์และโบนัสประจำปี
  3. **Microsoft 365 Unusual Sign-in Activity:** แจ้งเตือนการเข้าสู่ระบบต้องสงสัยจากต่างประเทศ
  4. **Google Workspace Storage Full Notice:** แจ้งเตือนพื้นที่ Google Drive เต็ม
  5. **Company Internal Policy Acceptance:** ขอความร่วมมือกดยืนยันนโยบายความปลอดภัยประจำปี
- **One-Click Clone & Forking Rule:**
  - เทมเพลตที่เป็น `isPreset: true` จะถูกล็อกไม่ให้แก้ไขทับต้นฉบับ
  - ผู้ใช้กดปุ่ม **"Clone / Duplicate"** เพื่อสร้างสำเนาใหม่ (`[ชื่อเดิม] (Customized)`) แล้วปรับแต่งข้อความ โลโก้ และเนื้อหาได้อย่างอิสระ
- **Live Preview with Persona Switcher:**
  - สลับดูพรีวิวได้ทั้ง Desktop และ Mobile
  - มี Dropdown เลือก Persona จำลอง (เช่น *"สมชาย ใจดี (IT)"*) เพื่อให้แสดงผลข้อความแทนที่ตัวแปรจริงทันที
- **Safe Sandboxed Preview:**
  - อีเมลพรีวิวผ่าน `<iframe sandbox="allow-same-origin" srcDoc={sanitizedHtml}>` (ปิด `allow-scripts` ป้องกัน Script แอบรัน)

### 4.4 Landing Page Builder & Presets
- **Dynamic Form Customizer:**
  - ปรับแต่งข้อความหัวข้อ (Title), คำอธิบาย (Description), ข้อความปุ่ม Submit
  - อัปโหลดหรือระบุ URL โลโก้องค์กร พร้อมตัวเลือกจัดตำแหน่ง (Center / Left)
  - เปิด-ปิดช่องกรอกข้อมูล: `Email`, `Employee ID`, `Password`, `OTP / 2FA Code`
- **Built-in Starter Landing Page Library:**
  1. **Company Custom SSO Login (Modernized form.ejs):** หน้า Login กลางของบริษัท ดีไซน์คลีนตา รองรับโลโก้องค์กร
  2. **Microsoft 365 Sign-in Clone:** หน้าลงชื่อเข้าใช้สไตล์ Microsoft 365
  3. **Google Sign-in Clone:** หน้า Sign-in สไตล์ Google Minimal
  4. **HR Self-Service Portal:** หน้า Portal ตรวจสอบสิทธิประโยชน์พนักงาน
- **Safe Sandboxed Interactive Preview:**
  - เรนเดอร์หน้าฟิชชิ่งจำลองใน Admin ด้วย `<iframe sandbox="allow-scripts allow-forms" srcDoc={previewHtml}>` **โดยไม่ใส่ `allow-same-origin`** เพื่อตัดการเข้าถึง Cookie, LocalStorage และ Session ของ Admin Portal ป้องกันการถูกโจมตี XSS
- **Post-Submission Behaviors (เมื่อผู้ใช้กด Submit):**
  1. **Security Awareness Education (แนะนำ):** แสดงหน้าแจ้งเตือนทันทีว่า *"นี่เป็นการทดสอบ Phishing ภายในองค์กร!"* พร้อมระบุจุดสังเกต 4 ข้อที่ไม่ควรหลงกล
  2. **Redirect to Real URL:** ส่งต่อไปยังเว็บไซต์จริง (เช่น หน้า SSO บริษัทจริง)
  3. **Simulated Error (404/500):** แสดงหน้าเว็บจำลองว่าเกิดข้อผิดพลาด

### 4.5 SMTP & Sending Profiles (with Connection Pooling)
- **SMTP Configuration:**
  - Host, Port, Secure (TLS/SSL), Username, Password
  - Custom `From Name` และ `From Address`
  - Custom Simulation Headers (เช่น `X-PhishCentral-Simulation: <campaign_id>` สำหรับทำ Whitelist/Bypass Rule ใน M365 และ Google Workspace)
- **Connection Pooling & Rate Limiting:**
  - ใช้ Nodemailer Pool (`maxConnections: 3`, `maxMessages: 100`, Connection Timeout: 10s)
  - กำหนดการหน่วงเวลาการส่ง (Batch Delay & Rate limit) ป้องกันไม่ให้โดนระงับจาก Mail Gateway
- **Crash-Resilient DB-Backed Queue:**
  - สถานะการส่งบันทึกลงฐานข้อมูล (`dispatchStatus: PENDING -> QUEUED -> SENDING -> SENT / FAILED`)
  - หากเซิร์ฟเวอร์ Restart สามารถรันต่อจากจุดเดิมได้ทันทีโดยไม่ส่งอีเมลซ้ำ

### 4.6 Campaign Management, Scheduler & Emergency Kill Switch
- **Campaign Wizard Flow (4 ขั้นตอน):**
  - Step 1: ข้อมูลพื้นฐาน & กำหนดกลุ่มผู้รับ (Target Groups)
  - Step 2: เลือก Email Template & Landing Page
  - Step 3: เลือก SMTP Profile, วันเวลาเริ่มส่ง และ Campaign Lifespan (เช่น 7 วัน)
  - Step 4: ตรวจสอบความถูกต้องและสั่ง Launch
- **Emergency Kill Switch:**
  - ปุ่มหยุดแคมเปญฉุกเฉิน: ยกเลิกคิวส่งที่เหลือทันที และเปลี่ยนสถานะหน้า Landing Page ทั้งหมดให้กลายเป็นหน้าแจ้งเตือนปลอดภัย เพื่อป้องกันผลกระทบที่ไม่คาดคิด

### 4.7 Anti-Scanner, Bot Filtering & Tracking Engine
- **Anti-Scanner Defense (แก้ไขปัญหา Ghost Click จาก M365 Safe Links / Proofpoint):**
  - กรองและคัดแยก User-Agent ที่เป็น Automated Crawler หรือ Security Scanner (เช่น `Proofpoint`, `Symantec`, `HeadlessChrome`, `GoogleImageProxy`)
  - ปฏิเสธการบันทึกสถิติจาก HTTP `HEAD` Request
  - หน้า Landing Page มี Two-Step Client Interaction หรือ JavaScript Challenge สั้นๆ ก่อนบันทึกสถานะ `isClicked = true`
- **Domain Blacklist Protection:**
  - ฝัง Header `X-Robots-Tag: noindex, nofollow, noarchive` ในหน้า Landing Page ทั้งหมด
  - ติดตั้ง `robots.txt` ปฏิเสธ Bot ทุกชนิด เพื่อป้องกัน Google SafeBrowsing หรือ Microsoft SmartScreen แบนโดเมนทดสอบ
- **Tracking Telemetry:**
  - `Sent`: SMTP Relay ยอมรับจดหมาย
  - `Opened`: เปิดอ่านเมล (ตรวจจับผ่าน 1x1 Transparent GIF โดยแยก Proxy Open ออกจาก Human Open)
  - `Clicked`: พนักงานคลิกลิงก์เข้าสู่หน้า Landing Page
  - `Submitted (Compromised)`: เผลอกรอกข้อมูลและกด Submit
  - `Reported`: กดปุ่มรายงาน Phishing
- **SOC/IT Helpdesk Protection & State Freezing:**
  - รองรับการกำหนด Whitelist IP ของทีม IT/SOC (คลิกเพื่อวิเคราะห์จะไม่ถูกนับเป็นเหยื่อ)
  - เมื่อ Target มีสถานะ `REPORTED` ระบบจะ **Freeze สถานะทันที** ป้องกันไม่ให้การตรวจสอบหลังจากนั้นกลายเป็น Compromised
  - แสดงหน้า Landing Page ชื่นชมพนักงานทันทีเมื่อกด Report สำเร็จ (Positive Reinforcement)

---

## 5. Security, Compliance & Data Privacy Policy

> [!IMPORTANT]
> **Zero Password Storage Policy (PDPA / ISO 27001):**
> ระบบจะไม่ทำการจัดเก็บบันทึกรหัสผ่านจริงของพนักงานลงในฐานข้อมูลหรือ Log ใดๆ ทั้งสิ้น
> - **Top-level Express Sanitizer Middleware:** ทำหน้าที่ดักจับ Request ทุกเส้น และ Strip ฟิลด์ `password`, `pass`, `pin`, `otp` ออกจาก `req.body` ทันที ก่อนส่งต่อไปยัง Controller หรือ Logger
> - บันทึกเฉพาะ Flag `isSubmitted = true`, วันเวลาแรกที่กรอก, IP Address, และ User-Agent

- **Token Expiration:** ทุก Tracking Token มีอายุจำกัดตาม Campaign Lifespan (`expiresAt`) หากพ้นกำหนด ลิงก์จะไม่สามารถเข้าถึงได้
- **Audit Logs:** บันทึกการกระทำสำคัญของ Admin ลงตาราง `AuditLog`
- **Security Headers:** ติดตั้ง `helmet` ป้องกัน Clickjacking (`X-Frame-Options: DENY`), MIME sniffing และ Referrer leak

---

## 6. Database Schema (Prisma Data Model)

```prisma
datasource db {
  provider = "sqlite" // or "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPER_ADMIN
  CAMPAIGN_MANAGER
  AUDITOR
}

enum EventType {
  SENT
  OPENED
  CLICKED
  SUBMITTED
  REPORTED
}

enum PostSubmitAction {
  AWARENESS_PAGE
  REDIRECT
  SIMULATED_ERROR
}

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  name      String
  password  String     // Hashed with bcrypt (for Post-MVP Phase)
  role      Role       @default(CAMPAIGN_MANAGER)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  campaigns Campaign[]
  auditLogs AuditLog[]
}

model TargetGroup {
  id          String     @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  targets     Target[]
  campaigns   Campaign[]
}

model Target {
  id            String          @id @default(uuid())
  email         String
  firstName     String?
  lastName      String?
  employeeId    String?
  department    String?
  position      String?
  targetGroupId String
  targetGroup   TargetGroup     @relation(fields: [targetGroupId], references: [id], onDelete: Cascade)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  campaignTargets CampaignTarget[]

  @@unique([email, targetGroupId])
  @@index([email])
  @@index([department])
}

model SmtpProfile {
  id             String     @id @default(uuid())
  name           String
  host           String
  port           Int
  secure         Boolean    @default(false)
  username       String?
  password       String?
  fromName       String
  fromEmail      String
  rateLimit      Int        @default(5)  // emails per second/batch
  delaySeconds   Int        @default(2)  // delay between batches
  maxConnections Int        @default(3)
  customHeaders  String?    // JSON string for custom headers
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  campaigns      Campaign[]
}

model EmailTemplate {
  id          String     @id @default(uuid())
  name        String
  subject     String
  bodyHtml    String
  bodyText    String?
  isPreset    Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  campaigns   Campaign[]
}

model LandingPageTemplate {
  id               String           @id @default(uuid())
  name             String
  pageTitle        String
  logoUrl          String?
  headerText       String?
  subHeaderText    String?
  submitButtonText String           @default("Sign In")
  showEmpIdField   Boolean          @default(true)
  showEmailField   Boolean          @default(true)
  showPasswordField Boolean         @default(true)
  postSubmitAction PostSubmitAction @default(AWARENESS_PAGE)
  redirectUrl      String?
  awarenessContent String?
  customHtml       String?
  isPreset         Boolean          @default(false)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  campaigns        Campaign[]
}

model Campaign {
  id                    String              @id @default(uuid())
  name                  String
  description           String?
  status                String              @default("DRAFT") // DRAFT, SCHEDULED, RUNNING, COMPLETED, CANCELLED
  createdById           String?             // Optional for MVP Phase
  createdBy             User?               @relation(fields: [createdById], references: [id])
  targetGroupId         String
  targetGroup           TargetGroup         @relation(fields: [targetGroupId], references: [id], onDelete: Restrict)
  emailTemplateId       String
  emailTemplate         EmailTemplate       @relation(fields: [emailTemplateId], references: [id], onDelete: Restrict)
  landingPageTemplateId String
  landingPageTemplate   LandingPageTemplate @relation(fields: [landingPageTemplateId], references: [id], onDelete: Restrict)
  smtpProfileId         String
  smtpProfile           SmtpProfile         @relation(fields: [smtpProfileId], references: [id], onDelete: Restrict)
  scheduledAt           DateTime?
  startedAt             DateTime?
  endedAt               DateTime?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  campaignTargets       CampaignTarget[]
  events                EventLog[]

  @@index([status])
  @@index([createdAt])
}

model CampaignTarget {
  id             String     @id @default(uuid())
  campaignId     String
  campaign       Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  targetId       String
  target         Target     @relation(fields: [targetId], references: [id], onDelete: Restrict)
  token          String     @unique // High-entropy URL-safe NanoId
  expiresAt      DateTime?
  
  // Dispatch queue status
  dispatchStatus String     @default("PENDING") // PENDING, QUEUED, SENDING, SENT, FAILED
  sendAttempts   Int        @default(0)
  lastError      String?
  
  // Tracking flags (First Occurrence)
  isSent         Boolean    @default(false)
  isOpened       Boolean    @default(false)
  isClicked      Boolean    @default(false)
  isSubmitted    Boolean    @default(false)
  isReported     Boolean    @default(false)
  sentAt         DateTime?
  openedAt       DateTime?
  clickedAt      DateTime?
  submittedAt    DateTime?
  reportedAt     DateTime?
  events         EventLog[]

  @@unique([campaignId, targetId])
  @@index([token])
  @@index([campaignId, dispatchStatus])
  @@index([campaignId, isSent, isClicked, isSubmitted])
}

model EventLog {
  id               String          @id @default(uuid())
  campaignId       String
  campaign         Campaign        @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  campaignTargetId String?
  campaignTarget   CampaignTarget? @relation(fields: [campaignTargetId], references: [id], onDelete: SetNull)
  eventType        EventType
  ipAddress        String?
  userAgent        String?
  isBot            Boolean         @default(false)
  metadata         String?         // JSON string for telemetry context
  createdAt        DateTime        @default(now())

  @@index([campaignId, eventType])
  @@index([campaignTargetId, createdAt])
  @@index([campaignId, createdAt])
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String   // e.g. CAMPAIGN_LAUNCH, TARGET_IMPORT, TEMPLATE_CLONE
  resource  String?
  ipAddress String?
  details   String?  // JSON string
  createdAt DateTime @default(now())

  @@index([action])
  @@index([createdAt])
}
```

---

## 7. REST API Endpoints Specification

### 7.1 System Access & Future Auth
- `GET /api/system/status` - ตรวจสอบสถานะระบบ และ Session ปัจจุบัน
- `POST /api/auth/login` - (Post-MVP Phase) เข้าสู่ระบบ รับ JWT Token
- `GET /api/auth/me` - (Post-MVP Phase) ดึงข้อมูลผู้ใช้ปัจจุบันและสิทธิ์

### 7.2 Target Groups & Targets
- `GET /api/target-groups` - ดูรายการกลุ่มเป้าหมายทั้งหมดพร้อมจำนวนสมาชิก
- `POST /api/target-groups` - สร้างกลุ่มเป้าหมาย
- `POST /api/target-groups/:id/import` - นำเข้าพนักงานผ่าน CSV/Excel
- `GET /api/target-groups/:id/targets` - ดูรายชื่อในกลุ่ม (รองรับ Pagination & Search)

### 7.3 Templates (Email & Landing Page)
- `GET /api/templates/emails` - ดูรายการ Email Templates ทั้งหมด (Presets + Custom)
- `POST /api/templates/emails` - สร้าง Email Template ใหม่
- `PUT /api/templates/emails/:id` - แก้ไข Email Template (เฉพาะที่ไม่ใช่ Preset)
- `POST /api/templates/emails/:id/clone` - โคลนเทมเพลตต้นแบบเพื่อนำไปสร้างฉบับปรับแต่งใหม่
- `POST /api/templates/emails/test-send` - ทดสอบส่งอีเมลตัวอย่างเข้า Mailbox ของ Admin
- `GET /api/templates/landing-pages` - ดูรายการ Landing Page Templates
- `POST /api/templates/landing-pages` - สร้าง Landing Page ใหม่
- `PUT /api/templates/landing-pages/:id` - แก้ไข Landing Page
- `POST /api/templates/landing-pages/:id/clone` - โคลนหน้า Landing Page เพื่อนำไปปรับแต่งต่อ

### 7.4 SMTP Profiles
- `GET /api/smtp-profiles` - ดูรายการโปรไฟล์ SMTP ทั้งหมด
- `POST /api/smtp-profiles` - เพิ่มโปรไฟล์ SMTP
- `PUT /api/smtp-profiles/:id` - แก้ไขโปรไฟล์ SMTP
- `POST /api/smtp-profiles/:id/test` - ทดสอบการเชื่อมต่อ SMTP Handshake

### 7.5 Campaigns & Execution
- `GET /api/campaigns` - ดึงรายการแคมเปญทั้งหมด พร้อมสถานะและสถิติสรุป
- `POST /api/campaigns` - สร้างแคมเปญใหม่
- `GET /api/campaigns/:id` - ดึงข้อมูลรายละเอียดแคมเปญและ Telemetry
- `POST /api/campaigns/:id/launch` - สั่งเริ่มรันแคมเปญทันที
- `POST /api/campaigns/:id/kill` - Emergency Kill Switch ยกเลิกการส่งและปิดกั้น Landing Page ทันที
- `GET /api/campaigns/:id/export` - ดาวน์โหลดรายงานผลลัพธ์แบบ Streaming (CSV / Excel) ป้องกัน Memory Crash

### 7.6 Public Tracking & Landing Engine (No Auth Required)
- `GET /track/open/:token` - คืนรูปภาพ 1x1 Transparent GIF ทันที และส่ง Event เข้า In-Memory Buffer
- `GET /l/:token` - เรนเดอร์หน้า Landing Page (ฝัง `X-Robots-Tag: noindex`) และตรวจจับ Bot
- `POST /l/:token/submit` - รับการ Submit ฟอร์ม, Drop รหัสผ่านทิ้งทันที, บันทึก Compromised Event และส่ง URL สำหรับ Redirect/Awareness กลับไป
- `GET /report/:token` - รับการรายงาน Phishing, บันทึก Reported Event, Freeze สถานะ Target และแสดงหน้าชื่นชมพนักงาน

---

## 8. User Interface Specification (React Frontend)

### 8.1 UI Design System: "Warm Earthtone & Human-Friendly"
> [!NOTE]
> **Design Philosophy & Color Tokens:**
> ปฏิเสธสี Gradient สีม่วง / ม่วงน้ำเงิน หรือสไตล์ Cyberpunk 100% 
> ใช้โทนสี **Earthtone สบายตา อบอุ่น นิ่ง และเป็นมิตรกับผู้ใช้งาน (Human-Friendly Enterprise UI)**:
> - **Canvas / Background (`bg-warm-sand`):** `#FAF8F5` (Warm Alabaster / Sand) สบายตา ไม่จ้า
> - **Surface / Cards (`bg-white`):** `#FFFFFF` พร้อมเส้นขอบ `#E7E5E0` และเงาละมุน `shadow-[0_2px_8px_rgba(0,0,0,0.04)]`
> - **Primary Accent (`bg-forest`):** `#2D5A43` (Deep Forest Sage) สำหรับปุ่มหลัก ดูมั่นคง น่าเชื่อถือ
> - **Primary Hover:** `#234735`
> - **Accent / Highlight (`text-amber`):** `#D97736` (Warm Terracotta / Amber) สำหรับจุดที่ต้องการเน้น
> - **Typography:** Deep Slate Charcoal (`#24292F`) และ Muted Foreground (`#6B7280`) อ่านง่าย รองรับฟอนต์ไทย `IBM Plex Sans Thai` / `Inter`

### 8.2 Simulation Event Badge Tokens
- **Sent:** Neutral Warm Stone (`bg-stone-100 text-stone-700 border-stone-200`)
- **Opened:** Muted Ochre (`bg-amber-50 text-amber-800 border-amber-200`)
- **Clicked:** Terracotta Orange (`bg-orange-50 text-orange-800 border-orange-200`)
- **Submitted (Compromised):** Brick Rose/Red (`bg-red-50 text-red-800 border-red-200`)
- **Reported (Success Defense):** Forest Sage Green (`bg-emerald-50 text-emerald-800 border-emerald-200`)

### 8.3 Template Customizer & Safe Sandbox Experience
- **Preset Protection:** การ์ดเทมเพลตที่เป็น Preset ต้นแบบจะไม่สามารถแก้ไขทับได้ มีเฉพาะปุ่ม `Preview` และ `Clone & Customize`
- **Two-Column Split Layout:**
  - **ฝั่งซ้าย (Configuration Panel - 40%):**
    - Identity: ชื่อเทมเพลต, Subject, Sender Name
    - **Variable Chips:** แถบชิป `{{name}}`, `{{email}}`, `{{phishing_url}}` คลิก 1 ครั้งเพื่อแทรกตัวแปรลงในข้อความทันที
    - Form/HTML Editor: สลับระหว่างฟอร์มตั้งค่าแบบง่าย กับ CodeMirror Editor
  - **ฝั่งขวา (Live Sandboxed Preview - 60%):**
    - **Persona Switcher:** Dropdown จำลองข้อมูล เช่น *"สมชาย ใจดี (IT)"* ให้เห็นตัวแปรถูกแทนที่เป็นชื่อจริงทันที
    - **Device Toggle:** สลับพรีวิว Desktop (1024px) และ Mobile (375px)
    - **Sandboxed Iframe:** ป้องกัน XSS ต่อ Admin Portal อย่างเด็ดขาด

### 8.4 Analytics Dashboard: Dual-Metric Visualization
1. **Compromise Funnel (อัตราการตกเป็นเหยื่อ):**
   `Sent (100%)` ➔ `Opened (% of Sent)` ➔ `Clicked (% of Opened)` ➔ `Compromised (% of Clicked)`
2. **Resilience & Defense Metrics (อัตราการป้องกันและความตระหนักรู้):**
   - **Report Rate (%):** พนักงานที่สังเกตเห็นและกดแจ้งเตือน
   - **Mean Time to Report (MTTR):** เวลาเฉลี่ยตั้งแต่ได้รับอีเมลจนถึงเวลากดแจ้งเตือน
3. **Department Risk Breakdown:**
   - แผนภูมิแท่งแนวนอน (Horizontal Bar Chart) แสดง Compromised Rate แยกตามแผนก เรียงลำดับจากเสี่ยงมากที่สุดไปน้อยที่สุด เพื่อให้เห็นเป้าหมายการจัดอบรมได้ทันที
4. **Interactive Target Telemetry Table:**
   - ค้นหาและกรองตามแผนก หรือสถานะ พร้อมปุ่ม Export CSV/Excel

---

## 9. Phased Implementation Roadmap

```
[Phase 1: Foundation & High-Performance Core]
  ├── Setup monorepo: client (React Vite + Tailwind Earthtone), server (Express TypeScript)
  ├── Setup Prisma ORM + SQLite (Configured with WAL mode & busy_timeout=5000)
  ├── Express Top-level Zero-Password Sanitizer & Master Admin Key Protection
  └── Base Layout & Earthtone Navigation Component System

[Phase 2: Templates & Targets]
  ├── Dynamic Target Management & CSV/Excel Parser (with Client Validation)
  ├── Email Template Manager (5 Built-in Presets, Variable Chips & 1-Click Clone)
  ├── Landing Page Customizer (Safe Sandboxed Iframe, Form Builder & 1-Click Clone)
  └── SMTP Profile Manager (with Connection Pooling & Handshake Test)

[Phase 3: Campaign & High-Accuracy Tracking Engine]
  ├── 4-Step Campaign Wizard & DB-backed Queue State Machine
  ├── Emergency Kill Switch System
  ├── In-Memory Buffer for High-Concurrency Event Ingestion
  ├── Anti-Scanner Defense (Bot filtering, robots.txt, X-Robots-Tag)
  └── Zero-password Capture & Awareness Page Response

[Phase 4: Analytics Dashboard & Reports]
  ├── Dual-Metric Real-time Dashboard (Compromise Funnel + Resilience Metrics)
  ├── Department-level Vulnerability Insights (Recharts)
  └── Memory-safe Streaming CSV/Excel Export Engine

[Phase 5: Automated Testing & Verification]
  ├── Setup Vitest / Supertest test runner
  ├── Unit tests for Zero-Password Sanitizer, Token Generator & Bot Filter
  ├── Integration tests for Tracking Flow, Template Cloning & Dispatch Queue
  └── Test coverage verification

[Phase 6 (Post-MVP): Hardening & Enterprise Scale]
  ├── Full JWT Authentication & Role-Based Access Control (RBAC)
  ├── Multi-user management & Audit Logs UI
  ├── PostgreSQL Migration profile (for >1,000 targets)
  └── Docker Compose production containerization
```

---

## 10. Automated Testing Strategy & Unit Test Cases

เพื่อให้มั่นใจในเสถียรภาพ ความปลอดภัย และความถูกต้องของข้อมูลตามมาตรฐาน มีการกำหนดชุดทดสอบแบบอัตโนมัติ (Automated Unit & Integration Tests) โดยใช้ **Vitest + Supertest** โดยต้องมีไฟล์ทดสอบครอบคลุมโมดูลสำคัญดังนี้:

### 10.1 Backend Test Suites (`server/src/__tests__/`)

| ไฟล์ Test Case | วัตถุประสงค์การทดสอบ | เกณฑ์การผ่าน (Expected Assertion) |
|---|---|---|
| **`sanitizer.test.ts`** | ทดสอบ Zero-Password Middleware | - ฟิลด์ `password`, `pin`, `otp` ใน `req.body` ต้องถูกลบทิ้ง 100%<br>- ต้องไม่พบคีย์ดังกล่าวใน Log หรือ Memory<br>- ส่ง Payload ซับซ้อน (Nested JSON) ต้องถูก Strip ทุกระดับ |
| **`token.test.ts`** | ทดสอบการสร้าง Tracking Token | - สร้าง Token ความยาว 21 ตัวอักษร เป็น URL-safe NanoId<br>- ทดสอบสร้าง 100,000 ครั้ง ต้องไม่มี Token ชนกัน (Zero Collision)<br>- ตรวจสอบ Regex ไม่มีอักขระพิเศษที่ต้อง Escape |
| **`botFilter.test.ts`** | ทดสอบการคัดกรอง Bot / Mail Gateway | - User-Agent ของ `Microsoft Office`, `Proofpoint`, `HeadlessChrome` ต้องถูกระบุเป็น `isBot = true`<br>- HTTP `HEAD` Request ต้องไม่นับสถิติการ Click<br>- User-Agent เบราว์เซอร์ปกติ (Chrome, Safari, Edge) ต้องผ่านเป็น `isBot = false` |
| **`templateEngine.test.ts`** | ทดสอบ Handlebars Engine & XSS Escaping | - ตัวแปร `{{name}}`, `{{email}}`, `{{phishing_url}}` ถูกแทนที่ถูกต้อง<br>- ข้อมูลที่มีแท็ก `<script>` ในชื่อพนักงานต้องถูก Auto-escape ป้องกัน Stored XSS<br>- ฟังก์ชัน Clone Preset ต้องได้ Object ใหม่ที่มี `isPreset = false` |
| **`tracking.test.ts`** | ทดสอบ State Machine & State Freezing | - ยิง `GET /track/open/:token` อัปเดต `isOpened = true`<br>- ยิง `GET /l/:token` อัปเดต `isClicked = true`<br>- ยิง `POST /l/:token/submit` อัปเดต `isSubmitted = true`<br>- เมื่อยิง `GET /report/:token` สถานะต้องเปลี่ยนเป็น `isReported = true` และ **Freeze สถานะ** (การ Click ซ้ำหลังจากนั้นต้องไม่เปลี่ยนผลเป็น Compromised)<br>- IP ใน SOC Whitelist ต้องไม่ถูกบันทึกเป็น Compromised |
| **`queue.test.ts`** | ทดสอบ Dispatcher & Retry Logic | - อัปเดตสถานะเป้าหมายเป็น `QUEUED` -> `SENDING` -> `SENT`<br>- จำลอง SMTP Error 4xx ต้องเข้าคิว Retry ตาม Exponential Backoff<br>- จำลอง SMTP Error 5xx ต้องบันทึกสถานะ `FAILED` ทันทีและไม่ Retry |

### 10.2 Frontend Test Suites (`client/src/__tests__/`)

| ไฟล์ Test Case | วัตถุประสงค์การทดสอบ | เกณฑ์การผ่าน (Expected Assertion) |
|---|---|---|
| **`templateClone.test.ts`** | ทดสอบ Client-side Clone & Forking Flow | - Preset Card ไม่มีปุ่ม Edit โดยตรง<br>- เมื่อคลิกปุ่ม Clone ต้องสร้างฟอร์มใหม่พร้อมเติมชื่อต่อท้าย `(Customized)`<br>- การคลิก Variable Chip (`{{name}}`) ต้องแทรกข้อความลงในตำแหน่งเคอร์เซอร์ได้อย่างแม่นยำ |
| **`metricsCalculator.test.ts`** | ทดสอบการคำนวณ KPI Dashboard | - คำนวณ Compromise Rate (%) ถูกต้องตามสูตร: `(Submitted / Sent) * 100`<br>- คำนวณ Resilience Report Rate (%) ถูกต้อง: `(Reported / Sent) * 100`<br>- คำนวณ Mean Time to Report (MTTR) ในหน่วยนาที/ชั่วโมงได้อย่างถูกต้อง |
| **`csvValidator.test.ts`** | ทดสอบ Client-side CSV Parser | - ตรวจสอบ Header มาตรฐาน (`Email`, `Name`, `Department`)<br>- ตรวจจับและแจ้งเตือนแถวที่มี Email ผิดรูปแบบ (Invalid Email Syntax) ก่อนส่งขึ้นเซิร์ฟเวอร์ |

---

### 10.3 Test Execution Commands

```bash
# รัน Unit Tests ทั้งหมดในระบบ
npm test

# รัน Backend Tests พร้อมรายงาน Coverage
npm run test:server -- --coverage

# รัน Frontend Component & Logic Tests
npm run test:client
```

---

## 11. Docker & Production Deployment Specification

เพื่อให้สามารถนำระบบขึ้นสู่ Production ได้อย่างสะดวกรวดเร็ว ไร้ปัญหา Environment Dependency และพร้อมใช้งานบน Server/VPS หรือ On-Premise ภายในองค์กร ระบบจะถูกออกแบบให้ **Deploy ผ่าน Docker Compose แบบ One-Command Deployment (`docker compose up -d`)**

### 11.1 Container Architecture & Strategy
- **Unified Production Container (แนะนำสำหรับ MVP - เบาและดูแลง่ายที่สุด):**
  - **Stage 1 (Client Build):** ใช้ Node Alpine ทำการ Build React Frontend ด้วยคำสั่ง `npm run build` ได้ผลลัพธ์เป็น Static Assets ในโฟลเดอร์ `dist/`
  - **Stage 2 (Server & Runtime):** Node Alpine รัน Express API Server และทำหน้าที่ Serve Static Client จากโฟลเดอร์ `dist/` ไปพร้อมกันที่ Port `3000`
  - ทำให้ได้ Image ขนาดเล็กเพียงคอนเทนเนอร์เดียว ดูแลง่าย และไม่ต้องคอนฟิก Nginx ซับซ้อนในเฟสแรก
- **Data Persistence:**
  - ผูก Docker Volume: `./data:/app/data` เพื่อจัดเก็บไฟล์ฐานข้อมูล SQLite (`phishcentral.db`) ป้องกันข้อมูลสูญหายเมื่อ Re-create Container

### 11.2 Specification ของไฟล์ `Dockerfile` (Multi-Stage Build)

```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/phishcentral.db"

# Copy server build & dependencies
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci --only=production && npx prisma generate
COPY --from=server-builder /app/server/dist ./dist

# Copy client static assets into server public
COPY --from=client-builder /app/client/dist ./public

# Setup persistent volume directory
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
```

---

### 11.3 Specification ของไฟล์ `docker-compose.yml`

```yaml
version: '3.8'

services:
  phishcentral:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: phishcentral-app
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=file:/app/data/phishcentral.db
      - ADMIN_API_KEY=${ADMIN_API_KEY:-admin-secret-key-change-me}
      - BASE_URL=${BASE_URL:-http://localhost:3000}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/system/status"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  # (Optional Profile) สำหรับขยายสเกลเป็น PostgreSQL ในองค์กรขนาดใหญ่
  postgres:
    image: postgres:16-alpine
    container_name: phishcentral-db
    profiles: ["postgres"]
    restart: unless-stopped
    environment:
      POSTGRES_USER: phishuser
      POSTGRES_PASSWORD: phishpassword
      POSTGRES_DB: phishcentral
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

### 11.4 Deployment Commands
```bash
# 1. ตั้งค่า Environment ตัวแปรใน .env
cp .env.example .env

# 2. เริ่มต้นระบบด้วย Docker Compose (รันแบบ Background)
docker compose up -d --build

# 3. ดู Log การทำงานของระบบ
docker compose logs -f phishcentral

# 4. หยุดการทำงานของระบบ
docker compose down
```
