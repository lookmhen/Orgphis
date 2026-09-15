# 🛡️ PhishCentral Enterprise

> **Centralized Phishing Simulation & Security Awareness Platform**  
> แพลตฟอร์มจำลองสถานการณ์การโจมตีแบบฟิชชิ่งและการฝึกอบรมสร้างความตระหนักรู้ด้านความปลอดภัยไซเบอร์ระดับองค์กร (สอดคล้องตามมาตรฐาน PDPA & ISO 27001)

---

## 📌 สารบัญ (Table of Contents)
- [1. จุดเด่นและความสามารถหลักของระบบ (Key Features)](#1-จุดเด่นและความสามารถหลักของระบบ-key-features)
- [2. โครงสร้างโปรเจกต์ (Project Structure)](#2-โครงสร้างโปรเจกต์-project-structure)
- [3. สถาปัตยกรรมและกลไกความปลอดภัย (Architecture & Security Mechanisms)](#3-สถาปัตยกรรมและกลไกความปลอดภัย-architecture--security-mechanisms)
- [4. วิธีการติดตั้งและเริ่มต้นใช้งาน (Getting Started)](#4-วิธีการติดตั้งและเริ่มต้นใช้งาน-getting-started)
- [5. การนำไปใช้งานบนสภาพแวดล้อมจริง (Production Deployment)](#5-การนำไปใช้งานบนสภาพแวดล้อมจริง-production-deployment)
- [6. คู่มือสำหรับนักพัฒนาและการดูแลระบบ (Developer & Maintenance Guide)](#6-คู่มือสำหรับนักพัฒนาและการดูแลระบบ-developer--maintenance-guide)
- [7. การทดสอบระบบและการประกันคุณภาพ (Testing & QA)](#7-การทดสอบระบบและการประกันคุณภาพ-testing--qa)
- [8. แนวทางการตั้งค่าระบบเมลองค์กร (Mail Server Whitelist Guide)](#8-แนวทางการตั้งค่าระบบเมลองค์กร-mail-server-whitelist-guide)

---

## 1. จุดเด่นและความสามารถหลักของระบบ (Key Features)

- 🔒 **Zero-Password Storage (มาตรฐาน PDPA & ISO 27001):**  
  ระบบติดตั้ง Express Middleware ระดับบนสุด ทำหน้าที่ดักกรองและตัดข้อมูลความลับ เช่น รหัสผ่านจริง, OTP, PIN และ Security Tokens ออกจากทุก Request ก่อนเข้าสู่ระบบ ไม่มีการบันทึกรหัสผ่านของพนักงานลงในฐานข้อมูลหรือ System Logs อย่างเด็ดขาด
- 📎 **Simulated Email Attachments (จำลองไฟล์แนบเสมือนจริง ปลอดภัย 100%):**  
  เพิ่มความสมจริงในการทดสอบด้วยฟังก์ชันจำลองไฟล์แนบยอดนิยม (เช่น `.pdf`, `.docx`, `.xlsx`) พร้อม Quick Presets สำหรับสถานการณ์ทั่วไป (สลิปเงินเดือน, สิทธิประโยชน์โบนัส, ใบกำกับภาษี) โดยระบบจะสร้างไฟล์จำลองอัตโนมัติ ไม่จำเป็นต้องอัปโหลดไฟล์จริงขึ้นเซิร์ฟเวอร์ หมดกังวลเรื่องมัลแวร์ตกค้างหรือการถูกโปรแกรม Antivirus บล็อก
- ⏱️ **Randomized Smear Scheduling (ระบบกระจายคิวส่งตามเวลาทำการ):**  
  รองรับการตั้งเวลาส่งอีเมลแบบค่อยเป็นค่อยไป โดยสุ่มกระจายการส่งให้อยู่ในกรอบเวลาทำงานขององค์กร (เช่น 08:30 - 17:00 น.) พร้อมคัดกรองเฉพาะวันทำการ (จันทร์-ศุกร์) โดยอัตโนมัติ ช่วยลดความเสี่ยงที่อีเมลจะถูกตรวจจับโดยระบบ Email Gateway / Spam Filter และจำลองสถานการณ์เสมือนจริง
- 👥 **Smart CSV Auto-Grouping & Target Editor (ระบบจัดกลุ่มพนักงานอัตโนมัติ):**  
  นำเข้าไฟล์ CSV รายชื่อพนักงานเพียงครั้งเดียว ระบบจะอ่านชื่อแผนก (`department`) และสร้างกลุ่มเป้าหมายแยกแต่ละแผนกให้ทันทีโดยอัตโนมัติ ไม่ต้องเสียเวลาสร้างกลุ่มล่วงหน้า พร้อมรองรับการแก้ไขข้อมูลพนักงาน (ชื่อ, แผนก, อีเมล) ได้โดยตรงจากหน้าเว็บ
- 🤖 **Bot & Security Scanner Detection (คัดกรองระบบตรวจจับความปลอดภัย):**  
  มีกลไกตรวจสอบและคัดกรองการเปิดอ่านหรือคลิกลิงก์จากบอทอัตโนมัติ (เช่น Microsoft Defender Safe Links, Proofpoint, Google Image Proxy) ป้องกันไม่ให้เกิดตัวเลข False Positive ในรายงานผลการทดสอบ
- 📊 **Security Dashboard & Executive Export (แดชบอร์ดสถิติและรายงานสรุปผู้บริหาร):**  
  วิเคราะห์พฤติกรรมผ่าน Compromise Funnel 4 ลำดับขั้น (`Sent` ➔ `Clicked` ➔ `Compromised` ➔ `Reported`), ประเมินดัชนีความตระหนักรู้พร้อมตัดเกรดความมั่นคงปลอดภัยองค์กร (A+ ถึง F), แสดงรายชื่อพนักงานที่ตกเป็นเหยื่อซ้ำซ้อน (Repeat Offenders), และรองรับการส่งออกรายงานสรุปภาพรวมระดับองค์กรเป็นไฟล์ CSV (UTF-8 BOM รองรับภาษาไทยใน Microsoft Excel) ครอบคลุมทั้งสถิติภาพรวม, ผลลัพธ์แยกตามแผนก, และกลุ่มพนักงานเสี่ยงสูง
- ✉️ **Flexible SMTP Relay Profiles (รองรับระบบเมลมาตรฐานองค์กร):**  
  รองรับทั้ง Microsoft 365 (Port 587 STARTTLS), Google Workspace Relay และเซิร์ฟเวอร์อีเมลภายในองค์กร (เช่น Postfix หรือ Microsoft Exchange) พร้อมระบบควบคุมความเร็ว (Rate Limiting) และหน่วงเวลา (Delay) ต่อฉบับเพื่อความเสถียร
- 🌐 **100% Local Assets (ทำงานได้ในระบบเครือข่ายปิด):**  
  ไม่มีการพึ่งพา CDN ภายนอก รูปภาพ ไอคอน SVG และฟอนต์ถูกจัดเก็บและเสิร์ฟจากภายในระบบทั้งหมด สามารถติดตั้งใช้งานในระบบเครือข่ายปิด (Air-gapped / Private LAN / Intranet) ได้อย่างราบรื่น
- 🎨 **Earthtone Design System (อินเทอร์เฟซสบายตา เป็นมิตรต่อผู้ใช้งาน):**  
  ออกแบบด้วยชุดสีธรรมชาติ Earthtone (`forest`, `deep-slate`, `warm-sand`) หน้าต่างฟอร์มและ Modal ออกแบบด้วยโครงสร้าง Responsive มีแถบหัวข้อและปุ่มคำสั่งด้านล่างที่ตรึงไว้กับหน้าจอ (Sticky Header & Footer) ใช้งานสะดวกบนหน้าจอทุกขนาด

---

## 2. โครงสร้างโปรเจกต์ (Project Structure)

โปรเจกต์ได้รับการพัฒนาในรูปแบบ **Monorepo (Full-Stack TypeScript)** แยกส่วนการทำงานของ Client และ Server อย่างเป็นระเบียบ:

```plaintext
Phishing-mail/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/                 # Static Assets สำหรับฝั่ง Frontend
│   │   ├── favicon.svg         # ไอคอนประจำระบบ
│   │   └── static/logos/       # โลโก้ SVG จำลอง (SSO, M365, AI Hub, e-Tax)
│   ├── src/
│   │   ├── components/         # คอมโพเนนต์ส่วนกลาง (Navbar, Layout, Visual Editor)
│   │   │   ├── EmailEditorWithTools.tsx  # เครื่องมือ Visual Editor และจัดการไฟล์แนบ
│   │   │   └── Layout.tsx                # โครงสร้าง Layout หลักของระบบ
│   │   ├── pages/              # หน้าจอหลักของระบบ
│   │   │   ├── Dashboard.tsx   # รายงานสถิติภาพรวม กราฟแนวโน้ม และ Resilience Score
│   │   │   ├── Campaigns.tsx   # สร้างและจัดการแคมเปญ พร้อมระบบตั้งเวลาสุ่มส่ง
│   │   │   ├── Targets.tsx     # จัดการกลุ่มเป้าหมาย และระบบนำเข้า CSV แบบ Auto-Group
│   │   │   ├── TemplateLibrary.tsx # คลังเทมเพลตอีเมล/Landing Page พร้อมโหมด Sandbox Preview
│   │   │   └── SmtpProfiles.tsx    # ตั้งค่าและทดสอบการเชื่อมต่อ SMTP
│   │   ├── App.tsx             # การตั้งค่าเส้นทาง (Routes)
│   │   └── tailwind.config.js  # การกำหนด Palette สี Earthtone
│   └── vite.config.ts          # การตั้งค่า Vite และ Reverse Proxy ไปยัง Backend (:3000)
│
├── server/                     # Backend Application (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # โมเดลฐานข้อมูล SQLite
│   │   └── dev.db              # ไฟล์ฐานข้อมูลในเครื่องพัฒนา
│   ├── public/logos/           # ไฟล์ Vector SVG จำลอง
│   ├── src/
│   │   ├── middleware/
│   │   │   └── sanitizer.ts    # Zero-Password Sanitizer ดักกรองข้อมูลรหัสผ่าน
│   │   ├── routes/             # API Endpoints ของระบบ
│   │   │   ├── campaigns.ts    # จัดการแคมเปญ (สร้าง, เริ่มส่ง, หยุดฉุกเฉิน, ส่งออก CSV)
│   │   │   ├── dashboard.ts    # ประมวลผลข้อมูลสถิติและดัชนีชี้วัด
│   │   │   ├── publicTracking.ts # จุดรับการคลิกและการกรอกข้อมูล (/l/:token, /report/:token)
│   │   │   ├── smtp.ts         # จัดการโปรไฟล์เมลเซิร์ฟเวอร์ และทดสอบ Handshake
│   │   │   ├── targets.ts      # จัดการรายชื่อพนักงาน และการนำเข้าแบบสร้างกลุ่มอัตโนมัติ
│   │   │   └── templates.ts    # จัดการเทมเพลต โคลนเนื้อหา และทดสอบส่งอีเมล
│   │   ├── services/
│   │   │   ├── dispatchService.ts # คิวควบคุมการส่งอีเมลพร้อมรองรับไฟล์แนบจำลอง
│   │   │   ├── templateService.ts # จัดการเทมเพลตอีเมลและหน้าเว็บมาตรฐาน
│   │   │   └── trackingService.ts # บันทึกข้อมูล Telemetry แบบ Batch Buffer
│   │   ├── utils/
│   │   │   ├── network.ts      # ค้นหา Host IP สำหรับลิงก์จำลองอัตโนมัติ
│   │   │   ├── scheduler.ts    # คำนวณคิวเวลาสุ่มส่งตามวันทำการและชั่วโมงทำงาน
│   │   │   └── tokenAndBot.ts  # สุ่มโทเคนรายบุคคลและตรวจจับบอท
│   │   ├── __tests__/          # ชุดการทดสอบระบบแบบอัตโนมัติ (Automated Tests)
│   │   └── index.ts            # Entry Point ของเซิร์ฟเวอร์
│   └── tsconfig.json           # การตั้งค่า TypeScript Compiler
│
├── data/                       # โฟลเดอร์สำหรับเก็บฐานข้อมูล SQLite ถาวร (Docker Volume)
├── Dockerfile                  # Multi-stage Docker Build
├── docker-compose.yml          # การตั้งค่า Docker Compose สำหรับ Production
├── USER_MANUAL.md              # คู่มือการใช้งานสำหรับผู้ดูแลระบบ
└── README.md                   # เอกสารภาพรวมและคู่มือเริ่มต้น
```

---

## 3. สถาปัตยกรรมและกลไกความปลอดภัย (Architecture & Security Mechanisms)

### 3.1 ขั้นตอนการทำงานของข้อมูลและเหตุการณ์ (Data Flow)
```
[ ผู้ดูแลระบบสั่งเริ่มแคมเปญ ]
        │
        ▼
[ Dispatch Queue ] ──(SMTP Relay)──► [ กล่องจดหมายพนักงาน ]
        │                                    │
        │ (สร้าง Tracking Token ประจำคน)       │ (พนักงานคลิกลิงก์ / เปิดไฟล์แนบ)
        ▼                                    ▼
[ Telemetry Buffer ] ◄──(HTTP Request)─── [ Landing Page (/l/:token) ]
        │                                    │ (กรณีเผลอกรอกข้อมูล)
        │ (บันทึกข้อมูลลงฐานข้อมูล)             ▼
        ▼                            [ Zero-Password Sanitizer ]
[ SQLite (WAL Mode) ]                        │ (ลบรหัสผ่านทิ้งทันที)
        │                                    ▼
        └───────────────────────────► [ Awareness Training Page ]
```

### 3.2 กลไก Zero-Password Storage
มิดเดิลแวร์ [`sanitizer.ts`](file:///d:/Nodejs/Phishing-mail/server/src/middleware/sanitizer.ts) จะสแกนทุกคำขอ HTTP ขาเข้าก่อนส่งต่อไปยัง Controller:
- คำว่า `password`, `pass`, `pwd`, `secret`, `token`, `otp`, `pin` จะถูกแปลงค่าเป็น `[REDACTED_BY_POLICY]` ในทันที
- ข้อมูลรหัสผ่านจริงจะไม่ถูกบันทึกหรือปรากฏในฐานข้อมูลและ System Logs ไม่ว่ากรณีใดทั้งสิ้น

### 3.3 การหา Host IP อัตโนมัติ (Dynamic Host URL Resolution)
โมดูล [`network.ts`](file:///d:/Nodejs/Phishing-mail/server/src/utils/network.ts) ช่วยป้องกันปัญหาลิงก์ในอีเมลชี้ไปที่ `localhost`:
1. ใช้ค่า URL ที่ผู้ดูแลระบบเข้าใช้งานในขณะนั้นเป็นลำดับแรก
2. หากไม่มี ให้ใช้ค่า `BASE_URL` ที่ระบุไว้ใน `.env`
3. หากค่าถูกตั้งเป็น `localhost` ระบบจะค้นหา IPv4 LAN ของเครื่องเซิร์ฟเวอร์ให้อัตโนมัติ (เช่น `http://192.168.x.x:3000`) เพื่อให้เครื่องผู้รับสามารถเข้าถึงหน้าทดสอบได้จริง

---

## 4. วิธีการติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการเบื้องต้นของระบบ (Prerequisites)
- **Node.js:** เวอร์ชั่น 20.x ขึ้นไป
- **npm:** เวอร์ชั่น 10.x ขึ้นไป

### ขั้นตอนการรันในโหมดพัฒนา (Development Mode)
```bash
# 1. Clone Repository เข้ามายังเครื่อง
git clone <repository-url>
cd Phishing-mail

# 2. ติดตั้ง Dependencies ทั้งฝั่ง Server และ Client
npm --prefix server install
npm --prefix client install

# 3. เตรียมโครงสร้างฐานข้อมูล SQLite
npm --prefix server run prisma:push

# 4. รันระบบ (แยกเปิด 2 Terminal)
# Terminal 1: Backend Server (พอร์ต 3000)
npm run dev:server

# Terminal 2: Frontend Client (พอร์ต 5173)
npm run dev:client
```
> เข้าใช้งานหน้าเว็บผ่านเบราว์เซอร์ที่: **`http://localhost:5173`**

---

## 5. การนำไปใช้งานบนสภาพแวดล้อมจริง (Production Deployment)

### รูปแบบที่ 1: ติดตั้งผ่าน Docker Compose (แนะนำสูงสุด ⭐)
ระบบมีไฟล์ [`Dockerfile`](file:///d:/Nodejs/Phishing-mail/Dockerfile) และ [`docker-compose.yml`](file:///d:/Nodejs/Phishing-mail/docker-compose.yml) พร้อมใช้งาน:

```bash
# 1. สร้างและตั้งค่าไฟล์ .env ที่โฟลเดอร์หลัก (Root)
PORT=3000
BASE_URL=http://<IP-หรือ-Domain-ของเซิร์ฟเวอร์>:3000
ADMIN_API_KEY=your-secure-admin-secret

# 2. สั่งรันระบบผ่าน Docker Compose
docker compose up -d --build

# 3. ตรวจสอบสถานะการทำงานและ Logs
docker compose ps
docker compose logs -f
```
> ข้อมูลฐานข้อมูลจะถูกจัดเก็บไว้ที่โฟลเดอร์ `./data/phishcentral.db` บนโฮสต์โดยอัตโนมัติ มั่นใจได้ว่าข้อมูลจะไม่สูญหายเมื่อรีสตาร์ตคอนเทนเนอร์

### รูปแบบที่ 2: รันด้วย Node.js Process (PM2 / Systemd)
```bash
# 1. Build โค้ดทั้งระบบ
npm run build

# 2. เริ่มต้นรันเซิร์ฟเวอร์ (จะให้บริการทั้ง API และหน้าเว็บผ่านพอร์ต 3000)
npm start
```

---

## 6. คู่มือสำหรับนักพัฒนาและการดูแลระบบ (Developer & Maintenance Guide)

### 6.1 การเพิ่มหรือปรับแต่งเทมเพลตมาตรฐาน
เปิดไฟล์ [`server/src/services/templateService.ts`](file:///d:/Nodejs/Phishing-mail/server/src/services/templateService.ts):
- **เทมเพลตอีเมล:** เพิ่มข้อมูลลงในอาร์เรย์ `OFFICIAL_EMAIL_PRESETS`
- **หน้าเว็บ Landing Page:** เพิ่มข้อมูลลงในอาร์เรย์ `OFFICIAL_LANDING_PRESETS`
- ระบบมีฟังก์ชัน `seedOfficialPresets()` ที่จะตรวจสอบและ Upsert ข้อมูลมาตรฐานลงฐานข้อมูลให้อัตโนมัติเมื่อเริ่มต้นระบบ

**ตัวแปร Dynamic Tags ที่รองรับ:**
- `{{name}}` : ชื่อ-นามสกุลของพนักงานเป้าหมาย
- `{{email}}` : ที่อยู่อีเมลของพนักงาน
- `{{department}}` : แผนกของพนักงาน
- `{{phishing_url}}` : ลิงก์จำลองฟิชชิ่งเฉพาะบุคคล (`/l/<token>`)
- `{{report_url}}` : ลิงก์สำหรับกดรายงานอีเมลน่าสงสัย (`/report/<token>`)
- `{{current_date}}` : วันที่ปัจจุบันรูปแบบภาษาไทย

### 6.2 การปรับปรุงฐานข้อมูล (Prisma Migration)
1. ปรับปรุงไฟล์ [`server/prisma/schema.prisma`](file:///d:/Nodejs/Phishing-mail/server/prisma/schema.prisma)
2. อัปเดตโครงสร้างฐานข้อมูลและสร้าง Prisma Client:
   ```bash
   npm --prefix server run prisma:push
   npm --prefix server run prisma:generate
   ```

---

## 7. การทดสอบระบบและการประกันคุณภาพ (Testing & QA)

ระบบใช้ **Vitest** ในการทดสอบแบบอัตโนมัติ ครอบคลุมทั้ง Security Assertions, Logic การคำนวณ และ API Endpoints:

```bash
# รันชุดการทดสอบทั้งหมด
npm test
```

### ชุดการทดสอบทั้งหมด (5 Test Suites - ผ่าน 100%):
1. **`sanitizer.test.ts`**: ทดสอบกลไก Zero-Password ป้องกันรหัสผ่านรั่วไหล
2. **`tokenAndBot.test.ts`**: ทดสอบการสุ่ม Token และการคัดกรอง Bot / Security Scanners
3. **`templateEngine.test.ts`**: ทดสอบการเรนเดอร์ Dynamic Tags และความปลอดภัยของโค้ด HTML
4. **`scheduler.test.ts`**: ทดสอบระบบสุ่มคิวส่ง (Smear Scheduling), การตัดวันหยุดสุดสัปดาห์, และการกระจายเวลางาน
5. **`features.test.ts`**: ทดสอบ API การนำเข้าพนักงานแบบ Auto-Group, การแก้ไขข้อมูล Target, ระบบจำลองไฟล์แนบ (Attachments), และการสตรีมรายงานสรุปภาพรวมระดับองค์กร (Executive Summary CSV)

---

## 8. แนวทางการตั้งค่าระบบเมลองค์กร (Mail Server Whitelist Guide)

เพื่อป้องกันไม่ให้อีเมลทดสอบถูกคัดกรองลงในโฟลเดอร์ Junk หรือ Quarantine ผู้ดูแลระบบควรตั้งค่า **Mail Flow Rule** ใน Exchange Admin Center หรือระบบ Mail Gateway ขององค์กร:

1. เข้าสู่ **Exchange admin center** ➔ **Mail flow** ➔ **Rules**
2. สร้างกฎใหม่: **"Bypass Spam Filtering for Phishing Simulation"**
3. กำหนดเงื่อนไข (Conditions):
   - ตรวจสอบ Custom Header: `X-PhishCentral-Simulation` มีค่าใดๆ
   - หรือตรวจสอบ Sender IP: ระบุหมายเลข IP ของเครื่อง PhishCentral Server
4. กำหนดการดำเนินการ (Action):
   - **Set the spam confidence level (SCL) to:** `Bypass spam filtering (-1)`

---

## 📄 ลิขสิทธิ์และการนำไปใช้งาน (License & Ethics)
PhishCentral พัฒนาขึ้นสำหรับใช้ในการฝึกอบรมและยกระดับความตระหนักรู้ด้านความปลอดภัยไซเบอร์ภายในองค์กรอย่างถูกต้องตามกฎหมาย ห้ามนำไปใช้ในการโจมตีหรือกระทำการใดๆ ที่ละเมิดสิทธิและขัดต่อจริยธรรมไซเบอร์
