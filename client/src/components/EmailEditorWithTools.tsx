import React, { useState } from 'react';
import { 
  Code2, 
  Palette, 
  PlusCircle, 
  MousePointerClick, 
  AlertTriangle, 
  Tag, 
  Eye, 
  Monitor, 
  Smartphone,
  LayoutTemplate,
  Undo2,
  Redo2,
  Languages
} from 'lucide-react';

interface EmailEditorWithToolsProps {
  name: string;
  subject: string;
  bodyHtml: string;
  onChangeName: (val: string) => void;
  onChangeSubject: (val: string) => void;
  onChangeBodyHtml: (val: string) => void;
}

export const EmailEditorWithTools: React.FC<EmailEditorWithToolsProps> = ({
  name,
  subject,
  bodyHtml,
  onChangeName,
  onChangeSubject,
  onChangeBodyHtml
}) => {
  const [activeMode, setActiveMode] = useState<'tools' | 'html'>('tools');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [templateLang, setTemplateLang] = useState<'th' | 'en' | 'bilingual'>('bilingual');

  // History for Undo / Redo
  const [history, setHistory] = useState<string[]>([bodyHtml || '']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Update HTML with undo/redo history recording
  const updateHtmlWithHistory = (newHtml: string) => {
    const currentSlice = history.slice(0, historyIndex + 1);
    const nextHistory = [...currentSlice, newHtml];
    if (nextHistory.length > 30) nextHistory.shift();
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    onChangeBodyHtml(newHtml);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      onChangeBodyHtml(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onChangeBodyHtml(history[nextIndex]);
    }
  };

  // Interactive Tools Builder State
  const [buttonTextTh, setButtonTextTh] = useState('เปิดใช้งานสิทธิ์ Copilot AI');
  const [buttonTextEn, setButtonTextEn] = useState('Activate Copilot AI License');
  const [buttonUrl, setButtonUrl] = useState('{{phishing_url}}');
  const [buttonColor, setButtonColor] = useState('#0078D4');

  const [alertType, setAlertType] = useState<'warning' | 'danger' | 'info'>('info');
  const [alertTextTh, setAlertTextTh] = useState('โควตาการเข้าถึง AI มีจำกัดเฉพาะพนักงานที่ลงทะเบียนภายใน 48 ชั่วโมง');
  const [alertTextEn, setAlertTextEn] = useState('AI quota is strictly limited to employees who register within 48 hours.');

  const [headerTitleTh, setHeaderTitleTh] = useState('ฝ่ายสารสนเทศและนวัตกรรม AI องค์กร');
  const [headerTitleEn, setHeaderTitleEn] = useState('Corporate IT & AI Innovation Department');
  const [headerSubTh, setHeaderSubTh] = useState('โครงการสนับสนุนการใช้งาน AI สำหรับบุคลากร');
  const [headerSubEn, setHeaderSubEn] = useState('Corporate AI Enablement Program for Staff');

  // Append block to HTML with history
  const appendBlock = (htmlBlock: string) => {
    const updated = bodyHtml ? `${bodyHtml}\n\n${htmlBlock}` : htmlBlock;
    updateHtmlWithHistory(updated);
  };

  const insertVariable = (varName: string) => {
    const updated = `${bodyHtml || ''}${varName}`;
    updateHtmlWithHistory(updated);
  };

  // Block Generator Presets supporting Bilingual / TH / EN
  const addActionBtn = () => {
    let label = buttonTextTh;
    if (templateLang === 'en') label = buttonTextEn;
    if (templateLang === 'bilingual') label = `${buttonTextTh} / ${buttonTextEn}`;

    const btnHtml = `
<div style="text-align: center; margin: 28px 0;">
  <a href="${buttonUrl}" style="background-color: ${buttonColor}; color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; font-family: 'Segoe UI', Tahoma, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    ${label}
  </a>
</div>`;
    appendBlock(btnHtml);
  };

  const addAlertBanner = () => {
    const bgColors = { warning: '#FEF3C7', danger: '#FEE2E2', info: '#EFF6FF' };
    const borderColors = { warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' };
    const textColors = { warning: '#92400E', danger: '#991B1B', info: '#1E40AF' };

    let content = `<p style="margin: 0; color: ${textColors[alertType]}; font-size: 14px; font-weight: 600; line-height: 1.5;">⚠️ ${alertTextTh}</p>`;
    if (templateLang === 'en') {
      content = `<p style="margin: 0; color: ${textColors[alertType]}; font-size: 14px; font-weight: 600; line-height: 1.5;">⚠️ ${alertTextEn}</p>`;
    } else if (templateLang === 'bilingual') {
      content = `
  <p style="margin: 0 0 4px 0; color: ${textColors[alertType]}; font-size: 14px; font-weight: 600; line-height: 1.5;">⚠️ ${alertTextTh}</p>
  <p style="margin: 0; color: ${textColors[alertType]}; font-size: 12px; font-style: italic; opacity: 0.9;">(${alertTextEn})</p>`;
    }

    const bannerHtml = `
<div style="background-color: ${bgColors[alertType]}; border-left: 4px solid ${borderColors[alertType]}; padding: 14px 18px; margin: 18px 0; border-radius: 4px; font-family: 'Segoe UI', Tahoma, sans-serif;">
${content}
</div>`;
    appendBlock(bannerHtml);
  };

  const addHeaderCard = () => {
    let titleHtml = `<h2 style="color: #1F2937; margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">${headerTitleTh}</h2>`;
    let subHtml = `<p style="color: #6B7280; font-size: 13px; margin: 0;">${headerSubTh}</p>`;

    if (templateLang === 'en') {
      titleHtml = `<h2 style="color: #1F2937; margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">${headerTitleEn}</h2>`;
      subHtml = `<p style="color: #6B7280; font-size: 13px; margin: 0;">${headerSubEn}</p>`;
    } else if (templateLang === 'bilingual') {
      titleHtml = `
  <h2 style="color: #1F2937; margin: 0 0 2px 0; font-size: 18px; font-weight: 700;">${headerTitleTh}</h2>
  <div style="color: #4B5563; font-size: 13px; font-weight: 600; margin-bottom: 6px;">${headerTitleEn}</div>`;
      subHtml = `<p style="color: #6B7280; font-size: 12px; margin: 0;">${headerSubTh} / ${headerSubEn}</p>`;
    }

    const headerHtml = `
<div style="border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 20px; font-family: 'Segoe UI', Tahoma, sans-serif;">
${titleHtml}
${subHtml}
</div>`;
    appendBlock(headerHtml);
  };

  const addGreetingParagraph = () => {
    let greetingHtml = '';
    if (templateLang === 'th') {
      greetingHtml = `
<p style="color: #374151; font-size: 15px; line-height: 1.6; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 16px 0;">
  เรียนคุณ <strong>{{name}}</strong> (แผนก {{department}} - รหัสพนักงาน: {{empid}}),
</p>
<p style="color: #374151; font-size: 15px; line-height: 1.6; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 16px 0;">
  ตามนโยบายรักษาความมั่นคงปลอดภัยสารสนเทศ ขอความร่วมมือท่านทำการตรวจสอบความถูกต้องของข้อมูลบัญชีผู้ใช้...
</p>`;
    } else if (templateLang === 'en') {
      greetingHtml = `
<p style="color: #374151; font-size: 15px; line-height: 1.6; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 16px 0;">
  Dear <strong>{{name}}</strong> (Dept: {{department}} - Staff ID: {{empid}}),
</p>
<p style="color: #374151; font-size: 15px; line-height: 1.6; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 16px 0;">
  In accordance with our corporate IT security policies, you are required to verify and update your account details...
</p>`;
    } else {
      greetingHtml = `
<div style="font-family: 'Segoe UI', Tahoma, sans-serif; margin: 16px 0; color: #374151; line-height: 1.6;">
  <p style="margin: 0 0 6px 0; font-size: 15px;">
    เรียนคุณ <strong>{{name}}</strong> (แผนก {{department}} - รหัสพนักงาน: {{empid}}) / <br>
    <span style="color: #6B7280; font-size: 13px;">Dear {{name}} (Department: {{department}} - Staff ID: {{empid}}),</span>
  </p>
  <p style="margin: 12px 0 6px 0; font-size: 14px;">
    ตามนโยบายรักษาความมั่นคงปลอดภัยสารสนเทศ ขอความร่วมมือท่านทำการตรวจสอบความถูกต้องของข้อมูลบัญชีผู้ใช้...
  </p>
  <p style="margin: 0; font-size: 13px; color: #6B7280; font-style: italic;">
    Please verify your corporate credentials to prevent temporary suspension of account privileges.
  </p>
</div>`;
    }
    appendBlock(greetingHtml);
  };

  const addSecurityFooter = () => {
    let footerHtml = '';
    if (templateLang === 'th') {
      footerHtml = `
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Tahoma, sans-serif;">
  <p style="margin: 0 0 6px 0;">อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ สำหรับ {{email}} เท่านั้น</p>
  <p style="margin: 0;">หากปุ่มด้านบนไม่ทำงาน ท่านสามารถเปิดลิงก์: <a href="{{phishing_url}}" style="color: #2563EB;">{{phishing_url}}</a></p>
</div>`;
    } else if (templateLang === 'en') {
      footerHtml = `
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Tahoma, sans-serif;">
  <p style="margin: 0 0 6px 0;">This email was sent automatically to {{email}}. Please do not forward.</p>
  <p style="margin: 0;">If the button above does not work, visit: <a href="{{phishing_url}}" style="color: #2563EB;">{{phishing_url}}</a></p>
</div>`;
    } else {
      footerHtml = `
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px; line-height: 1.5; font-family: 'Segoe UI', Tahoma, sans-serif;">
  <p style="margin: 0 0 4px 0;">อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ สำหรับ {{email}} เท่านั้น (Confidential / Auto-generated for {{email}})</p>
  <p style="margin: 0;">Direct URL: <a href="{{phishing_url}}" style="color: #2563EB;">{{phishing_url}}</a></p>
</div>`;
    }
    appendBlock(footerHtml);
  };

  const addDivider = () => {
    appendBlock('<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />');
  };

  // Mock template rendering for live preview
  const livePreviewHtml = (bodyHtml || '')
    .replace(/\{\{name\}\}/g, 'สมชาย ใจมั่นคง (Somchai J.)')
    .replace(/\{\{email\}\}/g, 'somchai.j@company.com')
    .replace(/\{\{department\}\}/g, 'IT & Information Security')
    .replace(/\{\{empid\}\}/g, 'EMP-90214')
    .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('th-TH'))
    .replace(/\{\{phishing_url\}\}/g, '#sample-phish-click');

  return (
    <div className="space-y-4">
      {/* Title & Subject */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium text-gray-700 mb-1 text-xs">ชื่อเทมเพลต (Template Name)</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => onChangeName(e.target.value)}
            placeholder="เช่น M365 Copilot AI License (Bilingual)"
            className="w-full p-2.5 border border-stone-border rounded-xl text-xs outline-none focus:border-forest"
          />
        </div>
        <div>
          <label className="block font-medium text-gray-700 mb-1 text-xs">หัวเรื่องอีเมล (Subject Line)</label>
          <input
            type="text"
            required
            value={subject}
            onChange={e => onChangeSubject(e.target.value)}
            placeholder="เช่น [สิทธิ์พิเศษ / Special Privilege] เปิดใช้งาน Microsoft 365 Copilot AI ฟรี"
            className="w-full p-2.5 border border-stone-border rounded-xl text-xs outline-none focus:border-forest"
          />
        </div>
      </div>

      {/* Language Switcher Bar & Dynamic Variables */}
      <div className="bg-stone-muted/50 p-2.5 rounded-xl border border-stone-border/60 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-stone-border/40">
          <div className="flex items-center space-x-1.5 text-xs text-deep-slate font-semibold">
            <Languages className="w-3.5 h-3.5 text-forest" />
            <span>ภาษาสำหรับบล็อกเนื้อหา (Block Language Mode):</span>
          </div>
          <div className="flex space-x-1 bg-white p-1 rounded-lg border border-stone-border">
            <button
              type="button"
              onClick={() => setTemplateLang('bilingual')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                templateLang === 'bilingual' ? 'bg-forest text-white shadow-xs' : 'text-gray-600 hover:text-deep-slate'
              }`}
            >
              🌐 สองภาษา (Bilingual TH/EN)
            </button>
            <button
              type="button"
              onClick={() => setTemplateLang('th')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                templateLang === 'th' ? 'bg-forest text-white shadow-xs' : 'text-gray-600 hover:text-deep-slate'
              }`}
            >
              🇹🇭 ภาษาไทย (Thai Only)
            </button>
            <button
              type="button"
              onClick={() => setTemplateLang('en')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                templateLang === 'en' ? 'bg-forest text-white shadow-xs' : 'text-gray-600 hover:text-deep-slate'
              }`}
            >
              🇬🇧 English Only
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-deep-slate font-semibold">
            <Tag className="w-3.5 h-3.5 text-forest" />
            <span>คลิกแทรกตัวแปร (Assign Dynamic Value):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { tag: '{{name}}', label: 'ชื่อพนักงาน' },
              { tag: '{{email}}', label: 'อีเมล' },
              { tag: '{{department}}', label: 'แผนก' },
              { tag: '{{empid}}', label: 'รหัสพนักงาน' },
              { tag: '{{phishing_url}}', label: 'ลิงก์เป้าหมาย' },
              { tag: '{{current_date}}', label: 'วันที่ปัจจุบัน' }
            ].map(v => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertVariable(v.tag)}
                title={`แทรก ${v.label}`}
                className="px-2.5 py-1 bg-white hover:bg-forest hover:text-white text-forest text-[11px] font-mono font-medium rounded-lg border border-forest/20 shadow-xs transition-all flex items-center space-x-1"
              >
                <span>+</span>
                <span className="font-semibold">{v.tag}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Header: Tabs & Undo/Redo Controls */}
      <div className="flex items-center justify-between border-b border-stone-border pb-2">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveMode('tools')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'tools'
                  ? 'bg-forest text-white shadow-soft'
                  : 'text-gray-600 hover:bg-stone-muted border border-stone-border'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>🎨 Visual Tools (บล็อกเครื่องมือ)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('html')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'html'
                  ? 'bg-forest text-white shadow-soft'
                  : 'text-gray-600 hover:bg-stone-muted border border-stone-border'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>💻 Raw HTML Code (แก้ไขโค้ด)</span>
            </button>
          </div>

          {/* Undo / Redo Buttons */}
          <div className="flex items-center space-x-1 border-l border-stone-border pl-3">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                historyIndex > 0
                  ? 'border-stone-border text-gray-700 hover:bg-stone-muted cursor-pointer'
                  : 'border-transparent text-gray-300 cursor-not-allowed'
              }`}
              title="กดย้อนกลับ (Undo)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>ย้อนกลับ</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                historyIndex < history.length - 1
                  ? 'border-stone-border text-gray-700 hover:bg-stone-muted cursor-pointer'
                  : 'border-transparent text-gray-300 cursor-not-allowed'
              }`}
              title="ทำซ้ำ (Redo)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>ทำซ้ำ</span>
            </button>
          </div>
        </div>

        {/* Live Preview Device Toggle */}
        <div className="flex items-center space-x-1 bg-stone-muted p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`p-1.5 rounded-lg text-xs ${previewDevice === 'desktop' ? 'bg-white shadow-xs text-deep-slate' : 'text-gray-500'}`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={`p-1.5 rounded-lg text-xs ${previewDevice === 'mobile' ? 'bg-white shadow-xs text-deep-slate' : 'text-gray-500'}`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace (Editor Left, Live Preview Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Tools or HTML (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {activeMode === 'tools' ? (
            <div className="space-y-3 bg-stone-50/70 p-3.5 rounded-2xl border border-stone-border max-h-[480px] overflow-y-auto">
              
              {/* Tool Block 1: Call to Action Button */}
              <div className="bg-white p-3 rounded-xl border border-stone-border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-deep-slate text-xs flex items-center space-x-1.5">
                    <MousePointerClick className="w-4 h-4 text-forest" />
                    <span>สร้างปุ่มกด Action ({templateLang === 'bilingual' ? 'สองภาษา' : templateLang.toUpperCase()})</span>
                  </span>
                  <button
                    type="button"
                    onClick={addActionBtn}
                    className="flex items-center space-x-1 px-3 py-1 bg-forest text-white rounded-lg text-[11px] font-semibold hover:bg-forest-hover shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>แทรกลงอีเมล</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="col-span-2 space-y-1.5">
                    <input
                      type="text"
                      value={buttonTextTh}
                      onChange={e => setButtonTextTh(e.target.value)}
                      placeholder="ข้อความไทย (TH)"
                      className="w-full p-2 border border-stone-border rounded-lg text-xs outline-none focus:border-forest"
                    />
                    <input
                      type="text"
                      value={buttonTextEn}
                      onChange={e => setButtonTextEn(e.target.value)}
                      placeholder="ข้อความอังกฤษ (EN)"
                      className="w-full p-2 border border-stone-border rounded-lg text-xs outline-none focus:border-forest text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">สีปุ่ม</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="color"
                        value={buttonColor}
                        onChange={e => setButtonColor(e.target.value)}
                        className="w-7 h-7 p-0.5 border border-stone-border rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-gray-600">{buttonColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool Block 2: Alert Box / Warning Banner */}
              <div className="bg-white p-3 rounded-xl border border-stone-border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-deep-slate text-xs flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-terracotta" />
                    <span>กล่องแจ้งเตือนด่วน (Alert Banner)</span>
                  </span>
                  <button
                    type="button"
                    onClick={addAlertBanner}
                    className="flex items-center space-x-1 px-3 py-1 bg-forest text-white rounded-lg text-[11px] font-semibold hover:bg-forest-hover shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>แทรกลงอีเมล</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="col-span-2 space-y-1.5">
                    <input
                      type="text"
                      value={alertTextTh}
                      onChange={e => setAlertTextTh(e.target.value)}
                      placeholder="ข้อความเตือนภาษาไทย"
                      className="w-full p-2 border border-stone-border rounded-lg text-xs outline-none focus:border-forest"
                    />
                    <input
                      type="text"
                      value={alertTextEn}
                      onChange={e => setAlertTextEn(e.target.value)}
                      placeholder="Warning text in English"
                      className="w-full p-2 border border-stone-border rounded-lg text-xs outline-none focus:border-forest text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">ประเภทแจ้งเตือน</label>
                    <select
                      value={alertType}
                      onChange={e => setAlertType(e.target.value as any)}
                      className="w-full p-2 border border-stone-border rounded-lg text-xs outline-none focus:border-forest bg-white"
                    >
                      <option value="info">น้ำเงิน - ประชาสัมพันธ์ (Info)</option>
                      <option value="warning">เหลือง - แจ้งเตือนด่วน (Warning)</option>
                      <option value="danger">แดง - วิกฤต/ระงับบัญชี (Urgent)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tool Block 3: Header & Branding */}
              <div className="bg-white p-3 rounded-xl border border-stone-border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-deep-slate text-xs flex items-center space-x-1.5">
                    <LayoutTemplate className="w-4 h-4 text-forest" />
                    <span>หัวกระดาษ / แผนก (Header & Branding)</span>
                  </span>
                  <button
                    type="button"
                    onClick={addHeaderCard}
                    className="flex items-center space-x-1 px-3 py-1 bg-forest text-white rounded-lg text-[11px] font-semibold hover:bg-forest-hover shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>แทรกลงอีเมล</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">ชื่อแผนก (TH)</label>
                    <input
                      type="text"
                      value={headerTitleTh}
                      onChange={e => setHeaderTitleTh(e.target.value)}
                      className="w-full p-2 border border-stone-border rounded-lg text-xs outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Department Name (EN)</label>
                    <input
                      type="text"
                      value={headerTitleEn}
                      onChange={e => setHeaderTitleEn(e.target.value)}
                      className="w-full p-2 border border-stone-border rounded-lg text-xs outline-none focus:border-forest text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Elements with Bilingual Support */}
              <div className="pt-2 border-t border-stone-border flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addGreetingParagraph}
                  className="px-3 py-1.5 bg-white border border-stone-border hover:border-forest text-gray-700 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                >
                  <span>+ คำขึ้นต้นจดหมาย ({templateLang === 'bilingual' ? 'สองภาษา' : templateLang.toUpperCase()})</span>
                </button>
                <button
                  type="button"
                  onClick={addSecurityFooter}
                  className="px-3 py-1.5 bg-white border border-stone-border hover:border-forest text-gray-700 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                >
                  <span>+ ข้อความลงท้าย ({templateLang === 'bilingual' ? 'สองภาษา' : templateLang.toUpperCase()})</span>
                </button>
                <button
                  type="button"
                  onClick={addDivider}
                  className="px-3 py-1.5 bg-white border border-stone-border hover:border-forest text-gray-700 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                >
                  <span>+ เส้นคั่น (Divider)</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>โค้ด HTML ของอีเมล (แก้ไขได้อิสระ รองรับตัวแปร Handlebars):</span>
                <span className="text-[11px] font-mono">{(bodyHtml || '').length} ตัวอักษร</span>
              </div>
              <textarea
                rows={16}
                required
                value={bodyHtml}
                onChange={e => {
                  onChangeBodyHtml(e.target.value);
                  updateHtmlWithHistory(e.target.value);
                }}
                placeholder="<div style='font-family: sans-serif;'>...</div>"
                className="w-full p-3 font-mono text-xs border border-stone-border rounded-xl outline-none focus:border-forest bg-white leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Right Column: Real-time Live Preview (5 cols) */}
        <div className="lg:col-span-5 bg-stone-100/70 p-3 rounded-2xl border border-stone-border flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-gray-600 flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5 text-forest" />
              <span>แสดงผลแบบสด (Live Preview)</span>
            </span>
            <span className="text-[10px] text-gray-400">
              {previewDevice === 'desktop' ? 'Desktop 600px' : 'Mobile 360px'}
            </span>
          </div>

          <div
            className={`transition-all bg-white rounded-xl shadow-md border border-stone-border overflow-hidden ${
              previewDevice === 'desktop' ? 'w-full max-w-[550px]' : 'w-[320px]'
            }`}
            style={{ minHeight: '380px', maxHeight: '480px' }}
          >
            {/* Mock Email Client Header */}
            <div className="bg-stone-50 border-b border-stone-border p-2.5 text-[11px] space-y-1">
              <div className="flex">
                <span className="text-gray-400 w-14">Subject:</span>
                <span className="font-semibold text-deep-slate line-clamp-1">{subject || '(ไม่มีหัวเรื่อง)'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-400 w-14">To:</span>
                <span className="text-gray-600">somchai.j@company.com</span>
              </div>
            </div>

            {/* Email Body Iframe */}
            <div className="p-2 overflow-y-auto max-h-[400px]">
              <iframe
                title="Email Preview"
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#ffffff;font-family:sans-serif;} *{box-sizing:border-box;}</style></head><body>${livePreviewHtml}</body></html>`}
                className="w-full h-[380px] border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
