# 🛡️ PhishCentral Enterprise

> **Centralized Phishing Simulation & Security Awareness Platform**  
> แพลตฟอร์มจำลองการโจมตีแบบฟิชชิ่งและประเมินระดับความตระหนักรู้ด้านความปลอดภัยไซเบอร์ระดับองค์กร (PDPA & ISO 27001 Compliant)

---

## 📌 สารบัญ (Table of Contents)
- [1. ภาพรวมและจุดเด่นของระบบ (Key Features)](#1-ภาพรวมและจุดเด่นของระบบ-key-features)
- [2. โครงสร้างโปรเจกต์ (Project Structure)](#2-โครงสร้างโปรเจกต์-project-structure)
- [3. สถาปัตยกรรมและส่วนประกอบสำคัญ (Architecture & Components)](#3-สถาปัตยกรรมและส่วนประกอบสำคัญ-architecture--components)
- [4. วิธีการติดตั้งและเริ่มต้นใช้งาน (Getting Started)](#4-วิธีการติดตั้งและเริ่มต้นใช้งาน-getting-started)
- [5. การนำไป Deploy ใช้งานจริง (Production Deployment)](#5-การนำไป-deploy-ใช้งานจริง-production-deployment)
- [6. คู่มือการต่อยอดและเมนเทน (Developer & Maintenance Guide)](#6-คู่มือการต่อยอดและเมนเทน-developer--maintenance-guide)
- [7. การทดสอบระบบ (Testing & Quality Assurance)](#7-การทดสอบระบบ-testing--quality-assurance)
- [8. ความปลอดภัยและการ Whitelist เมลเซิร์ฟเวอร์](#8-ความปลอดภัยและการ-whitelist-เมลเซิร์ฟเวอร์)

---

## 1. ภาพรวมและจุดเด่นของระบบ (Key Features)

- 🔒 **Zero-Password Storage (มาตรฐาน PDPA & ISO 27001):** มีระบบ Top-level Express Middleware ดักจับและกรองรหัสผ่านจริง, OTP, และความลับทุกชนิดออกจาก Request Body ก่อนเข้าสู่ระบบ ไม่มีการบันทึกรหัสผ่านจริงของพนักงานลงฐานข้อมูลเด็ดขาด
- 🌐 **100% Local Assets (Zero External CDN):** ไม่มีพึ่งพา CDN ภายนอกแม้แต่จุดเดียว รูปภาพ โลโก้ SVG และฟอนต์ถูกบรรจุอยู่ในโปรเจกต์ทั้งหมด สามารถทำงานได้สมบูรณ์แบบในเครือข่ายปิด (Air-gapped / Private LAN / Intranet)
- 🤖 **Bot & Mail Security Scanner Detection:** มีระบบกรอง Traffic อัตโนมัติจากตัวตรวจจับอีเมล เช่น Microsoft Defender, Outlook SafeLinks, Barracuda, Google Image Proxy เพื่อป้องกัน False Positive
- 📊 **Security Dashboard & Resilience Index:** ชาร์ตวิเคราะห์ Funnel 4 ลำดับขั้น (Sent ➔ Clicked ➔ Compromised ➔ Reported), การจัดเกรดความมั่นคงปลอดภัยองค์กร (A+ ถึง F), และการตรวจจับพนักงานที่ตกเป็นเหยื่อซ้ำซ้อน (Repeat Offenders)
- ✉️ **Flexible SMTP Relay Profiles:** รองรับทั้ง Microsoft 365 (Port 587 STARTTLS), Google Workspace Relay, และ Internal Postfix/Exchange พร้อมการตั้งค่า Rate Limiting และ Delay ต่อเนื่อง
- 🎨 **Earthtone Design System:** อินเทอร์เฟซสบายตา ใช้งานง่าย ออกแบบด้วยโทนสี Earthtone ธรรมชาติ (`forest`, `deep-slate`, `warm-sand`) โดยงดการใช้สี Gradient ม่วง/ชมพูที่ดูเป็นเชิงพาณิชย์เกินไป

---

## 2. โครงสร้างโปรเจกต์ (Project Structure)

โปรเจกต์ใช้รูปแบบ **Monorepo (Full-Stack TypeScript)** แยกฝั่ง Client และ Server ไว้อย่างชัดเจน:

```plaintext
Phishing-mail/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/                 # Static Assets สำหรับ Frontend
│   │   ├── favicon.svg         # ไอคอนระบบ
│   │   ├── vite.svg            # Favicon Fallback
│   │   └── static/logos/       # โลโก้ SVG จำลอง (SSO, M365, AI Hub, e-Tax)
│   ├── src/
│   │   ├── components/         # คอมโพเนนต์ที่ใช้ซ้ำ (Navbar, Layout, Visual Editor)
│   │   │   ├── EmailEditorWithTools.tsx  # เครื่องมือ Visual Editor เทมเพลตอีเมล
│   │   │   └── Layout.tsx                # โครงสร้าง Layout หลัก + Navigation
│   │   ├── pages/              # หน้าหลักของระบบ
│   │   │   ├── Dashboard.tsx   # Dashboard สรุปสถิติ กราฟแนวโน้ม และ Resilience Score
│   │   │   ├── Campaigns.tsx   # จัดการแคมเปญ ส่งคิว จำลองสถานะ และ Reset
│   │   │   ├── Targets.tsx     # จัดการกลุ่มเป้าหมาย (Groups) และรายชื่อพนักงาน (CSV)
│   │   │   ├── TemplateLibrary.tsx # คลังเทมเพลตอีเมล/Landing Page + ปุ่มทดสอบส่งจริง
│   │   │   └── SmtpProfiles.tsx    # ตั้งค่าและทดสอบ Handshake ของโปรไฟล์ SMTP
│   │   ├── App.tsx             # Route Configuration
│   │   ├── index.css           # Tailwind Directives
│   │   └── main.tsx            # React Bootstrap Entry
│   ├── package.json            # Client Dependencies (React 18, Recharts, Lucide)
│   ├── tailwind.config.js      # Palette สี Earthtone & Font Configurations
│   └── vite.config.ts          # Vite Configuration พร้อม Proxy ไปยัง Backend (:3000)
│
├── server/                     # Backend Application (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # โครงสร้าง Database Schema (SQLite)
│   │   └── dev.db              # ไฟล์ฐานข้อมูล SQLite ในเครื่องพัฒนา
│   ├── public/
│   │   └── logos/              # ไฟล์ Vector SVG โลโก้จำลอง (เสิร์ฟผ่าน /static/logos/)
│   ├── src/
│   │   ├── middleware/
│   │   │   └── sanitizer.ts    # Zero-Password Sanitizer (กรองรหัสผ่านก่อนเข้า DB)
│   │   ├── routes/             # Express API Endpoints
│   │   │   ├── campaigns.ts    # API แคมเปญ (Create, Launch, Kill, Reset, Export CSV)
│   │   │   ├── dashboard.ts    # API ประมวลผลสถิติ กราฟแนวโน้ม และดัชนีชี้วัด
│   │   │   ├── publicTracking.ts # Endpoint จำลองฟิชชิ่ง (/l/:token, /report/:token)
│   │   │   ├── smtp.ts         # API จัดการโปรไฟล์ SMTP และทดสอบ Handshake
│   │   │   ├── targets.ts      # API จัดการกลุ่มและนำเข้าพนักงาน (CSV Upload)
│   │   │   └── templates.ts    # API คลังเทมเพลต โคลนเทมเพลต และส่งอีเมลทดสอบ
│   │   ├── services/
│   │   │   ├── dispatchService.ts # คิวส่งอีเมลพร้อม Rate Limit & Delay
│   │   │   ├── templateService.ts # จัดการ Handlebars Template & Presets
│   │   │   └── trackingService.ts # In-memory Telemetry Buffer & Batch Writer
│   │   ├── utils/
│   │   │   ├── network.ts      # ตรวจจับ Host IP อัตโนมัติ (Reachable Base URL)
│   │   │   └── tokenAndBot.ts  # สุ่ม Tracking Token และตรวจจับ User-Agent บอท
│   │   ├── __tests__/          # Vitest Automated Unit Tests
│   │   ├── prisma.ts           # Prisma Client Instance & WAL Pragmas
│   │   └── index.ts            # Server Entry Point, Middleware & Route Mounting
│   ├── package.json            # Server Dependencies (Express, Prisma, Nodemailer)
│   └── tsconfig.json           # TypeScript Compiler Options
│
├── data/                       # โฟลเดอร์เก็บ Persistent SQLite Database
├── Dockerfile                  # Multi-stage Docker Build (Client + Server + Runner)
├── docker-compose.yml          # การตั้งค่า Docker Compose สำหรับ Production
├── .dockerignore               # กรองไฟล์ node_modules และ dist ไม่ให้ส่งเข้า Docker
├── .env.example                # ตัวอย่างค่า Environment Variables
├── package.json                # Root Scripts ควบคุมการ Build และ Dev ของทั้งระบบ
├── USER_MANUAL.md              # คู่มือการใช้งานสำหรับผู้ใช้ทั่วไป (End-User Manual)
└── Spec.md                     # เอกสารข้อกำหนดทางเทคนิค (Technical Specification)
```

---

## 3. สถาปัตยกรรมและส่วนประกอบสำคัญ (Architecture & Components)

### 3.1 การไหลของข้อมูล (Data & Event Flow)
```
[ ผู้ดูแลระบบสร้างแคมเปญ ]
        │
        ▼
[ Dispatch Service ] ────(SMTP Relay)────► [ กล่องจดหมายพนักงาน ]
        │                                         │
        │ (สร้าง Tracking Token ประจำคน)            │ (พนักงานคลิกลิงก์)
        ▼                                         ▼
[ Tracking Service Buffer ] ◄───(HTTP)─── [ Landing Page (/l/:token) ]
        │                                         │ (เผลอกรอกข้อมูล)
        │ (เขียนลง DB แบบ Batch)                  ▼
        ▼                                 [ Zero-Password Sanitizer ]
[ SQLite (WAL Mode) ]                             │ (ลบรหัสผ่านทิ้งทันที)
        │                                         ▼
        └────────────────────────────────► [ Awareness Page / Red Flags ]
```

### 3.2 ระบบความปลอดภัย Zero-Password Storage
ฟังก์ชัน [`sanitizer.ts`](file:///d:/Nodejs/Phishing-mail/server/src/middleware/sanitizer.ts) จะทำหน้าที่สแกนทุก HTTP Request ก่อนเข้าสู่ Controller:
- คำว่า `password`, `pass`, `pwd`, `secret`, `token`, `otp`, `pin` จะถูกแทนที่ด้วยข้อความ `[REDACTED_BY_POLICY]`
- ทำให้ฐานข้อมูลและ Log ของระบบไม่มีรหัสผ่านจริงของผู้ใช้หลุดรอดไปเด็ดขาด

### 3.3 Dynamic Host URL Resolution
ฟังก์ชัน [`network.ts`](file:///d:/Nodejs/Phishing-mail/server/src/utils/network.ts) ป้องกันบั๊ก "ลิงก์ในอีเมลเป็น localhost":
1. ใช้ค่า Base URL ที่ส่งมาจากหน้าต่างเบราว์เซอร์ของ Admin ก่อนเป็นอันดับแรก
2. หากไม่มี ให้ใช้ค่า `BASE_URL` จาก `.env`
3. หากค่าเป็น `localhost` ระบบจะค้นหา IPv4 LAN จริงของเครื่องแม่ข่ายให้อัตโนมัติ(เช่น `http://192.168.xx.xx:3000`)

--- 

## 4. วิธีการติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- **Node.js:** เวอร์ชั่น 20.x ขึ้นไป
- **npm:** เวอร์ชั่น 10.x ขึ้นไป

### การติดตั้งและเริ่มรันแบบ Development Mode
```bash
# 1. Clone Repository
git clone <repository-url>
cd Phishing-mail

# 2. ติดตั้ง Dependencies ในทุกส่วน
npm --prefix server install
npm --prefix client install

# 3. เตรียมฐานข้อมูล SQLite
npm --prefix server run prisma:push

# 4. รันระบบ (เปิด 2 Terminal)
# Terminal 1: Backend API (พอร์ต 3000)
npm run dev:server

# Terminal 2: Frontend Client (พอร์ต 5173)
npm run dev:client
```
> เข้าใช้งานหน้าเว็บผ่านเบราว์เซอร์ที่: **`http://localhost:5173`**

---

## 5. การนำไป Deploy ใช้งานจริง (Production Deployment)

### วิธีที่ 1: Deploy ด้วย Docker Compose (แนะนำสูงสุด ⭐)

ระบบมีไฟล์ [`Dockerfile`](file:///d:/Nodejs/Phishing-mail/Dockerfile) และ [`docker-compose.yml`](file:///d:/Nodejs/Phishing-mail/docker-compose.yml) ที่พร้อมทำงานแบบ Multi-stage Build ทันที:

```bash
# 1. ตั้งค่า Environment Variable ในไฟล์ .env (ที่ Root Directory)
PORT=3000
BASE_URL=http://<IP-หรือ-Domain-ของเครื่องแม่ข่าย>:3000
ADMIN_API_KEY=your-secure-admin-secret

# 2. สั่งรันด้วย Docker Compose
docker compose up -d --build

# 3. ตรวจสอบสถานะและ Logs
docker compose ps
docker compose logs -f
```
> ฐานข้อมูลจะถูก Mount และบันทึกไว้ที่โฟลเดอร์ `./data/phishcentral.db` บน Host โดยอัตโนมัติ

### วิธีที่ 2: รันแบบ Production Node.js Process (PM2 / Systemd)
```bash
# 1. Build โค้ดทั้ง Client และ Server
npm run build

# 2. เริ่มต้นรันเซิร์ฟเวอร์
npm start
```

---

## 6. คู่มือการต่อยอดและเมนเทน (Developer & Maintenance Guide)

### 6.1 การเพิ่ม Email หรือ Landing Page Template ใหม่
เปิดไฟล์ [`server/src/services/templateService.ts`](file:///d:/Nodejs/Phishing-mail/server/src/services/templateService.ts):
- **เพิ่มเทมเพลตอีเมล:** เพิ่มข้อมูลลงในอาร์เรย์ `OFFICIAL_EMAIL_PRESETS`
- **เพิ่มหน้า Landing Page:** เพิ่มข้อมูลลงในอาร์เรย์ `OFFICIAL_LANDING_PRESETS`
- **การอัปเดต:** เมื่อรีสตาร์ตเซิร์ฟเวอร์ ฟังก์ชัน `seedOfficialPresets()` จะทำการ Upsert เทมเพลตใหม่ลงในฐานข้อมูลให้อัตโนมัติ

**ตัวแปรที่ใช้ในเทมเพลต (Handlebars):**
- `{{name}}` : ชื่อ-นามสกุลของพนักงาน
- `{{email}}` : อีเมลผู้รับ
- `{{department}}` : แผนกของพนักงาน
- `{{phishing_url}}` : ลิงก์จำลองฟิชชิ่งแบบเจาะจงบุคคล (`/l/<token>`)
- `{{report_url}}` : ลิงก์สำหรับกดแจ้งเบาะแสความปลอดภัย (`/report/<token>`)
- `{{current_date}}` : วันที่ปัจจุบันภาษาไทย

### 6.2 การเพิ่ม API Endpoint ใหม่
1. สร้าง Route ใหม่ในโฟลเดอร์ `server/src/routes/` เช่น `server/src/routes/reports.ts`
2. นำไปลงทะเบียนใน [`server/src/index.ts`](file:///d:/Nodejs/Phishing-mail/server/src/index.ts):
   ```typescript
   import { reportsRouter } from './routes/reports.js';
   app.use('/api/reports', reportsRouter);
   ```

### 6.3 การแก้ไขหรือเพิ่มตารางในฐานข้อมูล (Prisma)
1. แก้ไขไฟล์ [`server/prisma/schema.prisma`](file:///d:/Nodejs/Phishing-mail/server/prisma/schema.prisma)
2. สั่ง Sync โครงสร้างไปยัง SQLite:
   ```bash
   npm --prefix server run prisma:push
   npm --prefix server run prisma:generate
   ```

### 6.4 การเพิ่มหน้าใหม่ใน Frontend
1. สร้าง Page Component ใน `client/src/pages/`
2. ลงทะเบียน Route ใน [`client/src/App.tsx`](file:///d:/Nodejs/Phishing-mail/client/src/App.tsx)
3. เพิ่มเมนูบนแถบ Navigation ใน [`client/src/components/Layout.tsx`](file:///d:/Nodejs/Phishing-mail/client/src/components/Layout.tsx)

---

## 7. การทดสอบระบบ (Testing & Quality Assurance)

ระบบใช้ **Vitest** ในการทดสอบ Unit Tests และ Security Assertions:
```bash
# รันชุดการทดสอบทั้งหมด
npm test
```

**ขอบเขตของแบบทดสอบในปัจจุบัน:**
- `sanitizer.test.ts`: ตรวจสอบการล้างรหัสผ่านและ Sensitive Keys ทุกรูปแบบ
- `tokenAndBot.test.ts`: ตรวจสอบความยาวโทเคน และการดักจับบอท Scanner
- `templateEngine.test.ts`: ตรวจสอบ Handlebars Template Rendering และ XSS Protection

---

## 8. ความปลอดภัยและการ Whitelist เมลเซิร์ฟเวอร์

### การตั้งค่า Bypass Spam Filtering บน Microsoft 365 / Mail Gateway
ในการจำลอง Phishing การทดสอบอาจล้มเหลวหากเมลตกโฟลเดอร์ Junk/Quarantine ให้ผู้ดูแลระบบสร้าง **Mail Flow Rule** ใน Exchange Admin Center:
1. ไปที่ **Exchange admin center** ➔ **Mail flow** ➔ **Rules**
2. สร้างกฎใหม่: **"Bypass Spam Filtering for Phishing Simulation"**
3. กำหนดเงื่อนไข:
   - ตรวจสอบ Custom Header: `X-PhishCentral-Simulation` มีค่าใดๆ
   - หรือตรวจสอบ Sender IP: IP เครื่อง PhishCentral Server
4. กำหนด Action:
   - **Set the spam confidence level (SCL) to:** `Bypass spam filtering (-1)`

---

## 📄 ลิขสิทธิ์และการใช้งาน (License)
PhishCentral พัฒนาขึ้นเพื่อการฝึกอบรมและยกระดับความปลอดภัยไซเบอร์ภายในองค์กรเท่านั้น ห้ามนำไปใช้ในการโจมตีหรือกระทำการใดๆ ที่ขัดต่อกฎหมายและจริยธรรมไซเบอร์
