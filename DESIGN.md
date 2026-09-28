---
name: "PhishCentral Enterprise Earthtone Design System"
version: "2.2.0"
spec: "https://stitch.withgoogle.com/docs/design-md/specification"
theme: "light"
tokens:
  colors:
    background:
      canvas: "#FAF8F5"
      surface: "#FFFFFF"
      muted: "#F5F3EE"
    primary:
      default: "#2D5A43"
      hover: "#234735"
      light: "#E8EFEA"
      onPrimary: "#FFFFFF"
    secondary:
      default: "#D97736"
      hover: "#C26527"
      light: "#FCF3EB"
      onSecondary: "#FFFFFF"
    text:
      primary: "#24292F"
      secondary: "#4B5563"
      muted: "#9CA3AF"
    border:
      default: "#E7E5E0"
      focus: "#2D5A43"
    status:
      success: "#16A34A"
      warning: "#D97736"
      danger: "#DC2626"
      info: "#2563EB"
  typography:
    fontFamily:
      sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    scale:
      xs: "0.75rem"
      sm: "0.875rem"
      base: "1rem"
      lg: "1.125rem"
      xl: "1.25rem"
      2xl: "1.5rem"
  spacing:
    unit: "4px"
    containerMaxWidth: "1280px"
    sidebarWidth: "256px"
  radii:
    sm: "6px"
    md: "8px"
    lg: "12px"
    xl: "16px"
    full: "9999px"
  elevation:
    soft: "0 2px 8px rgba(0, 0, 0, 0.04)"
    medium: "0 4px 16px rgba(0, 0, 0, 0.06)"
    modal: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
---

# DESIGN.md — PhishCentral Enterprise Design & Architecture Specification

This document follows the [Google Stitch `DESIGN.md` Specification](https://stitch.withgoogle.com/docs/design-md/specification), providing a persistent, structured, and machine-readable source of truth for both the **Visual Design System** and the **Production Authentication Architecture** of PhishCentral.

---

## 1. Overview (Design Philosophy)

PhishCentral uses an **Executive Earthtone Minimalism** aesthetic designed specifically for Security Operations Center (SOC) teams, IT auditors, and C-level executives.
- **Calm Authority:** Instead of cliché neon-on-black "hacker" interfaces that cause eye strain during long auditing sessions, PhishCentral uses warm paper-like backgrounds (`#FAF8F5`) paired with deep botanical forest greens (`#2D5A43`) and terracotta amber highlights (`#D97736`).
- **High-Density Clarity:** Complex security telemetry (compromise funnels, department benchmarks, multi-template randomization distributions, and repeat-offender tables) is organized into clean white surface cards (`#FFFFFF`) with subtle stone borders (`#E7E5E0`).
- **Bilingual Thai/English Precision:** Labels pair natural executive Thai phrasing with standard cybersecurity terminology in parentheses—e.g., `เข้าสู่ระบบผู้ดูแล (Admin Sign In)`, `สุ่มหลายแบบ (Multi-Vector)`.

---

## 2. Colors

| Token Role | Tailwind Class | Hex Value | Usage Context |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `bg-warm-sand` | `#FAF8F5` | Main application backdrop & Login screen canvas |
| **Card Surface** | `bg-white` | `#FFFFFF` | Cards, Modals, Sidebar, Tables, Input fields |
| **Muted Surface** | `bg-stone-muted` | `#F5F3EE` | Hover states, Secondary pill backgrounds, Table headers |
| **Primary Brand** | `bg-forest` / `text-forest` | `#2D5A43` | Primary CTA buttons, Active nav links, Resilience badges |
| **Primary Hover** | `hover:bg-forest-hover` | `#234735` | Hover state on primary buttons |
| **Primary Tint** | `bg-forest-light` | `#E8EFEA` | Active selection backgrounds, PDPA compliance callouts |
| **Secondary Accent** | `text-amber-terracotta` | `#D97736` | Clicked funnel metrics, Warning highlights |
| **Primary Text** | `text-deep-slate` | `#24292F` | Headings, Primary numbers, Card titles |
| **Stroke / Border** | `border-stone-border` | `#E7E5E0` | Card borders, Dividers, Input borders |
| **Danger / Compromised** | `text-red-600` / `bg-red-600` | `#DC2626` | Compromised metrics, Kill Switch, Revoke Session |

---

## 3. Typography

- **Primary Font Stack (`font-sans`):** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — optimized for both Latin and Thai script legibility.
- **Monospace Font Stack (`font-mono`):** Used for numerical KPIs, IP addresses, timestamps, token badges, and percentages.
- **Hierarchy:**
  - **Page Title:** `text-2xl font-bold text-deep-slate tracking-tight`
  - **Section / Modal Header:** `text-base` or `text-lg font-bold text-deep-slate`
  - **Form Labels:** `text-xs font-semibold text-gray-700`
  - **Body / Table Cell:** `text-sm text-gray-700`
  - **Helper / Metadata:** `text-[11px] text-gray-500`

---

## 4. Layout & Responsiveness

- **Application Shell:** Fixed-width left sidebar (`w-64` / `256px`) with scrollable main workspace (`flex-1 p-8 overflow-y-auto`) and centered container (`max-w-7xl mx-auto`).
- **Modal Architecture:** Responsive viewport-constrained dialog (`max-h-[90vh] flex flex-col`) with sticky header, scrollable body (`overflow-y-auto`), and sticky action footer.
- **Authentication Screen (`/login`):** Centered single-column card (`max-w-md w-full`) on `bg-warm-sand` canvas.

---

## 5. Elevation & Depth

- **Soft Card Elevation (`shadow-soft`):** `0 2px 8px rgba(0, 0, 0, 0.04)` paired with `1px solid #E7E5E0` border. Depth is achieved primarily through crisp border contrast rather than heavy drop shadows.
- **Medium Elevation (`shadow-medium`):** `0 4px 16px rgba(0, 0, 0, 0.06)` for interactive hover states and floating panels.
- **Modal Backdrop:** `bg-black/40` overlay (`z-50`) with `shadow-2xl` dialog container.

---

## 6. Shapes & Corner Radii

- **Cards & Modals:** `rounded-2xl` (`16px`)
- **Buttons, Inputs & Nav Items:** `rounded-xl` (`12px`) or `rounded-lg` (`8px`)
- **Status Pills & Badges:** `rounded-full` (`9999px`)

---

## 7. Components

### 7.1 Primary Action Button
- **Classes:** `bg-forest hover:bg-forest-hover text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-soft transition-all disabled:opacity-60`
- **Behavior:** Always shows loading state text or spinner and disables during async submission to prevent double-submission.

### 7.2 Form Inputs
- **Classes:** `w-full p-2.5 text-sm border border-stone-border rounded-xl outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all`

### 7.3 Multi-Vector / Segmented Mode Toggle
- **Classes:** `bg-stone-muted p-0.5 rounded-lg border border-stone-border/60 text-xs` with active pill `bg-forest text-white` or `bg-white text-forest shadow-xs font-semibold`.

---

## 8. Do's and Don'ts

### ✅ Do's
- **DO** use `bg-warm-sand` (`#FAF8F5`) for page backgrounds and `bg-white` for elevated content cards.
- **DO** enforce the **Zero-Password Policy** across all phishing landing pages—never store or display employee passwords.
- **DO** keep all Public Phishing Callback URLs (`/l/:token`, `/l/:token/submit`, `/report/:token`, `/track/open/:token`, `/static/*`) **unauthenticated** so targets can interact with simulated lures without a login prompt.
- **DO** protect all `/api/*` administrative endpoints with `requireAuth` JWT verification.

### ❌ Don'ts
- **DON'T** use dark/neon cyberpunk colors or harsh pure-black backgrounds in the Admin Console.
- **DON'T** mount `requireAuth` before `publicTrackingRouter` in `server/src/index.ts`.
- **DON'T** hash full JWT strings with `bcrypt` (which truncates at 72 bytes); always use `SHA-256` (`crypto.createHash('sha256')`) for hashing high-entropy refresh tokens.

---

## 9. Production Authentication & Security Architecture

### 9.1 Route Isolation & Mount Order (`server/src/index.ts`)

1. **Public Zone (Unauthenticated — Mounted First):**
   - `GET /track/open/:token` — 1x1 transparent GIF beacon
   - `GET /l/:token` — Phishing landing page SSR HTML
   - `POST /l/:token/submit` — Compromised credential capture simulation (sanitized by `zeroPasswordSanitizer`)
   - `GET /report/:token` — Employee phishing report callback
   - `GET /api/system/status` — Health probe
   - `GET /static/*` — Embedded email/landing page logos
2. **Auth Zone (`/api/auth/*`):**
   - `POST /api/auth/login` — Rate-limited (5 attempts / 15 min), returns `accessToken` (1h) + `refreshToken` (7d) + sets `HttpOnly` cookie `phishcentral_token`
   - `POST /api/auth/refresh` — Rotates refresh token (verified via SHA-256 hash) and issues new `accessToken`
   - `POST /api/auth/logout` — Revokes refresh token in DB and clears cookie
   - `GET /api/auth/me` — Returns current admin profile
   - `POST /api/auth/change-password` — Verifies current password, updates bcrypt hash (cost 12), and invalidates active sessions
   - `GET /api/auth/sessions` & `POST /api/auth/revoke-sessions` — Displays active session metadata, recent security `AuditLog` entries, and allows one-click session revocation
3. **Admin Zone (Protected by `app.use('/api', requireAuth)`):**
   - `/api/campaigns/*`, `/api/targets/*`, `/api/templates/*`, `/api/smtp-profiles/*`, `/api/dashboard/*`
