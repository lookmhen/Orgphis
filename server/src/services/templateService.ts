import Handlebars from 'handlebars';
import { prisma } from '../prisma.js';

export interface TemplateVariables {
  name?: string;
  email?: string;
  department?: string;
  empid?: string;
  phishing_url?: string;
  current_date?: string;
  [key: string]: any;
}

/**
 * Compiles and renders an HTML or text template using Handlebars
 * Auto-escapes variables to prevent XSS
 */
export function renderTemplate(templateString: string, variables: TemplateVariables): string {
  const template = Handlebars.compile(templateString);
  const enrichedVariables: TemplateVariables = {
    ...variables,
    current_date: variables.current_date || new Date().toLocaleDateString('th-TH')
  };
  return template(enrichedVariables);
}

/**
 * Default Official System Presets
 */
export const OFFICIAL_EMAIL_PRESETS = [
  {
    name: 'IT Urgent Password Expiry',
    subject: 'ด่วน: รหัสผ่านของคุณกำลังจะหมดอายุในอีก 24 ชั่วโมง',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 8px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #1F2937; margin-bottom: 8px;">ศูนย์บริการเทคโนโลยีสารสนเทศ (IT Support)</h2>
    <p style="color: #4B5563; font-size: 14px;">แจ้งเตือนการรักษาความปลอดภัยระบบประจำปี</p>
  </div>
  <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin-bottom: 20px;">
    <p style="margin: 0; color: #92400E; font-weight: 600;">รหัสผ่านของคุณจะหมดอายุในวันที่ {{current_date}} เวลา 23:59 น.</p>
  </div>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    เรียนคุณ <strong>{{name}}</strong> (รหัสพนักงาน: {{empid}}),
  </p>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    ตามนโยบายความมั่นคงปลอดภัยสารสนเทศของบริษัท ขอความร่วมมือท่านทำการยืนยันและรีเซ็ตรหัสผ่านเพื่อป้องกันการระงับการใช้งานชั่วคราว
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{phishing_url}}" style="background-color: #2563EB; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
      รีเซ็ตรหัสผ่านทันที
    </a>
  </div>
  <p style="color: #6B7280; font-size: 13px; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
    หากปุ่มด้านบนไม่ทำงาน ท่านสามารถคัดลอกลิงก์นี้เปิดในเบราว์เซอร์: <br>
    <a href="{{phishing_url}}" style="color: #2563EB;">{{phishing_url}}</a>
  </p>
</div>
`,
    bodyText: 'แจ้งเตือนรหัสผ่านหมดอายุ กรุณาเข้าสู่ลิงก์: {{phishing_url}}',
    isPreset: true
  },
  {
    name: 'HR Annual Bonus & Payroll Review',
    subject: 'ประกาศฝ่ายทรัพยากรบุคคล: ผลการประเมินและสิทธิประโยชน์ประจำปี',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 8px;">
  <h2 style="color: #065F46; border-bottom: 2px solid #10B981; padding-bottom: 8px;">Human Resources Department</h2>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    เรียนคุณ <strong>{{name}}</strong> (แผนก {{department}}),
  </p>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    ฝ่ายทรัพยากรบุคคลได้ทำการสรุปข้อมูลการปรับอัตราผลตอบแทนและสิทธิประโยชน์ประจำรอบปีเรียบร้อยแล้ว ท่านสามารถตรวจสอบเอกสารสรุปยอดส่วนบุคคลได้ผ่านลิงก์ด้านล่าง
  </p>
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{phishing_url}}" style="background-color: #059669; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
      ตรวจสอบสลิปเงินเดือนและโบนัส
    </a>
  </div>
  <p style="color: #9CA3AF; font-size: 12px;">เอกสารนี้เป็นความลับเฉพาะบุคคล</p>
</div>
`,
    bodyText: 'ตรวจสอบเอกสารผลตอบแทนประจำปีได้ที่: {{phishing_url}}',
    isPreset: true
  },
  {
    name: 'Microsoft 365 Unusual Sign-in Activity',
    subject: 'Microsoft Security Alert: Unusual sign-in activity detected',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #D1D5DB; border-radius: 4px;">
  <div style="display: flex; align-items: center; margin-bottom: 20px;">
    <span style="font-size: 20px; font-weight: 700; color: #0078D4;">Microsoft</span>
  </div>
  <h3 style="color: #D83B01; margin-top: 0;">Unusual sign-in activity</h3>
  <p style="color: #24292F; font-size: 14px;">We detected an unusual sign-in attempt to your Microsoft 365 account ({{email}}) from an unknown device in Frankfurt, Germany.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; color: #4B5563;">
    <tr><td style="padding: 6px 0;"><strong>Date:</strong></td><td>{{current_date}}</td></tr>
    <tr><td style="padding: 6px 0;"><strong>IP Address:</strong></td><td>185.220.101.42</td></tr>
    <tr><td style="padding: 6px 0;"><strong>Platform:</strong></td><td>Linux / Unknown Browser</td></tr>
  </table>
  <div style="margin: 24px 0;">
    <a href="{{phishing_url}}" style="background-color: #0078D4; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 2px; font-weight: 600; display: inline-block;">
      Review recent activity
    </a>
  </div>
  <p style="color: #6B7280; font-size: 12px;">If this was you, you can safely ignore this email.</p>
</div>
`,
    bodyText: 'Unusual sign-in activity detected on your Microsoft 365 account: {{phishing_url}}',
    isPreset: true
  },
  {
    name: 'Microsoft 365 Copilot AI Free Activation (Bilingual)',
    subject: '[สิทธิพิเศษ / Privilege] เปิดใช้งาน Microsoft 365 Copilot AI ฟรี สำหรับบัญชีของคุณ',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #D1D5DB; border-radius: 8px; background-color: #ffffff;">
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #0078D4; padding-bottom: 12px;">
    <span style="font-size: 22px; font-weight: 700; color: #0078D4;">Microsoft 365</span>
    <span style="font-size: 13px; font-weight: 600; color: #5C2D91; background: #F3E8FF; padding: 3px 10px; border-radius: 4px;">Copilot Enterprise</span>
  </div>
  
  <h3 style="color: #1F2937; margin: 0 0 4px 0; font-size: 18px;">คุณได้รับสิทธิ์เปิดใช้งาน Copilot AI ฟรี</h3>
  <div style="color: #4B5563; font-size: 13px; font-weight: 600; margin-bottom: 16px;">You have been allocated a complimentary Microsoft 365 Copilot License</div>

  <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 6px 0;">
    เรียนคุณ <strong>{{name}}</strong> ({{email}}),
  </p>
  <p style="color: #6B7280; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0; font-style: italic;">
    Dear {{name}} (Department: {{department}} - Staff ID: {{empid}}),
  </p>

  <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
    ฝ่ายสารสนเทศและดิจิทัลทรานส์ฟอร์เมชัน ได้จัดสรรสิทธิ์การใช้งาน <strong>Microsoft 365 Copilot (AI Assistant)</strong> สำหรับการทำงานบน Word, Excel, PowerPoint และ Teams ให้แก่พนักงานแผนก <strong>{{department}}</strong> โดยไม่มีค่าใช้จ่าย
  </p>
  <p style="color: #6B7280; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">
    The Corporate IT & Digital Transformation Department has provisioned your account with full Microsoft 365 Copilot privileges to assist your daily workflow.
  </p>
  
  <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 14px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0 0 4px 0; color: #166534; font-size: 13px; font-weight: 600;">
      ⚡ กรุณายืนยันการรับสิทธิ์ License ภายใน 48 ชั่วโมง
    </p>
    <p style="margin: 0; color: #166534; font-size: 12px;">
      Please activate your license within 48 hours to prevent reallocation to other staff members.
    </p>
  </div>

  <div style="text-align: center; margin: 28px 0;">
    <a href="{{phishing_url}}" style="background-color: #0078D4; color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
      เปิดใช้งาน Copilot AI / Activate License
    </a>
  </div>

  <p style="color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px;">
    อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ สำหรับ {{email}} เท่านั้น (Confidential & Automated notification for {{email}})
  </p>
</div>
`,
    bodyText: 'เปิดใช้งาน Microsoft 365 Copilot AI ฟรี / Activate your free Copilot license: {{phishing_url}}',
    isPreset: true
  },
  {
    name: 'Enterprise AI Workspace Access (Bilingual)',
    subject: 'แจ้งเปิดทดสอบระบบ Enterprise Generative AI / Corporate AI Hub Access Notice',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 8px; background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #1E293B, #334155); color: #ffffff; padding: 18px 24px; border-radius: 6px; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 18px;">ศูนย์นวัตกรรมและปัญญาประดิษฐ์องค์กร</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Corporate AI Hub & Sandbox Program</p>
  </div>

  <p style="color: #334151; font-size: 14px; line-height: 1.6; margin: 0 0 6px 0;">
    เรียนบุคลากรทุกท่าน (รหัสพนักงาน: {{empid}}),
  </p>
  <p style="color: #6B7280; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
    Dear Staff Member (Staff ID: {{empid}}),
  </p>

  <p style="color: #334151; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
    บริษัทได้เปิดให้พนักงานทุกคนสามารถเข้าใช้งานระบบ <strong>Enterprise AI Hub (GPT-4o & Claude 3.5)</strong> ภายใต้เครือข่ายปลอดภัยของบริษัทโดยไม่มีค่าใช้จ่าย
  </p>
  <p style="color: #6B7280; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">
    You are invited to access the secure enterprise edition of Generative AI tools with corporate data loss prevention (DLP) protection.
  </p>

  <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0 0 2px 0; color: #1E40AF; font-size: 13px; font-weight: 600;">
      🎁 สิทธิพิเศษ: บัญชีพรีเมียมแบบไม่จำกัดโควตา สำหรับผู้ลงทะเบียน 100 ท่านแรก
    </p>
    <p style="margin: 0; color: #1E40AF; font-size: 12px;">
      Complimentary unlimited query quota reserved for the first 100 registered staff.
    </p>
  </div>

  <div style="text-align: center; margin: 28px 0;">
    <a href="{{phishing_url}}" style="background-color: #2563EB; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
      ลงทะเบียนเข้าใช้งาน AI / Register for AI Access
    </a>
  </div>

  <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px; border-top: 1px solid #F3F4F6; padding-top: 12px;">
    หากท่านพบปัญหาการเข้าใช้งาน กรุณาติดต่อ IT Helpdesk / For technical support, contact internal helpdesk.
  </p>
</div>
`,
    bodyText: 'เปิดให้ทดลองใช้ Generative AI สำหรับองค์กรฟรี / Register for Corporate AI Access: {{phishing_url}}',
    isPreset: true
  },
  {
    name: 'Corporate Flash Sale & Staff Discount Voucher (Bilingual)',
    subject: 'สิทธิพิเศษพนักงาน: มอบคูปองส่วนลดพิเศษ 70% / Staff Privilege Discount Voucher',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #FECDD3; border-radius: 8px; background-color: #FFF1F2;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #E11D48; margin: 0 0 4px 0; font-size: 22px;">🛍️ สวัสดิการช้อปปิ้งพนักงาน</h2>
    <p style="color: #9F1239; font-size: 13px; margin: 0; font-weight: 600;">Exclusive Corporate Staff Welfare Flash Sale</p>
  </div>

  <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; border: 1px dashed #FB7185; margin: 16px 0;">
    <p style="color: #374151; font-size: 14px; margin: 0 0 6px 0;">
      เรียนคุณ <strong>{{name}}</strong>,
    </p>
    <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin: 0 0 6px 0;">
      ฝ่ายสวัสดิการพนักงานมอบคูปองส่วนลดพิเศษ <strong>2,500 บาท</strong> สำหรับการสั่งซื้อ iPhone, iPad, แล็ปท็อป และ Gadget ประจำเดือน
    </p>
    <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 0 0 14px 0; font-style: italic;">
      Staff welfare committee provides an exclusive 2,500 THB electronic voucher for smartphones and IT electronics.
    </p>
    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 10px; text-align: center; border-radius: 6px;">
      <span style="font-family: monospace; font-size: 16px; font-weight: 700; color: #B45309; letter-spacing: 2px;">
        STAFF-VIP-{{empid}}
      </span>
    </div>
  </div>

  <div style="text-align: center; margin: 26px 0;">
    <a href="{{phishing_url}}" style="background-color: #E11D48; color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 25px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(225, 29, 72, 0.3);">
      รับสิทธิ์ซื้อสินค้า / Claim Voucher
    </a>
  </div>

  <p style="color: #9F1239; font-size: 11px; text-align: center; margin: 0;">
    *คูปองมีจำนวนจำกัด และจะหมดอายุภายใน {{current_date}} / Limited quota expires on {{current_date}}
  </p>
</div>
`,
    bodyText: 'มอบคูปองสวัสดิการช้อปปิ้งพนักงานลดสูงสุด 70% / Claim Staff Voucher: {{phishing_url}}',
    isPreset: true
  }
];

export const OFFICIAL_LANDING_PRESETS = [
  {
    name: 'Company SSO Password Reset Portal',
    pageTitle: 'Single Sign-On | Password Reset Service',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png',
    headerText: 'เข้าสู่ระบบเพื่อรีเซ็ตรหัสผ่าน',
    subHeaderText: 'กรุณายืนยันตัวตนด้วยบัญชีองค์กรของท่าน',
    submitButtonText: 'ยืนยันและเข้าสู่ระบบ',
    showEmpIdField: true,
    showEmailField: true,
    showPasswordField: true,
    postSubmitAction: 'AWARENESS_PAGE',
    awarenessContent: `
<h2>คุณตกเป็นเป้าหมายของการทดสอบ Phishing ภายในองค์กร!</h2>
<p>นี่เป็นการจำลองสถานการณ์ความมั่นคงปลอดภัยไซเบอร์ ข้อมูลของคุณ<strong>ไม่ได้รับความเสียหายและไม่มีการบันทึกรหัสผ่านจริง</strong></p>
<div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <h3>จุดสังเกตที่คุณควรระวังในอนาคต:</h3>
  <ul>
    <li>ตรวจสอบชื่อโดเมนในช่อง URL ก่อนพิมพ์รหัสผ่านเสมอ</li>
    <li>ฝ่าย IT จะไม่มีนโยบายส่งอีเมลเร่งด่วนบังคับให้กดลิงก์เปลี่ยนรหัสผ่านทันที</li>
    <li>สังเกตชื่อผู้ส่งและ Sender Address ว่าตรงกับขององค์กรจริงหรือไม่</li>
  </ul>
</div>
`,
    isPreset: true
  },
  {
    name: 'Microsoft 365 Login Clone',
    pageTitle: 'Sign in to your Microsoft account',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    headerText: 'Sign in',
    subHeaderText: 'to continue to Microsoft 365',
    submitButtonText: 'Next',
    showEmpIdField: false,
    showEmailField: true,
    showPasswordField: true,
    postSubmitAction: 'AWARENESS_PAGE',
    awarenessContent: `
<h2>Security Simulation Notice</h2>
<p>You have participated in an authorized security awareness exercise. <strong>No real credentials were stored.</strong></p>
<p>Always verify the URL matches <code>login.microsoftonline.com</code> before entering your company credentials.</p>
`,
    isPreset: true
  }
];

/**
 * Seeds built-in official presets if they don't already exist
 */
export async function seedOfficialPresets(): Promise<void> {
  for (const preset of OFFICIAL_EMAIL_PRESETS) {
    const exists = await prisma.emailTemplate.findFirst({ where: { name: preset.name } });
    if (!exists) {
      await prisma.emailTemplate.create({ data: preset });
    }
  }

  for (const preset of OFFICIAL_LANDING_PRESETS) {
    const exists = await prisma.landingPageTemplate.findFirst({ where: { name: preset.name } });
    if (!exists) {
      await prisma.landingPageTemplate.create({ data: preset });
    }
  }

  console.log('[Presets] Official email and landing page templates verified.');
}
