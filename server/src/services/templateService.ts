import Handlebars from 'handlebars';
import { prisma } from '../prisma.js';

export interface TemplateVariables {
  name?: string;
  email?: string;
  department?: string;
  empid?: string;
  phishing_url?: string;
  report_url?: string;
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
    current_date: variables.current_date || new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  };
  return template(enrichedVariables);
}

/**
 * Standard security footer with reporting link for all simulation emails
 */
const SECURITY_FOOTER_HTML = `
  <div style="margin-top: 28px; padding-top: 14px; border-top: 1px dashed #D1D5DB; font-size: 11px; color: #6B7280; text-align: center; line-height: 1.5;">
    อีเมลฉบับนี้ส่งถึง {{email}} สำหรับการติดต่อภายในองค์กร<br>
    หากท่านสงสัยว่าอีเมลนี้เป็นฟิชชิ่งหรือไม่พึงประสงค์ 
    <a href="{{report_url}}" style="color: #059669; font-weight: 600; text-decoration: underline;">คลิกที่นี่เพื่อรายงานฝ่าย IT Security</a>
  </div>
`;

/**
 * Default Official System Presets (Rewritten to sound natural, authentic, and convincing)
 */
export const OFFICIAL_EMAIL_PRESETS = [
  // 1. IT Urgent Password Expiry (Authentic Thai Corporate Tone)
  {
    name: 'IT Urgent Password Expiry',
    subject: '[ด่วนที่สุด] แจ้งเตือนรหัสผ่านบัญชีอีเมลองค์กรหมดอายุ (เหลือเวลา 24 ชม.)',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px; background-color: #ffffff;">
  <div style="display: flex; align-items: center; border-bottom: 2px solid #2563EB; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="background-color: #EFF6FF; padding: 8px 12px; border-radius: 6px;">
      <span style="color: #1D4ED8; font-weight: 700; font-size: 16px;">IT Service Desk & Identity Management</span>
    </div>
  </div>

  <p style="color: #1E293B; font-size: 15px; margin: 0 0 14px 0;">
    เรียนคุณ <strong>{{name}}</strong> (แผนก {{department}} / รหัสพนักงาน: {{empid}}),
  </p>

  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
    ระบบตรวจพบว่ารหัสผ่านประจำตัวของท่านกำลังจะหมดอายุตามรอบรักษาความปลอดภัย 90 วัน ในวันที่ <strong>{{current_date}} เวลา 23:59 น.</strong>
  </p>

  <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.5;">
      ⚠️ <strong>ผลกระทบ:</strong> หากไม่ทำการต่ออายุภายในกำหนด บัญชีอีเมล, ระบบสารบรรณ, และการเข้าถึงไฟล์แชร์ส่วนกลางจะถูกระงับการเชื่อมต่อชั่วคราวโดยอัตโนมัติ
    </p>
  </div>

  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
    ขอความกรุณาดำเนินการยืนยันตัวตนเพื่อตั้งรหัสผ่านชุดใหม่ผ่านพอร์ทัล Single Sign-On ของบริษัท:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{phishing_url}}" style="background-color: #2563EB; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
      ต่ออายุและเปลี่ยนรหัสผ่านทันที
    </a>
  </div>

  <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
    ขอแสดงความนับถือ,<br>
    <strong>ฝ่ายบริหารระบบสารสนเทศและโครงสร้างพื้นฐาน (IT Infrastructure)</strong><br>
    โทรศัพท์ภายใน: 1100-1102 (เวลาทำการ 08:30 - 17:30 น.)
  </p>

  ${SECURITY_FOOTER_HTML}
</div>
`,
    bodyText: 'แจ้งเตือนรหัสผ่านบัญชีองค์กรจะหมดอายุในวันที่ {{current_date}} กรุณาต่ออายุผ่านระบบ: {{phishing_url}} หรือรายงาน: {{report_url}}',
    isPreset: true
  },

  // 2. HR Annual Bonus & Payroll Slip (Authentic Corporate HR Tone)
  {
    name: 'HR Annual Bonus & Payroll Review',
    subject: '[ประกาศส่วนบุคคล] สรุปเอกสารสลิปเงินเดือนและโบนัสประจำรอบปีการประเมิน',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px; background-color: #ffffff;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px;">
    <h3 style="color: #065F46; margin: 0; font-size: 17px;">ฝ่ายทรัพยากรบุคคลและบริหารงานบุคคล (Human Resources Department)</h3>
    <span style="font-size: 12px; color: #64748B;">บันทึกข้อความภายใน: เอกสารความลับเฉพาะบุคคล</span>
  </div>

  <p style="color: #1E293B; font-size: 15px; margin: 0 0 14px 0;">
    เรียนคุณ <strong>{{name}}</strong>,
  </p>

  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
    ฝ่ายทรัพยากรบุคคลขอแจ้งสรุปยอดการปรับอัตราเงินเดือน ผลการประเมินความดีความชอบ (KPI Review) และเงินรางวัลโบนัสประจำรอบปีของพนักงานสังกัดแผนก <strong>{{department}}</strong> เป็นรายบุคคลเรียบร้อยแล้ว
  </p>

  <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; padding: 14px 18px; border-radius: 6px; margin: 18px 0;">
    <div style="font-size: 13px; color: #166534; font-weight: 600; margin-bottom: 4px;">สรุปรายการเอกสารที่พร้อมตรวจสอบ:</div>
    <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #166534; line-height: 1.6;">
      <li>ใบแจ้งสรุปรายได้และสิทธิประโยชน์ (e-Salary Slip)</li>
      <li>สิทธิวันลาพักร้อนสะสมที่ยกยอดไปปีถัดไป</li>
    </ul>
  </div>

  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
    ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบเอกสารยอดสุทธิและดาวน์โหลดไฟล์ PDF ส่วนบุคคลได้ที่ลิงก์ด้านล่าง:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{phishing_url}}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
      เปิดดูสลิปเงินเดือนและโบนัสส่วนบุคคล
    </a>
  </div>

  <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
    <em>หมายเหตุ: ข้อมูลนี้เป็นความลับเฉพาะท่าน ห้ามเปิดเผยหรือส่งต่อให้บุคคลภายนอก</em><br>
    ฝ่ายทรัพยากรบุคคล (Compensation & Benefits Section)
  </p>

  ${SECURITY_FOOTER_HTML}
</div>
`,
    bodyText: 'สรุปเอกสารผลตอบแทนและโบนัสส่วนบุคคล ตรวจสอบได้ที่: {{phishing_url}} หรือรายงาน: {{report_url}}',
    isPreset: true
  },

  // 3. Microsoft 365 Unusual Sign-in Activity (Realistic Cloud Alert)
  {
    name: 'Microsoft 365 Unusual Sign-in Activity',
    subject: 'Microsoft Security: ตรวจพบการเข้าสู่ระบบที่น่าสงสัยในบัญชี {{email}}',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #D1D5DB; border-radius: 6px; background-color: #ffffff;">
  <div style="margin-bottom: 20px;">
    <span style="font-size: 20px; font-weight: 700; color: #0078D4;">Microsoft</span>
    <span style="font-size: 14px; color: #6B7280; margin-left: 8px;">Security Notification</span>
  </div>

  <h3 style="color: #D83B01; font-size: 18px; margin: 0 0 10px 0;">ตรวจพบกิจกรรมการลงชื่อเข้าใช้ที่ผิดปกติ</h3>
  
  <p style="color: #24292F; font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
    ระบบความปลอดภัย Microsoft 365 ตรวจพบการพยายามลงชื่อเข้าใช้บัญชีของคุณ <strong>{{email}}</strong> จากสถานที่และอุปกรณ์ที่ไม่คุ้นเคย:
  </p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; color: #374151; background: #F9FAFB; border-radius: 6px; border: 1px solid #E5E7EB;">
    <tr><td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; width: 120px;"><strong>วันและเวลา:</strong></td><td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB;">{{current_date}} เวลา 03:42 น. (UTC+7)</td></tr>
    <tr><td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB;"><strong>ตำแหน่งที่ตั้ง:</strong></td><td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; color: #DC2626; font-weight: 600;">Hanoi, Vietnam (IP: 14.162.180.95)</td></tr>
    <tr><td style="padding: 10px 14px;"><strong>อุปกรณ์ / เบราว์เซอร์:</strong></td><td style="padding: 10px 14px;">Windows 10 &bull; Chrome Browser</td></tr>
  </table>

  <p style="color: #374151; font-size: 13px; line-height: 1.5; margin: 0 0 18px 0;">
    หากนี่ไม่ใช่การดำเนินการของคุณ มีความเป็นไปได้ที่บุคคลอื่นกำลังพยายามเข้าถึงกล่องจดหมายและไฟล์ OneDrive ของคุณ กรุณาตรวจสอบกิจกรรมทันทีเพื่อปกป้องบัญชี:
  </p>

  <div style="margin: 22px 0;">
    <a href="{{phishing_url}}" style="background-color: #0078D4; color: #ffffff; padding: 11px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px; display: inline-block;">
      ตรวจสอบและกู้คืนความปลอดภัยบัญชี
    </a>
  </div>

  <p style="color: #6B7280; font-size: 11px; margin-top: 20px;">
    อีเมลแจ้งเตือนนี้สร้างขึ้นโดยระบบรักษาความปลอดภัย Microsoft Defender อัตโนมัติสำหรับบัญชีโดเมนองค์กร
  </p>

  ${SECURITY_FOOTER_HTML}
</div>
`,
    bodyText: 'Microsoft ตรวจพบการลงชื่อเข้าใช้ผิดปกติในบัญชีของคุณ ตรวจสอบทันที: {{phishing_url}} หรือรายงาน: {{report_url}}',
    isPreset: true
  },

  // 4. Finance / Accounting: e-Tax Invoice & Payment Notification (High-Risk BEC Target)
  {
    name: 'Finance e-Tax Invoice & Overdue Notice',
    subject: '[แจ้งเตือนยอดค้างชำระ] ใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice) ประจำงวด {{current_date}}',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px; background-color: #ffffff;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3B82F6; padding-bottom: 12px; margin-bottom: 18px;">
    <div>
      <span style="font-size: 16px; font-weight: 700; color: #1E3A8A;">แผนกการเงินและการบัญชีกลาง (Corporate Finance)</span>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748B;">ระบบส่งมอบใบเสร็จ/ใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice by e-Mail)</p>
    </div>
  </div>

  <p style="color: #1E293B; font-size: 14px; margin: 0 0 12px 0;">
    เรียนผู้มีอำนาจสั่งจ่าย / เจ้าหน้าที่ฝ่ายจัดซื้อและฝ่ายการเงิน (คุณ {{name}} - {{department}}),
  </p>

  <p style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0 0 14px 0;">
    ระบบตรวจสอบพบเอกสารใบแจ้งหนี้ / ใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice & Receipt) เลขที่อ้างอิง <strong>INV-{{current_date}}-9842</strong> มีกำหนดชำระครบกำหนดในสัปดาห์นี้
  </p>

  <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 6px; margin: 16px 0;">
    <table style="width: 100%; font-size: 13px; color: #334155;">
      <tr><td style="padding: 4px 0;"><strong>รายการ:</strong></td><td>ค่าบริการโครงสร้างพื้นฐานไอทีและซอฟต์แวร์รายไตรมาส</td></tr>
      <tr><td style="padding: 4px 0;"><strong>ยอดสุทธิ (รวมภาษี 7%):</strong></td><td style="color: #B91C1C; font-weight: 700;">148,500.00 บาท</td></tr>
      <tr><td style="padding: 4px 0;"><strong>สถานะเอกสาร:</strong></td><td><span style="background: #FEE2E2; color: #991B1B; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">รอตรวจสอบยอดและยืนยัน</span></td></tr>
    </table>
  </div>

  <p style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0;">
    กรุณาเข้าสู่ระบบบัญชีการเงินอิเล็กทรอนิกส์เพื่อตรวจสอบรายละเอียดคู่สัญญา ลายมือชื่อดิจิทัล (Digital Signature) และดาวน์โหลดเอกสารต้นฉบับ:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{phishing_url}}" style="background-color: #1E40AF; color: #ffffff; padding: 11px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
      เข้าสู่ระบบตรวจสอบเอกสารใบกำกับภาษี (e-Tax Portal)
    </a>
  </div>

  <p style="color: #64748B; font-size: 11px; line-height: 1.5; margin: 18px 0 0 0;">
    หากท่านดำเนินการวางบิลแล้ว กรุณาเพิกเฉยต่ออีเมลฉบับนี้ | ติดต่อฝ่ายบัญชีเจ้าหนี้ โทร 02-xxx-xxxx ต่อ 4410
  </p>

  ${SECURITY_FOOTER_HTML}
</div>
`,
    bodyText: 'แจ้งเตือนใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice) ตรวจสอบเอกสาร: {{phishing_url}} หรือรายงาน: {{report_url}}',
    isPreset: true
  },

  // 5. Logistics / Parcel Delivery Hold (High Psychological Hook)
  {
    name: 'Logistics Express Parcel Delivery Hold',
    subject: '[แจ้งเตือนพัสดุด่วนค้างส่ง] เอกสารสำคัญถึงคุณ {{name}} ไม่สามารถนำส่งได้',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px; background-color: #ffffff;">
  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #EA580C; padding-bottom: 12px; margin-bottom: 18px;">
    <div>
      <span style="font-size: 18px; font-weight: 800; color: #C2410C;">EXPRESS LOGISTICS HUB</span>
      <span style="font-size: 12px; color: #78716C; margin-left: 6px;">&bull; ฝ่ายรับ-ส่งเอกสารพัสดุส่วนกลาง</span>
    </div>
  </div>

  <p style="color: #1C1917; font-size: 14px; margin: 0 0 12px 0;">
    เรียนคุณ <strong>{{name}}</strong> (แผนก {{department}}),
  </p>

  <p style="color: #44403C; font-size: 13px; line-height: 1.6; margin: 0 0 14px 0;">
    เจ้าหน้าที่คัดแยกพัสดุส่วนกลางขอแจ้งให้ทราบว่า มีซองพัสดุเอกสารด่วนส่งตรงถึงท่าน หมายเลขติดตาม <strong>TH-DOC-{{empid}}-88X</strong> แต่ไม่สามารถนำส่งขึ้นไปที่โต๊ะทำงานได้ เนื่องจากข้อมูลชั้นหรือเบอร์โทรศัพท์ภายในไม่ชัดเจน
  </p>

  <div style="background-color: #FFF7ED; border-left: 4px solid #F97316; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; color: #9A3412; font-size: 13px;">
      📦 <strong>สถานะพัสดุ:</strong> พัสดุตกค้างอยู่ที่จุดรับเอกสารชั้น 1 (จะถูกตีกลับผู้ส่งภายใน 48 ชั่วโมง)
    </p>
  </div>

  <p style="color: #44403C; font-size: 13px; line-height: 1.6; margin: 0 0 18px 0;">
    กรุณายืนยันจุดรับพัสดุและระบุข้อมูลผู้รับในระบบรับส่งพัสดุภายใน เพื่อให้เจ้าหน้าที่นำส่งให้อีกครั้งในรอบบ่าย:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{phishing_url}}" style="background-color: #EA580C; color: #ffffff; padding: 11px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
      ยืนยันข้อมูลผู้รับและตำแหน่งนำส่ง
    </a>
  </div>

  <p style="color: #78716C; font-size: 11px; margin-top: 18px;">
    จุดคัดแยกและประสานงานพัสดุภายในองค์กร อาคารสำนักงานใหญ่
  </p>

  ${SECURITY_FOOTER_HTML}
</div>
`,
    bodyText: 'พัสดุเอกสารด่วนค้างส่ง กรุณายืนยันตำแหน่งจัดส่ง: {{phishing_url}} หรือรายงาน: {{report_url}}',
    isPreset: true
  },

  // 6. Microsoft 365 Copilot AI Free Activation (Bilingual Corporate Tone)
  {
    name: 'Microsoft 365 Copilot AI Free Activation (Bilingual)',
    subject: '[สิทธิพิเศษ] เปิดสิทธิ์ใช้งาน Microsoft 365 Copilot AI สำหรับบัญชี {{email}}',
    bodyHtml: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #D1D5DB; border-radius: 8px; background-color: #ffffff;">
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; border-bottom: 2px solid #0078D4; padding-bottom: 10px;">
    <span style="font-size: 20px; font-weight: 700; color: #0078D4;">Microsoft 365</span>
    <span style="font-size: 12px; font-weight: 600; color: #5C2D91; background: #F3E8FF; padding: 3px 8px; border-radius: 4px;">Copilot Enterprise</span>
  </div>
  
  <p style="color: #1F2937; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">
    แจ้งสิทธิ์เปิดใช้งานระบบผู้ช่วยปัญญาประดิษฐ์ Copilot AI ประจำแผนก
  </p>

  <p style="color: #374151; font-size: 13px; line-height: 1.6; margin: 0 0 10px 0;">
    เรียนคุณ <strong>{{name}}</strong> (แผนก {{department}}),
  </p>

  <p style="color: #374151; font-size: 13px; line-height: 1.6; margin: 0 0 14px 0;">
    ฝ่ายเทคโนโลยีสารสนเทศได้ทำการจัดสรรสิทธิ์การใช้งาน <strong>Microsoft 365 Copilot (Enterprise AI)</strong> เพื่อช่วยสรุปรายงาน วิเคราะห์ข้อมูล Excel และร่างเอกสารสำหรับพนักงานในแผนกของท่านโดยไม่มีค่าใช้จ่าย
  </p>

  <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; color: #166534; font-size: 12px; font-weight: 600;">
      ⚡ เงื่อนไข: สิทธิ์การใช้งานมีจำกัด กรุณายืนยันการเปิดใช้งานภายใน 48 ชั่วโมง เพื่อสงวนสิทธิ์ไม่ให้ถูกโอนย้ายไปยังแผนกอื่น
    </p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{phishing_url}}" style="background-color: #0078D4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
      เปิดใช้งานสิทธิ์ Copilot AI ทันที
    </a>
  </div>

  <p style="color: #6B7280; font-size: 11px; margin-top: 18px; border-top: 1px solid #E5E7EB; padding-top: 12px;">
    ฝ่ายพัฒนานวัตกรรมดิจิทัลองค์กร (Digital Transformation Committee)
  </p>

  ${SECURITY_FOOTER_HTML}
</div>
`,
    bodyText: 'เปิดใช้งาน Microsoft 365 Copilot AI ฟรี: {{phishing_url}} หรือรายงาน: {{report_url}}',
    isPreset: true
  }
];

/**
 * Default Official Landing Page Presets (Upgraded with realistic matched portals & rich educational Red Flags)
 */
export const OFFICIAL_LANDING_PRESETS = [
  // 1. Company SSO Password Reset Portal
  {
    name: 'Company SSO Password Reset Portal',
    pageTitle: 'Single Sign-On | Corporate Identity Portal',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png',
    headerText: 'เข้าสู่ระบบเพื่อยืนยันตัวตนและรีเซ็ตรหัสผ่าน',
    subHeaderText: 'กรุณายืนยันข้อมูลประจำตัวองค์กรเพื่อความปลอดภัย',
    submitButtonText: 'ยืนยันและเข้าสู่ระบบ',
    showEmpIdField: true,
    showEmailField: true,
    showPasswordField: true,
    postSubmitAction: 'AWARENESS_PAGE',
    awarenessContent: `
<div style="text-align: left; max-width: 620px; margin: 0 auto;">
  <div style="background: #FEF2F2; border-left: 5px solid #EF4444; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="color: #991B1B; margin: 0 0 6px 0; font-size: 18px;">⚠️ คุณเพิ่งเผลอกรอกข้อมูลลงในหน้าจำลอง Phishing!</h3>
    <p style="color: #7F1D1D; font-size: 14px; line-height: 1.5; margin: 0;">
      ไม่ต้องกังวล นี่เป็นการทดสอบความตระหนักรู้ด้านความปลอดภัยไซเบอร์ (Cybersecurity Simulation) ขององค์กร <strong>รหัสผ่านจริงของคุณไม่ถูกบันทึกและปลอดภัย 100%</strong>
    </p>
  </div>

  <h4 style="color: #1E293B; margin: 20px 0 10px 0; font-size: 15px;">จุดสังเกตสำคัญ (Red Flags) ที่คุณควรระวังในอนาคต:</h4>
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.7; color: #334155;">
    <div style="margin-bottom: 10px;">
      🚩 <strong>แถบที่อยู่ URL บนเบราว์เซอร์:</strong> หน้าเว็บนี้ไม่ได้อยู่บนโดเมนทางการขององค์กร ให้สังเกตช่อง Address bar เสมอก่อนพิมพ์รหัสผ่าน
    </div>
    <div style="margin-bottom: 10px;">
      🚩 <strong>ความเร่งด่วนที่ผิดปกติ (Urgency):</strong> อีเมลแจ้งว่า "จะหมดอายุใน 24 ชม." หรือ "บัญชีจะถูกระงับ" เป็นจิตวิทยาที่แฮกเกอร์ใช้บีบให้รีบทำโดยไม่ทันคิด
    </div>
    <div>
      🚩 <strong>นโยบาย IT ที่ถูกต้อง:</strong> แผนก IT ตัวจริงจะไม่ส่งลิงก์เพื่อให้กรอกรหัสผ่านเดิมผ่านเว็บภายนอกเด็ดขาด
    </div>
  </div>
</div>
`,
    isPreset: true
  },

  // 2. Microsoft 365 Login Clone
  {
    name: 'Microsoft 365 Login Clone',
    pageTitle: 'Sign in to your Microsoft account',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    headerText: 'ลงชื่อเข้าใช้',
    subHeaderText: 'เพื่อดำเนินการต่อไปยัง Microsoft 365 Corporate',
    submitButtonText: 'ถัดไป',
    showEmpIdField: false,
    showEmailField: true,
    showPasswordField: true,
    postSubmitAction: 'AWARENESS_PAGE',
    awarenessContent: `
<div style="text-align: left; max-width: 620px; margin: 0 auto;">
  <div style="background: #FEF2F2; border-left: 5px solid #EF4444; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="color: #991B1B; margin: 0 0 6px 0; font-size: 18px;">⚠️ นี่คือการจำลองการโจมตี Microsoft 365 Phishing!</h3>
    <p style="color: #7F1D1D; font-size: 14px; line-height: 1.5; margin: 0;">
      คุณได้เข้าสู่หน้าจำลองการหลอกขโมยบัญชี Microsoft 365 เพื่อการฝึกอบรม <strong>ไม่มีการบันทึกรหัสผ่านจริงของคุณ</strong>
    </p>
  </div>

  <h4 style="color: #1E293B; margin: 20px 0 10px 0; font-size: 15px;">วิธีแยกแยะหน้า Microsoft ของจริง vs ของปลอม:</h4>
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.7; color: #334155;">
    <div style="margin-bottom: 10px;">
      🚩 <strong>โดเมนของ Microsoft แท้:</strong> หน้าลงชื่อเข้าใช้ของแท้จะต้องเป็น <code>https://login.microsoftonline.com</code> เท่านั้น ไม่ใช่ IP หรือโดเมนแปลกปลอม
    </div>
    <div style="margin-bottom: 10px;">
      🚩 <strong>การแจ้งเตือนล็อกอินผิดปกติ:</strong> ให้เปิดแอป Microsoft Authenticator หรือเข้าผ่านหน้าพอร์ทัลหลักของบริษัทโดยตรง แทนการคลิกจากอีเมล
    </div>
  </div>
</div>
`,
    isPreset: true
  },

  // 3. Corporate AI Hub Access Portal (Matches AI Templates)
  {
    name: 'Corporate AI Hub Access Portal',
    pageTitle: 'Corporate AI Hub | Sign in with Staff Account',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png',
    headerText: 'เข้าสู่ระบบ Enterprise AI Hub',
    subHeaderText: 'กรุณายืนยันบัญชีพนักงานเพื่อเปิดสิทธิ์ใช้งานระบบ AI',
    submitButtonText: 'ยืนยันสิทธิ์และเข้าสู่ระบบ',
    showEmpIdField: true,
    showEmailField: true,
    showPasswordField: true,
    postSubmitAction: 'AWARENESS_PAGE',
    awarenessContent: `
<div style="text-align: left; max-width: 620px; margin: 0 auto;">
  <div style="background: #FEF2F2; border-left: 5px solid #EF4444; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="color: #991B1B; margin: 0 0 6px 0; font-size: 18px;">⚠️ คุณเผลอกรอกรหัสผ่านในหน้าหลอกลวงสิทธิ์ AI!</h3>
    <p style="color: #7F1D1D; font-size: 14px; line-height: 1.5; margin: 0;">
      นี่คือการจำลองการล่อลวงด้วยหัวข้อทันสมัย (Trend-based Lure) <strong>รหัสผ่านจริงของคุณไม่ถูกบันทึก</strong>
    </p>
  </div>

  <h4 style="color: #1E293B; margin: 20px 0 10px 0; font-size: 15px;">บทเรียนด้านความมั่นคงปลอดภัย:</h4>
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.7; color: #334155;">
    <div style="margin-bottom: 10px;">
      🚩 <strong>เหยื่อล่อสิทธิพิเศษ (Privilege Lure):</strong> มิจฉาชีพมักนำเรื่องเทคโนโลยีใหม่หรือของฟรีมาล่อใจให้รีบกดก่อนหมดโควตา
    </div>
    <div>
      🚩 <strong>การติดตั้งหรือใช้ซอฟต์แวร์ใหม่:</strong> ต้องตรวจสอบผ่านช่องทางประกาศหลัก เช่น Intranet หรือสอบถามแผนก IT โดยตรงเสมอ
    </div>
  </div>
</div>
`,
    isPreset: true
  },

  // 4. e-Tax & Finance Verification Portal (Matches Invoice Template)
  {
    name: 'e-Tax & Finance Document Verification Portal',
    pageTitle: 'e-Tax Invoice Verification & Payment Portal',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/2382/2382461.png',
    headerText: 'ระบบตรวจสอบใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax)',
    subHeaderText: 'กรุณายืนยันตัวตนเพื่อดูเอกสารคู่สัญญาและรายละเอียดการชำระเงิน',
    submitButtonText: 'เข้าสู่ระบบเพื่อดูเอกสาร',
    showEmpIdField: false,
    showEmailField: true,
    showPasswordField: true,
    postSubmitAction: 'AWARENESS_PAGE',
    awarenessContent: `
<div style="text-align: left; max-width: 620px; margin: 0 auto;">
  <div style="background: #FEF2F2; border-left: 5px solid #EF4444; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="color: #991B1B; margin: 0 0 6px 0; font-size: 18px;">⚠️ ระวัง! การโจมตีทางการเงินและการวางบิลปลอม (BEC/Invoice Fraud)</h3>
    <p style="color: #7F1D1D; font-size: 14px; line-height: 1.5; margin: 0;">
      คุณได้เข้าร่วมการทดสอบการหลอกลวงแบบเจาะจงเป้าหมายทางการเงิน <strong>ไม่มีการบันทึกรหัสผ่านจริง</strong>
    </p>
  </div>

  <h4 style="color: #1E293B; margin: 20px 0 10px 0; font-size: 15px;">ข้อควรระวังสำหรับฝ่ายบัญชีและการเงิน:</h4>
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.7; color: #334155;">
    <div style="margin-bottom: 10px;">
      🚩 <strong>ตรวจสอบชื่อผู้ส่ง (Sender):</strong> อีเมลอาจปลอมชื่อหัวจดหมายให้ดูเหมือนบริษัทคู่ค้า แต่ดูที่อยู่อีเมลจริงแล้วไม่ใช่
    </div>
    <div style="margin-bottom: 10px;">
      🚩 <strong>การเปิดไฟล์แนบหรือลิงก์ใบเสร็จ:</strong> แฮกเกอร์มักสร้างลิงก์ให้ล็อกอินก่อนดูไฟล์ เพื่อขโมยบัญชีองค์กรไปใช้ปลอมคำสั่งโอนเงินต่อ
    </div>
  </div>
</div>
`,
    isPreset: true
  }
];

/**
 * Seeds built-in official presets (Upserting so existing systems update to natural wording)
 */
export async function seedOfficialPresets(): Promise<void> {
  for (const preset of OFFICIAL_EMAIL_PRESETS) {
    const exists = await prisma.emailTemplate.findFirst({ where: { name: preset.name } });
    if (!exists) {
      await prisma.emailTemplate.create({ data: preset });
    } else if (exists.isPreset) {
      // Update existing preset to reflect improved natural language and reporting footer
      await prisma.emailTemplate.update({
        where: { id: exists.id },
        data: {
          subject: preset.subject,
          bodyHtml: preset.bodyHtml,
          bodyText: preset.bodyText
        }
      });
    }
  }

  for (const preset of OFFICIAL_LANDING_PRESETS) {
    const exists = await prisma.landingPageTemplate.findFirst({ where: { name: preset.name } });
    if (!exists) {
      await prisma.landingPageTemplate.create({ data: preset });
    } else if (exists.isPreset) {
      await prisma.landingPageTemplate.update({
        where: { id: exists.id },
        data: {
          pageTitle: preset.pageTitle,
          logoUrl: preset.logoUrl,
          headerText: preset.headerText,
          subHeaderText: preset.subHeaderText,
          submitButtonText: preset.submitButtonText,
          showEmpIdField: preset.showEmpIdField,
          showEmailField: preset.showEmailField,
          showPasswordField: preset.showPasswordField,
          postSubmitAction: preset.postSubmitAction,
          awarenessContent: preset.awarenessContent
        }
      });
    }
  }

  console.log('[Presets] Official email and landing page templates verified and updated with natural wording.');
}
