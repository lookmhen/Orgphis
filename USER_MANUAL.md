# คู่มือการใช้งานระบบ PhishCentral (User Manual)
**Version:** 2.1.0  
**ระบบ:** Centralized Phishing Simulation & Security Awareness Platform

---

## 📌 สารบัญ (Table of Contents)
1. [ภาพรวมของระบบและการเตรียมความพร้อม](#1-ภาพรวมของระบบและการเตรียมความพร้อม)
2. [วิธีการเริ่มต้นรันระบบ (Getting Started)](#2-วิธีการเริ่มต้นรันระบบ-getting-started)
3. [ขั้นตอนการใช้งานแบบ Step-by-Step](#3-ขั้นตอนการใช้งานแบบ-step-by-step)
   - [Step 1: การตั้งค่า Mail Server (SMTP Profiles)](#step-1-การตั้งค่า-mail-server-smtp-profiles)
   - [Step 2: การจัดการกลุ่มและนำเข้ารายชื่อเป้าหมาย (Targets)](#step-2-การจัดการกลุ่มและนำเข้ารายชื่อเป้าหมาย-targets)
   - [Step 3: การเลือกและปรับแต่งเทมเพลต (Template Library & 1-Click Clone)](#step-3-การเลือกและปรับแต่งเทมเพลต-template-library--1-click-clone)
   - [Step 4: การสร้างและสั่งเริ่มแคมเปญ (Campaigns Management)](#step-4-การสร้างและสั่งเริ่มแคมเปญ-campaigns-management)
   - [Step 5: การติดตามผลและออกรายงาน (Analytics Dashboard & Export)](#step-5-การติดตามผลและออกรายงาน-analytics-dashboard--export)
4. [ระบบความปลอดภัยและกลไกป้องกัน (Security & Compliance)](#4-ระบบความปลอดภัยและกลไกป้องกัน-security--compliance)
5. [การทดสอบ Unit Tests](#5-การทดสอบ-unit-tests)
6. [การ Deploy ขึ้น Production ด้วย Docker Compose](#6-การ-deploy-ขึ้น-production-ด้วย-docker-compose)
7. [คู่มือการตั้งค่าฝั่ง Microsoft 365 Admin (Whitelist, Advanced Delivery & Send As/Alias)](#7-คู่มือการตั้งค่าฝั่ง-microsoft-365-admin-whitelist-advanced-delivery--send-asalias)

---

## 1. ภาพรวมของระบบและการเตรียมความพร้อม

PhishCentral คือแพลตฟอร์มศูนย์กลางสำหรับจัดทำ **Phishing Simulation & Awareness Training** ภายในองค์กร ช่วยให้ฝ่าย IT / Cyber Security สามารถส่งอีเมลจำลองสถานะต่างๆ (เช่น แจ้งเตือนเปลี่ยนรหัสผ่าน, สลิปเงินเดือน, หรือแจ้งเตือน M365) ไปยังพนักงาน เพื่อประเมินความเสี่ยงและสร้างภูมิคุ้มกันทางไซเบอร์

### สถาปัตยกรรมระบบ:
- **Frontend UI:** React (Vite) + Tailwind CSS ดีไซน์ **Warm Earthtone** (สบายตา เข้าถึงง่าย งด Gradient สีม่วง)
- **Backend API:** Node.js Express (TypeScript)
- **Database:** SQLite (เปิดระบบ WAL Mode ทำงานเร็ว รองรับ Spike Traffic)
- **Zero-Password Storage:** ไม่มีการจัดเก็บบันทึกรหัสผ่านจริงของพนักงานเด็ดขาดตามมาตรฐาน PDPA & ISO 27001

---

## 2. วิธีการเริ่มต้นรันระบบ (Getting Started)

คุณสามารถเลือกรันได้ 3 รูปแบบตามความสะดวก:

### รูปแบบที่ 1: รัน Development Mode (แนะนำสำหรับแก้ไขโค้ด)
เปิด 2 หน้าต่าง Terminal:

**Terminal 1: รัน Backend Server (พอร์ต 3000)**
```bash
npm run dev:server
```

**Terminal 2: รัน Frontend Client (พอร์ต 5173)**
```bash
npm run dev:client
```
> เปิดเว็บเบราว์เซอร์ที่: **`http://localhost:5173`**

---

### รูปแบบที่ 2: รัน Production Mode ผ่าน Node.js
```bash
# 1. สั่ง Build โค้ดทั้ง Client และ Server
npm run build

# 2. เริ่มต้นรัน Server (พอร์ต 3000 จะ Serve ทั้ง API และหน้าเว็บ React ทันที)
npm start
```
> เปิดเว็บเบราว์เซอร์ที่: **`http://localhost:3000`**

---

### รูปแบบที่ 3: รันด้วย Docker Compose (One-Command Deployment)
```bash
docker compose up -d --build
```
> ระบบจะสร้าง Container พร้อม Mount Volume โฟลเดอร์ `./data:/app/data` ให้อัตโนมัติ ข้อมูลจะไม่สูญหาย

---

## 3. ขั้นตอนการใช้งานแบบ Step-by-Step

เมื่อเปิดหน้า Admin Portal ขึ้นมา คุณจะพบเมนูด้านซ้าย ให้ทำตามขั้นตอน 5 สเต็ปดังนี้:

```
[1. ตั้งค่า SMTP] ➔ [2. นำเข้าพนักงาน] ➔ [3. เลือก/โคลนเทมเพลต] ➔ [4. ยิงแคมเปญ] ➔ [5. ดูสถิติ/โหลดรายงาน]
```

---

### Step 1: การตั้งค่า Mail Server (SMTP Profiles)
เมนู: **`การส่งเมล (SMTP Profiles)`**

1. คลิกปุ่ม **"+ เพิ่มโปรไฟล์ SMTP"**
2. **เลือก Quick Presets** ผู้ให้บริการที่ต้องการ ระบบจะ Auto-fill ค่ามาตรฐานล่าสุดให้ทันที:
   - **Microsoft 365 / Outlook:** `smtp.office365.com` (Port 587, STARTTLS)
   - **Google Workspace / Gmail:** `smtp.gmail.com` (Port 587 หรือ 465)
   - **Google Workspace Relay:** `smtp-relay.gmail.com` (Port 587)
3. ปรับแต่งค่าตามต้องการ (ทุกช่องสามารถ Custom เปลี่ยนแปลงได้ 100%):
   - **From Name & From Email:** เช่น `IT Security Support <security-alert@company.com>`
   - **Username & Password:** บัญชีอีเมล และ App Password ของระบบ
   - **Rate Limit & Delay:** กำหนดความเร็วในการส่ง (ค่าแนะนำ: 5 ฉบับ / เว้น 2-3 วินาที) เพื่อไม่ให้ Mail Server หรือ Firewall มองเป็น Spam
4. คลิกปุ่ม **"ทดสอบการเชื่อมต่อ (Test Handshake)"** บนการ์ด เพื่อให้ระบบทดสอบ Verify TLS Connection ทันที

---

### Step 2: การจัดการกลุ่มและนำเข้ารายชื่อเป้าหมาย (Targets)
เมนู: **`กลุ่มเป้าหมาย (Targets)`**

1. สร้างกลุ่มเป้าหมายที่ต้องการทดสอบ เช่น *"ฝ่ายการเงินและบัญชี"*, *"พนักงานเข้าใหม่ Q3"*
2. คลิกเลือกกลุ่มที่สร้างขึ้น จากนั้นคลิกปุ่ม **"นำเข้า CSV"**
3. วางข้อความรายชื่อพนักงานตามรูปแบบ:
   ```csv
   email,name,department
   somchai.j@company.com,สมชาย ใจดี,IT
   kanya.s@company.com,กัญญา ศรีสุข,HR
   wipa.t@company.com,วิภา ทองคำ,Finance
   ```
4. กด **"ยืนยันการนำเข้า"** ระบบจะตรวจสอบและเพิ่มรายชื่อเข้าสู่กลุ่มทันที

---

### Step 3: การเลือกและปรับแต่งเทมเพลต (Template Library & 1-Click Clone)
เมนู: **`คลังเทมเพลต (Templates)`**

ระบบมีเทมเพลตยอดนิยมติดตั้งมาให้พร้อมใช้งานทันที (Official Presets) แบ่งเป็น 2 แท็บ:

#### 1. แท็บ Email Templates:
- **IT Urgent Password Expiry:** แจ้งเตือนรหัสผ่านหมดอายุเร่งด่วนใน 24 ชม.
- **HR Annual Bonus & Payroll Review:** ตรวจสอบผลประเมินสิทธิประโยชน์และโบนัส
- **Microsoft 365 Unusual Sign-in Activity:** แจ้งเตือนการเข้าสู่ระบบต้องสงสัยจากต่างประเทศ

#### 2. แท็บ Landing Pages:
- **Company SSO Password Reset Portal:** หน้าเว็บรีเซ็ตรหัสผ่านสไตล์โมเดิร์นคลีนตา
- **Microsoft 365 Login Clone:** หน้าเข้าสู่ระบบสไตล์ Microsoft 365

#### 💡 วิธีการโคลนและปรับแต่ง (1-Click Clone):
- เทมเพลตที่เป็น `Official Preset` จะถูกล็อกไม่ให้แก้ทับ เพื่อเก็บไว้เป็นต้นแบบมาตรฐาน
- หากต้องการแก้ไข ให้คลิกปุ่ม **"Clone & Edit"**
- ระบบจะสร้างสำเนาใหม่เป็น `(Customized)` ขึ้นมาให้คุณปรับแต่งหัวเรื่อง โลโก้ และเนื้อหาได้อย่างอิสระ!
- คุณสามารถกดปุ่ม **"Preview"** เพื่อดูตัวอย่างในรูปแบบ **Sandboxed Iframe** ได้อย่างปลอดภัย 100%

---

### Step 4: การสร้างและสั่งเริ่มแคมเปญ (Campaigns Management)
เมนู: **`แคมเปญ (Campaigns)`**

1. คลิกปุ่ม **"+ สร้างแคมเปญใหม่"**
2. กำหนดรายละเอียด:
   - **ชื่อแคมเปญ:** เช่น *Q3 Phishing Assessment - Finance Team*
   - **กลุ่มเป้าหมาย:** เลือกกลุ่มที่ต้องการส่ง
   - **Email Template:** เลือกเนื้อหาอีเมลที่จะใช้หลอกล่อ
   - **Landing Page Template:** เลือกหน้าฟอร์มที่จะให้เป้าหมายกรอกข้อมูล
   - **SMTP Profile:** เลือกเซิร์ฟเวอร์ที่จะใช้ส่งอีเมล
3. คลิก **"สร้างแคมเปญ"** สถานะแคมเปญจะเริ่มต้นที่ `DRAFT`
4. เมื่อพร้อมส่ง ให้คลิกปุ่ม **"สั่งเริ่มส่ง (Launch)"** ระบบจะเริ่มส่งอีเมลจำลองออกไปตามคิวที่ตั้งไว้

#### 🛑 ปุ่มหยุดฉุกเฉิน (Emergency Kill Switch):
หากเกิดเหตุฉุกเฉินระหว่างที่แคมเปญกำลังรัน (`RUNNING`) คุณสามารถกดปุ่มสีแดง **"หยุดฉุกเฉิน (Kill)"** ได้ทันที ระบบจะระงับคิวส่งที่เหลือทั้งหมด และเปลี่ยนหน้า Landing Page ให้เป็นหน้าแจ้งเตือนปลอดภัยทันที

---

### Step 5: การติดตามผลและออกรายงาน (Analytics Dashboard & Export)

#### 1. หน้าสรุปสถิติภาพรวม (`Dashboard`):
- **Phish-Prone Rate (%):** อัตราการตกเป็นเหยื่อจริง (กรอกรหัสผ่าน)
- **Resilience Report Rate (%):** อัตราพนักงานที่รู้ทันและกดรายงาน Phishing (ตัวชี้วัดสำคัญของฝ่ายความปลอดภัย)
- **Compromise Funnel:** กราฟวิเคราะห์ Funnel: `Sent` ➔ `Opened` ➔ `Clicked` ➔ `Compromised`

#### 2. การดาวน์โหลดรายงานผลลัพธ์ (CSV Export):
- ในหน้ารายการแคมเปญ ให้คลิกปุ่ม **"Export CSV"**
- ระบบจะสร้างไฟล์รายงานผลลัพธ์ (`report.csv`) แบบ Real-time พร้อม UTF-8 BOM สำหรับเปิดใน Microsoft Excel ได้ภาษาไทยไม่เพี้ยน
- ในไฟล์จะระบุชัดเจน: ใครเปิดเมลเมื่อไหร่, ใครคลิกลิงก์, ใครเผลอกรอกข้อมูล, หรือใครกดแจ้งเตือน

---

## 4. ระบบความปลอดภัยและกลไกป้องกัน (Security & Compliance)

| กลไกความปลอดภัย | รายละเอียดการทำงาน |
|---|---|
| **Zero-Password Storage** | ระบบติดตั้ง Top-level Express Middleware คอยล้างฟิลด์ `password`, `pin`, `otp` ออกจากคำขอทันที ทำให้ไม่มีรหัสผ่านจริงหลุดรอดเข้าฐานข้อมูลหรือ Log ใดๆ (ปลอดภัยตามมาตรฐาน PDPA & ISO 27001) |
| **Anti-Scanner Defense** | กรอง User-Agent ของ Security Bot (เช่น Microsoft Safe Links, Proofpoint) และไม่นับคำขอแบบ HTTP HEAD เพื่อไม่ให้สถิติการคลิกพุ่งเพี้ยนจากระบบสแกนอัตโนมัติ |
| **Domain Blacklist Protection** | ฝัง Header `X-Robots-Tag: noindex, nofollow, noarchive` ในหน้า Landing Page ทั้งหมด ป้องกัน Google SafeBrowsing เข้ามาจัดทำดัชนีและแบนโดเมนทดสอบของบริษัท |
| **SOC Status Freezing** | หากพนักงานกดส่งต่อให้ IT แล้วพนักงานหรือฝ่าย IT กดปุ่ม **"รายงาน Phishing"** ระบบจะทำการ Freeze สถานะทันที การคลิกตรวจหลังจากนั้นจะไม่ถูกนับเป็น Compromised |
| **Iframe Sandboxed Preview** | หน้าจอ Admin พรีวิวโค้ด HTML ผ่าน Iframe ที่ตัด `allow-same-origin` ออก เพื่อป้องกันไม่ให้สคริปต์ในหน้าฟิชชิ่งแอบขโมย Cookie/Session ของผู้ดูแลระบบ (ป้องกัน XSS) |

---

## 5. การทดสอบ Unit Tests

ระบบมีชุดทดสอบแบบอัตโนมัติ (Automated Unit Tests) เพื่อตรวจเช็คความถูกต้องของโค้ดก่อนนำไปใช้งานจริง:

```bash
# รัน Unit Tests ทั้งหมด
npm test
```

ชุดทดสอบที่อยู่ในระบบ:
- `sanitizer.test.ts`: ยืนยันว่ารหัสผ่านถูกลบทิ้ง 100%
- `tokenAndBot.test.ts`: ยืนยันความสุ่มของ Token และการตรวจจับ Bot แม่นยำ
- `templateEngine.test.ts`: ยืนยันการแทนที่ตัวแปร Handlebars และการป้องกัน XSS

---

## 6. การ Deploy ขึ้น Production ด้วย Docker Compose

ระบบถูกตั้งค่าให้พร้อมรันบน Cloud Server, VPS (Ubuntu/Debian) หรือ On-Premise ภายในองค์กรได้ทันที:

```bash
# 1. ตรวจสอบไฟล์การตั้งค่า
# ไฟล์ .env ของ server หรือปรับค่าใน docker-compose.yml ตามต้องการ

# 2. สั่งรันระบบผ่าน Docker Compose
docker compose up -d --build

# 3. ตรวจสอบสถานะการทำงาน
docker compose ps

# 4. ดูบันทึกการทำงาน (Logs)
docker compose logs -f phishcentral
```

*เมื่อสั่งรันเรียบร้อยแล้ว แพลตฟอร์มจะพร้อมใช้งานที่พอร์ต `3000` ทันทีครับ*

---

## 7. คู่มือการตั้งค่าฝั่ง Microsoft 365 Admin (Whitelist, Advanced Delivery & Send As/Alias)

หากองค์กรของคุณใช้งาน **Microsoft 365 (Exchange Online)** และต้องการส่งอีเมลจำลอง Phishing ให้ได้ผลลัพธ์แม่นยำ ไม่ตก Junk และไม่ถูกระบบความปลอดภัยสแกนคลิกล่วงหน้า (Ghost Clicks) กรุณาปฏิบัติตามคำแนะนำต่อไปนี้:

### 7.1 การเปิดสิทธิ์ Authenticated SMTP (M365 Admin Center)
โดยค่าเริ่มต้น Microsoft 365 จะปิดโพรโทคอล SMTP ไว้ ผู้ดูแลระบบต้องเปิดสิทธิ์ให้กับกล่องจดหมายที่ใช้ส่ง:
1. เข้าสู่ **[Microsoft 365 Admin Center](https://admin.microsoft.com)**
2. ไปที่เมนู **Users** > **Active users** แล้วคลิกเลือกบัญชีผู้ใช้ที่จะใช้ส่ง
3. ไปที่แท็บ **Mail** > คลิก **Manage email apps**
4. ติ๊กถูกที่ตัวเลือก **Authenticated SMTP** แล้วกด **Save changes**
5. **การสร้าง App Password (กรณีเปิด MFA):**
   - เข้าไปที่หน้า [My Account Security Info](https://mysignins.microsoft.com/security-info)
   - คลิก **+ Add sign-in method** > เลือก **App password**
   - ตั้งชื่อ เช่น `PhishCentral-Mailer` แล้วคัดลอกรหัสผ่าน 16 หลักไปใส่ในช่อง Password ของหน้า SMTP Profiles ใน PhishCentral

---

### 7.2 การทำ Whitelist ผ่าน "Advanced Delivery" ใน Microsoft Defender (สำคัญที่สุด ⭐)

> [!WARNING]
> **อย่าทำ Whitelist ผ่าน Transport Rules / Mail Flow ธรรมดา:** เพราะระบบตรวจจับ Phishing AI ของ Microsoft Defender จะยังคงกักกัน (Quarantine) อีเมลอยู่ดี และระบบ Safe Links จะคลิกลิงก์ล่วงหน้าทำให้สถิติเสีย

Microsoft 365 ได้ออกแบบช่องทางพิเศษสำหรับการทดสอบ Phishing ภายในองค์กรโดยเฉพาะ เรียกว่า **Advanced Delivery Policy**:
1. เข้าสู่ **[Microsoft Defender Portal](https://security.microsoft.com)**
2. ไปที่เมนู **Email & collaboration** > **Policies & rules** > **Threat policies** > **Advanced delivery**
3. เลือกแท็บ **Phishing simulation** แล้วกด **Edit** (หรือ Add)
4. ระบุข้อมูลการทดสอบของ PhishCentral:
   - **Sending Domains:** โดเมนที่ใช้ส่งอีเมลจำลอง (เช่น โดเมนองค์กรของคุณ หรือโดเมนจำลองภายนอก)
   - **Sending IPs:** IP Address สาธารณะของเครื่อง/Server ที่รัน PhishCentral
   - **Simulation URLs to allow:** URL ของระบบฟิชชิ่ง เช่น `https://your-phish-domain.com/l/*`
5. กด **Save**
6. **ผลลัพธ์ที่ได้:**
   - อีเมลทดสอบจะส่งตรงเข้า Inbox 100% ไม่ถูกกักกันหรือเข้าโฟลเดอร์ Junk
   - **ระบบ Microsoft Defender Safe Links จะไม่ทำการเปิดคลิกลิงก์ล่วงหน้าอัตโนมัติ** ทำให้สถิติการคลิกของพนักงานบน Dashboard มีความแม่นยำสูงสุด

---

### 7.3 การส่งในนาม Email Alias หรือ Shared Mailbox (Send As)

หากต้องการให้ชื่อผู้ส่งในอีเมลดูสมจริง เช่น `security-alert@company.com` หรือ `hr-support@company.com` สามารถทำได้ 2 วิธี:

#### วิธีที่ 1: ใช้ Shared Mailbox ร่วมกับสิทธิ์ "Send As" (แนะนำสูงสุด - ฟรีไม่มีค่าใช้จ่าย)
1. ไปที่ **M365 Admin Center** > **Teams & groups** > **Shared mailboxes**
2. กด **Add a shared mailbox** สร้างชื่อกล่องจดหมายที่ต้องการ เช่น `security-alert@yourdomain.com` *(Shared Mailbox ใน M365 ใช้งานฟรี ไม่ต้องซื้อ License)*
3. คลิกเข้าไปที่ Shared Mailbox นั้น > ไปที่แท็บ **Members**
4. ในส่วน **Send as permissions** ให้กด **Edit** แล้วเพิ่มบัญชีผู้ใช้ของคุณ (บัญชีที่ใช้ล็อกอิน SMTP) เข้าไป
5. ใน PhishCentral:
   - กรอก **Username / Password** เป็นบัญชีหลักของคุณ
   - แต่ในช่อง **From Email** สามารถระบุเป็น `security-alert@yourdomain.com` ได้ทันที

#### วิธีที่ 2: ใช้ Email Alias ของบัญชีตนเอง
1. เพิ่ม Alias เข้าไปที่บัญชีตนเองใน M365 Admin Center (เช่น บัญชีจริง `somchai@domain.com` เพิ่ม Alias เป็น `it-notice@domain.com`)
2. เปิดการอนุญาตส่งในนาม Alias ทั้งองค์กรใน **Exchange Admin Center**:
   - ไปที่ **Settings** > **Mail flow** > ติ๊กถูกที่ **Turn on sending from aliases**
   *(หรือรันผ่าน PowerShell: `Set-OrganizationConfig -SendFromAliasEnabled $true`)*
3. จากนั้นใน PhishCentral คุณจะสามารถใส่ From Email เป็นชื่อ Alias นั้นได้โดยตรง

---

### 7.4 การตั้งค่าฝั่ง Google Workspace (Gmail)
สำหรับองค์กรที่ใช้ Google Workspace หรือบัญชี Gmail:
1. **Google ยกเลิกระบบ Less Secure Apps แล้ว 100%** จึงต้องเปิด **2-Step Verification** ที่ [Google Account Security](https://myaccount.google.com/security)
2. เข้าไปที่เมนู **App Passwords** (รหัสผ่านสำหรับแอป)
3. สร้างรหัสผ่านใหม่สำหรับแอป โดยเลือกประเภทเป็น **Mail**
4. นำรหัสผ่าน 16 ตัวอักษรที่ระบบสร้างให้ มาใส่ในช่อง Password ของ PhishCentral
5. แนะนำให้เลือก Preset **`Google Workspace / Gmail (STARTTLS 587)`** ในหน้า SMTP Profiles ระบบจะตั้งค่า Port 587 และ TLS ให้อัตโนมัติครับ

