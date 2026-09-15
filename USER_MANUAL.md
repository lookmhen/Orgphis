# คู่มือการใช้งานระบบ PhishCentral Enterprise (User Manual)
**Version:** 2.2.0  
**ระบบ:** Centralized Phishing Simulation & Security Awareness Platform

---

## 📌 สารบัญ (Table of Contents)
1. [ภาพรวมของระบบและการเตรียมความพร้อม](#1-ภาพรวมของระบบและการเตรียมความพร้อม)
2. [วิธีการเริ่มต้นรันระบบ (Getting Started)](#2-วิธีการเริ่มต้นรันระบบ-getting-started)
3. [ขั้นตอนการใช้งานแบบ Step-by-Step](#3-ขั้นตอนการใช้งานแบบ-step-by-step)
   - [Step 1: การตั้งค่า Mail Server (SMTP Profiles)](#step-1-การตั้งค่า-mail-server-smtp-profiles)
   - [Step 2: การจัดการกลุ่มและนำเข้ารายชื่อเป้าหมาย (Targets & Auto-Group CSV)](#step-2-การจัดการกลุ่มและนำเข้ารายชื่อเป้าหมาย-targets--auto-group-csv)
   - [Step 3: การเลือก ปรับแต่งเทมเพลต และไฟล์แนบจำลอง (Template Library, Attachments & 1-Click Clone)](#step-3-การเลือก-ปรับแต่งเทมเพลต-และไฟล์แนบจำลอง-template-library-attachments--1-click-clone)
   - [Step 4: การสร้างและสั่งเริ่มแคมเปญ พร้อมระบบสุ่มกระจายเวลาส่ง (Campaigns & Smear Scheduling)](#step-4-การสร้างและสั่งเริ่มแคมเปญ-พร้อมระบบสุ่มกระจายเวลาส่ง-campaigns--smear-scheduling)
   - [Step 5: การติดตามผลและออกรายงาน (Analytics Dashboard & Export)](#step-5-การติดตามผลและออกรายงาน-analytics-dashboard--export)
4. [ระบบความปลอดภัยและกลไกป้องกัน (Security & Compliance)](#4-ระบบความปลอดภัยและกลไกป้องกัน-security--compliance)
5. [การทดสอบความถูกต้องของระบบ (Automated Tests)](#5-การทดสอบความถูกต้องของระบบ-automated-tests)
6. [การ Deploy ขึ้นสภาพแวดล้อมจริง (Production Deployment)](#6-การ-deploy-ขึ้นสภาพแวดล้อมจริง-production-deployment)
7. [คู่มือการตั้งค่าฝั่ง Microsoft 365 Admin (Whitelist, Advanced Delivery & Send As/Alias)](#7-คู่มือการตั้งค่าฝั่ง-microsoft-365-admin-whitelist-advanced-delivery--send-asalias)

---

## 1. ภาพรวมของระบบและการเตรียมความพร้อม

PhishCentral คือแพลตฟอร์มศูนย์กลางสำหรับจัดทำ **Phishing Simulation & Security Awareness Training** ภายในองค์กร ช่วยให้ทีม IT และ Cyber Security สามารถจำลองสถานการณ์ความเสี่ยง (เช่น การแจ้งเปลี่ยนรหัสผ่านฉุกเฉิน, สลิปเงินเดือน, แจ้งเตือนสิทธิ์ M365 หรือเอกสารแนบสำคัญ) เพื่อทดสอบ ประเมินความเสี่ยง และเสริมสร้างภูมิคุ้มกันทางไซเบอร์ให้กับบุคลากรในองค์กรได้อย่างเป็นระบบ

### จุดเด่นเชิงสถาปัตยกรรม:
- **Frontend UI:** React (Vite) + Tailwind CSS ออกแบบในธีม **Warm Earthtone** สบายตา ใช้งานง่าย พร้อมโครงสร้างหน้าต่าง Responsive รองรับทุกอุปกรณ์
- **Backend API:** Node.js Express (TypeScript) โครงสร้างคลีน ปลอดภัย รองรับการขยายตัว
- **Database:** SQLite (เปิดใช้งาน WAL Mode เพื่อความรวดเร็วและรองรับ Spike Traffic ได้เสถียร)
- **Zero-Password Storage:** ดักกรองข้อมูลรหัสผ่านจริงทิ้งทันทีก่อนเข้าสู่ระบบ ปลอดภัยสอดคล้องตามมาตรฐาน PDPA และ ISO 27001 100%

---

## 2. วิธีการเริ่มต้นรันระบบ (Getting Started)

คุณสามารถเลือกรันระบบได้ 3 รูปแบบตามความเหมาะสม:

### รูปแบบที่ 1: รัน Development Mode (สำหรับการพัฒนาและแก้ไขโค้ด)
เปิด 2 หน้าต่าง Terminal:

**Terminal 1: รัน Backend Server (พอร์ต 3000)**
```bash
npm run dev:server
```

**Terminal 2: รัน Frontend Client (พอร์ต 5173)**
```bash
npm run dev:client
```
> เข้าใช้งานผ่านเว็บเบราว์เซอร์ที่: **`http://localhost:5173`**

---

### รูปแบบที่ 2: รัน Production Mode ผ่าน Node.js
```bash
# 1. Build โค้ดทั้งฝั่ง Client และ Server
npm run build

# 2. เริ่มต้นรัน Server (พอร์ต 3000 จะให้บริการทั้ง API และ Frontend ทันที)
npm start
```
> เข้าใช้งานผ่านเว็บเบราว์เซอร์ที่: **`http://localhost:3000`**

---

### รูปแบบที่ 3: รันด้วย Docker Compose (แนะนำสำหรับการใช้งานจริง ⭐)
```bash
docker compose up -d --build
```
> ระบบจะเริ่มต้น Container พร้อมผูก Volume โฟลเดอร์ `./data:/app/data` ให้อัตโนมัติ ข้อมูลจะไม่สูญหายเมื่อรีสตาร์ต

---

## 3. ขั้นตอนการใช้งานแบบ Step-by-Step

เมื่อเข้าสู่หน้า Admin Portal ให้ดำเนินการตามลำดับขั้นตอนดังนี้:

```
[1. ตั้งค่า SMTP] ➔ [2. นำเข้าพนักงาน] ➔ [3. จัดการเทมเพลต] ➔ [4. ยิงแคมเปญ] ➔ [5. ดูสถิติ/รายงาน]
```

---

### Step 1: การตั้งค่า Mail Server (SMTP Profiles)
เมนู: **`การส่งเมล (SMTP Profiles)`**

1. คลิกปุ่ม **"+ เพิ่มโปรไฟล์ SMTP"**
2. **เลือก Quick Presets** ระบบจะเติมค่ามาตรฐานล่าสุดให้ทันที:
   - **Microsoft 365 / Outlook:** `smtp.office365.com` (Port 587, STARTTLS)
   - **Google Workspace / Gmail:** `smtp.gmail.com` (Port 587 หรือ 465)
   - **Google Workspace Relay:** `smtp-relay.gmail.com` (Port 587)
3. ปรับแต่งค่าตามต้องการ:
   - **From Name & From Email:** เช่น `IT Security Team <security-alert@company.com>`
   - **Username & Password:** บัญชีอีเมล และ App Password ของระบบ
   - **Rate Limit & Delay:** กำหนดความเร็วในการส่ง (ค่าแนะนำ: 5 ฉบับ / เว้นช่วง 2-3 วินาที) เพื่อป้องกันไม่ให้ถูกเซิร์ฟเวอร์ปลายทางมองเป็น Spam
4. คลิกปุ่ม **"ทดสอบการเชื่อมต่อ (Test Handshake)"** บนการ์ด เพื่อยืนยันว่าการเชื่อมต่อ TLS ถูกต้องและพร้อมส่งจริง

---

### Step 2: การจัดการกลุ่มและนำเข้ารายชื่อเป้าหมาย (Targets & Auto-Group CSV)
เมนู: **`กลุ่มเป้าหมาย (Targets)`**

ระบบรองรับการจัดการเป้าหมาย 2 รูปแบบที่สะดวกสบาย:

#### 1. การนำเข้า CSV แบบสร้างกลุ่มอัตโนมัติ (Auto-Group CSV Import) ⭐:
- คลิกปุ่ม **"นำเข้า CSV"**
- ใส่ข้อมูลรายชื่อพนักงานตามรูปแบบ CSV:
  ```csv
  email,name,department
  somchai.j@company.com,สมชาย ใจดี,Engineering
  kanya.s@company.com,กัญญา ศรีสุข,Human Resources
  wipa.t@company.com,วิภา ทองคำ,Finance
  ```
- **ระบบจะอ่านชื่อแผนก (`department`) และสร้างกลุ่มเป้าหมายแยกแต่ละแผนกให้อัตโนมัติทันที** โดยที่คุณไม่ต้องเสียเวลาไปสร้างกลุ่มเองล่วงหน้า

#### 2. การแก้ไขข้อมูลพนักงาน (Target Editor):
- ในตารางรายชื่อพนักงาน สามารถคลิกไอคอนดินสอ เพื่อแก้ไขชื่อ นามสกุล แผนก หรือที่อยู่อีเมลได้ตลอดเวลา

---

### Step 3: การเลือก ปรับแต่งเทมเพลต และไฟล์แนบจำลอง (Template Library, Attachments & 1-Click Clone)
เมนู: **`คลังเทมเพลต (Templates)`**

ระบบมาพร้อมชุดเทมเพลตยอดนิยมที่ออกแบบภาษาไทยไว้อย่างเป็นธรรมชาติ แบ่งเป็น 2 หมวดหมู่:

#### 1. หมวด Email Templates:
- **IT Urgent Password Expiry:** แจ้งเตือนรหัสผ่านหมดอายุเร่งด่วนใน 24 ชม.
- **HR Annual Bonus & Payroll Review:** ตรวจสอบผลประเมินสิทธิประโยชน์และโบนัสประจำปี
- **Microsoft 365 Unusual Sign-in Alert:** แจ้งเตือนการเข้าสู่ระบบต้องสงสัยจากต่างประเทศ
- **Corporate AI Innovation Hub:** สิทธิการเปิดใช้งาน Copilot AI สำหรับบุคลากร

#### 📎 ฟังก์ชันจำลองไฟล์แนบ (Simulated Attachments):
- ในหน้าต่างแก้ไขเทมเพลตอีเมล สามารถเปิดสวิตช์ **"จำลองการแนบไฟล์ (Simulate Attachment)"**
- เลือก **Quick Presets** สำหรับสถานการณ์ทั่วไป เช่น *สลิปเงินเดือน (PDF)*, *โบนัสประจำปี (Word)* หรือ *ใบกำกับภาษี (Excel)*
- ผู้รับจะเห็นเป็นไฟล์แนบปกติในกล่องจดหมาย พร้อมชื่อไฟล์และขนาดที่สมจริง โดยระบบจะสร้างไฟล์จำลองขึ้นมาเอง ปลอดภัย ไม่ต้องอัปโหลดไฟล์จริงขึ้นเซิร์ฟเวอร์

#### ✉️ ปุ่มทดสอบส่งอีเมลจริง (Send Test Mail):
- บนการ์ดเทมเพลตอีเมล สามารถคลิกปุ่ม **"ทดสอบส่ง"** เพื่อส่งอีเมลตัวอย่างไปยังกล่องจดหมายของคุณ เพื่อตรวจสอบความสวยงามของฟอนต์และลิงก์ก่อนใช้งานจริง

#### 2. หมวด Landing Pages:
- **Company SSO Password Reset:** หน้าเว็บรีเซ็ตรหัสผ่านสไตล์โมเดิร์นคลีนตา
- **Microsoft 365 Login Clone:** หน้าล็อกอินจำลองสไตล์ Microsoft 365
- **Security Awareness Landing Page:** หน้าให้ความรู้ทันทีเมื่อพนักงานเผลอกรอกข้อมูล ชี้แจงจุดสังเกต (Red Flags) เพื่อสร้างภูมิคุ้มกัน

---

### Step 4: การสร้างและสั่งเริ่มแคมเปญ พร้อมระบบสุ่มกระจายเวลาส่ง (Campaigns & Smear Scheduling)
เมนู: **`แคมเปญ (Campaigns)`**

1. คลิกปุ่ม **"+ สร้างแคมเปญใหม่"**
2. ระบุชื่อแคมเปญ, เลือกกลุ่มเป้าหมาย, เลือกเทมเพลตอีเมล, Landing Page และโปรไฟล์ SMTP
3. **⏱️ ตั้งเวลาส่งแบบสุ่มกระจายคิว (Randomized Smear Scheduling):**
   - เปิดสวิตช์ **"สุ่มกระจายเวลาส่ง (Randomized Scheduling)"**
   - เลือกระบุช่วงวันที่ต้องการทดสอบ (ระบบจะคัดกรองเฉพาะวันทำการ จันทร์-ศุกร์ โดยอัตโนมัติ)
   - กำหนดช่วงเวลางานขององค์กร เช่น `08:30 - 17:00 น.`
   - ระบบจะคำนวณคิวส่งแบบสุ่ม (Jitter) กระจายให้พนักงานได้รับอีเมลในเวลาที่ต่างกัน ไม่ส่งเป็นก้อนใหญ่พร้อมกัน ช่วยหลบเลี่ยงการตรวจจับของ Email Gateway
4. คลิก **"สร้างแคมเปญ"** แล้วคลิก **"สั่งเริ่มส่ง (Launch)"** เมื่อพร้อม

#### 🛑 ปุ่มหยุดฉุกเฉิน (Emergency Kill Switch):
หากเกิดเหตุขัดข้องระหว่างที่แคมเปญกำลังทำงาน คุณสามารถกดปุ่ม **"หยุดฉุกเฉิน (Kill)"** ได้ทันที ระบบจะระงับคิวส่งที่เหลือทั้งหมด และตัดการทำงานของ Landing Page ทันที

---

### Step 5: การติดตามผลและออกรายงาน (Analytics Dashboard & Export)

#### 1. หน้าแดชบอร์ดภาพรวม (`Dashboard`):
- **Phish-Prone Rate (%):** อัตราพนักงานที่ตกเป็นเหยื่อจริง (เผลอกรอกข้อมูล)
- **Resilience Report Rate (%):** อัตราพนักงานที่รู้ทันและกดรายงาน Phishing (ดัชนีชี้วัดความพร้อมขององค์กร)
- **Compromise Funnel Chart:** วิเคราะห์พฤติกรรม 4 ขั้นตอน: `Sent` ➔ `Clicked` ➔ `Compromised` ➔ `Reported`
- **Resilience Grade:** ประเมินเกรดความมั่นคงปลอดภัยขององค์กร (ตั้งแต่ระดับ A+ ถึง F)
- **Repeat Offenders:** รายชื่อพนักงานที่ตกเป็นเหยื่อซ้ำ เพื่อให้ฝ่าย HR/IT จัดคอร์สฝึกอบรมเฉพาะบุคคล

#### 2. การดาวน์โหลดรายงานสรุปภาพรวมระดับองค์กร (Executive Summary CSV Export) ⭐:
- ที่มุมขวาบนของหน้า **Dashboard** คลิกปุ่ม **"ดาวน์โหลดสรุปภาพรวม (Export CSV)"** (หรือกดปุ่ม **"สรุปภาพรวม (Summary CSV)"** ในหน้า Campaigns)
- ระบบจะสร้างไฟล์รายงานสรุปภาพรวมระดับองค์กร (`phishcentral-summary-YYYY-MM-DD.csv`) แบบ Multi-Section ในไฟล์เดียว พร้อม UTF-8 BOM สำหรับเปิดใน Microsoft Excel ได้ภาษาไทยไม่เพี้ยน:
  - **ส่วนที่ 1 (Executive Summary):** คะแนนความพร้อมรับมือ (Resilience Score), เกรดองค์กร (Grade A-D), สถิติจำนวนแคมเปญ, จำนวนอีเมลที่ส่ง, อัตราคลิก (%), อัตราเผลอกรอกข้อมูล (%), อัตราแจ้งเตือน (%), และเวลาเฉลี่ยก่อนคลิกลิงก์
  - **ส่วนที่ 2 (Department Benchmarks):** ตารางเปรียบเทียบสถิติของทุกแผนก (Sent, Clicked, Compromised, Reported, อัตราเฉลี่ย)
  - **ส่วนที่ 3 (Repeat Offenders & High Risk):** รายชื่อพนักงานกลุ่มเสี่ยงสูงที่ตกเป็นเหยื่อซ้ำ (ชื่อ, อีเมล, แผนก, จำนวนครั้งที่เผลอกรอกข้อมูล, จำนวนครั้งที่คลิกลิงก์)

#### 3. การดาวน์โหลดรายงานผลเฉพาะแคมเปญ (Campaign Detail CSV Export):
- ในหน้ารายการแคมเปญ คลิกปุ่ม **"Export CSV"** ประจำแคมเปญนั้นๆ
- ระบบจะสร้างไฟล์รายงานผลลัพธ์รายบุคคล (`campaign-[id]-report.csv`) แบบ Real-time พร้อมระบุเวลา Sent, Clicked, Submitted, Reported รายคน

---

## 4. ระบบความปลอดภัยและกลไกป้องกัน (Security & Compliance)

| กลไกความปลอดภัย | รายละเอียดการทำงาน |
|---|---|
| **Zero-Password Storage** | Express Middleware ดักกรองและตัดฟิลด์ `password`, `pin`, `otp` ออกจากทุกคำขอในระดับโครงสร้าง ปลอดภัยตามมาตรฐาน PDPA และ ISO 27001 |
| **Anti-Scanner Defense** | กรอง User-Agent ของระบบสแกนอัตโนมัติ (เช่น Microsoft Safe Links, Proofpoint) เพื่อไม่ให้สถิติการคลิกผิดเพี้ยน |
| **Domain Blacklist Protection** | ฝัง Header `X-Robots-Tag: noindex, nofollow, noarchive` ป้องกันไม่ให้ Search Engine นำหน้าทดสอบไปจัดทำดัชนี |
| **SOC Status Freezing** | เมื่อมีคนกดปุ่ม **"รายงาน Phishing"** ระบบจะหยุดการบันทึกสถานะ Compromised สำหรับรายการนั้นทันที เพื่อไม่ให้กระทบสถิติเมื่อทีม SOC เปิดตรวจสอบ |
| **Iframe Sandboxed Preview** | หน้าจอพรีวิวโค้ด HTML ผ่าน Sandbox Iframe ที่ปิดการเข้าถึง Session/Cookie เพื่อป้องกันช่องโหว่ XSS |

---

## 5. การทดสอบความถูกต้องของระบบ (Automated Tests)

ระบบมีชุดทดสอบแบบอัตโนมัติ (Automated Unit Tests) รันผ่าน Vitest ครอบคลุมทั้งความปลอดภัยและฟังก์ชันสำคัญ:

```bash
# รันการทดสอบทั้งหมดในระบบ
npm test
```

### ชุดทดสอบในระบบ (5 Test Suites - ผ่าน 100%):
1. `sanitizer.test.ts`: ยืนยันการตัดข้อมูลรหัสผ่านจริงออกจากระบบ 100%
2. `tokenAndBot.test.ts`: ยืนยันความปลอดภัยของ Tracking Token และการตรวจจับ Bot แม่นยำ
3. `templateEngine.test.ts`: ยืนยันการประมวลผลตัวแปร Dynamic Tags และความปลอดภัยของโค้ด HTML
4. `scheduler.test.ts`: ตรวจสอบการคำนวณวันทำการ การตัดวันหยุดสุดสัปดาห์ และการกระจายเวลางาน
5. `features.test.ts`: ตรวจสอบ API การนำเข้า Auto-Group, การแก้ไข Target และระบบไฟล์แนบจำลอง

---

## 6. การ Deploy ขึ้นสภาพแวดล้อมจริง (Production Deployment)

ระบบพร้อมรันบน Cloud Server หรือ On-Premise ภายในองค์กรผ่าน Docker Compose:

```bash
# 1. ตรวจสอบค่าในไฟล์ .env ที่โฟลเดอร์หลัก
PORT=3000
BASE_URL=http://<IP-หรือ-Domain-เซิร์ฟเวอร์>:3000
ADMIN_API_KEY=your-secure-admin-secret

# 2. เริ่มต้นรันระบบผ่าน Docker Compose
docker compose up -d --build

# 3. ตรวจสอบสถานะการทำงาน
docker compose ps
docker compose logs -f phishcentral
```
*ระบบจะพร้อมให้บริการที่พอร์ต `3000` ทันที*

---

## 7. คู่มือการตั้งค่าฝั่ง Microsoft 365 Admin (Whitelist, Advanced Delivery & Send As/Alias)

หากองค์กรใช้งาน **Microsoft 365 (Exchange Online)** กรุณาตั้งค่าตามคำแนะนำเพื่อให้การทดสอบราบรื่น ไม่ตกโฟลเดอร์ขยะ:

### 7.1 การเปิดสิทธิ์ Authenticated SMTP (M365 Admin Center)
1. เข้าสู่ **[Microsoft 365 Admin Center](https://admin.microsoft.com)**
2. ไปที่ **Users** > **Active users** เลือกบัญชีที่จะใช้ส่ง
3. ไปที่แท็บ **Mail** > คลิก **Manage email apps**
4. ติ๊กเลือก **Authenticated SMTP** แล้วกด **Save changes**
5. สร้าง **App Password** ที่ [My Account Security Info](https://mysignins.microsoft.com/security-info) เพื่อนำมาใช้งาน

---

### 7.2 การทำ Whitelist ผ่าน "Advanced Delivery" ใน Microsoft Defender (แนะนำสูงสุด ⭐)
1. เข้าสู่ **[Microsoft Defender Portal](https://security.microsoft.com)**
2. ไปที่ **Email & collaboration** > **Policies & rules** > **Threat policies** > **Advanced delivery**
3. เลือกแท็บ **Phishing simulation** แล้วกด **Edit**
4. ระบุข้อมูลการทดสอบ:
   - **Sending Domains:** โดเมนที่ใช้ส่ง
   - **Sending IPs:** IP สาธารณะของเซิร์ฟเวอร์ PhishCentral
   - **Simulation URLs to allow:** URL ของระบบฟิชชิ่ง เช่น `https://your-domain.com/l/*`
5. กด **Save** อีเมลจะส่งตรงเข้า Inbox 100% โดยที่ Safe Links จะไม่คลิกลิงก์ล่วงหน้าอัตโนมัติ

---

### 7.3 การส่งในนาม Email Alias หรือ Shared Mailbox (Send As)
- **วิธีที่ 1 (Shared Mailbox):** สร้าง Shared Mailbox เช่น `security-alert@company.com` จากนั้นมอบสิทธิ์ **Send as permissions** ให้กับบัญชีผู้ส่ง โดยไม่ต้องซื้อ License เพิ่มเติม
- **วิธีที่ 2 (Email Alias):** เพิ่ม Alias ให้กับบัญชีผู้ส่งใน M365 และเปิดใช้งาน **Turn on sending from aliases** ใน Exchange Admin Center
