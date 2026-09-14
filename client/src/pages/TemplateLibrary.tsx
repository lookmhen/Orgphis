import React, { useEffect, useState } from 'react';
import { Copy, Plus, Eye, Edit3, Trash2, CheckCircle2, Monitor, Smartphone, Tag, Send, RefreshCw, AlertCircle, Paperclip } from 'lucide-react';
import { EmailEditorWithTools } from '../components/EmailEditorWithTools';

export const TemplateLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'email' | 'landing'>('email');
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [landingTemplates, setLandingTemplates] = useState<any[]>([]);
  const [smtpProfiles, setSmtpProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Editors
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [editingEmail, setEditingEmail] = useState<any | null>(null);
  const [editingLanding, setEditingLanding] = useState<any | null>(null);

  // Test Send Email Modal State
  const [testEmailModal, setTestEmailModal] = useState<any | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testSmtpId, setTestSmtpId] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; msg: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/templates/emails').then(r => r.json()),
      fetch('/api/templates/landing-pages').then(r => r.json()),
      fetch('/api/smtp-profiles').then(r => r.json())
    ]).then(([emails, landings, smtps]) => {
      setEmailTemplates(Array.isArray(emails) ? emails : []);
      setLandingTemplates(Array.isArray(landings) ? landings : []);
      const smtpList = Array.isArray(smtps) ? smtps : [];
      setSmtpProfiles(smtpList);
      if (smtpList.length > 0) {
        setTestSmtpId(prev => prev || smtpList[0].id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenTestSend = (template: any) => {
    setTestEmailModal(template);
    setTestSendResult(null);
    if (smtpProfiles.length > 0 && !testSmtpId) {
      setTestSmtpId(smtpProfiles[0].id);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailModal || !testSmtpId || !testRecipient) {
      alert('กรุณาเลือก SMTP Profile และระบุอีเมลผู้รับ');
      return;
    }

    setIsSendingTest(true);
    setTestSendResult(null);

    let clientBaseUrl = window.location.origin;
    if (clientBaseUrl.includes(':5173')) {
      clientBaseUrl = clientBaseUrl.replace(':5173', ':3000');
    }

    try {
      const res = await fetch('/api/templates/emails/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpProfileId: testSmtpId,
          recipientEmail: testRecipient,
          subject: testEmailModal.subject,
          bodyHtml: testEmailModal.bodyHtml,
          hasAttachment: testEmailModal.hasAttachment,
          attachmentName: testEmailModal.attachmentName,
          attachmentType: testEmailModal.attachmentType,
          baseUrl: clientBaseUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTestSendResult({ success: true, msg: data.message });
      } else {
        setTestSendResult({ success: false, msg: data.error || 'ส่งอีเมลทดสอบไม่สำเร็จ' });
      }
    } catch (err: any) {
      setTestSendResult({ success: false, msg: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCloneEmail = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/emails/${id}/clone`, { method: 'POST' });
      if (res.ok) {
        const cloned = await res.json();
        fetchData();
        setEditingEmail(cloned); // Open editor immediately for the clone!
      }
    } catch (err) {
      alert('Clone failed');
    }
  };

  const handleCloneLanding = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/landing-pages/${id}/clone`, { method: 'POST' });
      if (res.ok) {
        const cloned = await res.json();
        fetchData();
        setEditingLanding(cloned); // Open editor immediately for the clone!
      }
    } catch (err) {
      alert('Clone failed');
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmail) return;

    try {
      const url = editingEmail.id ? `/api/templates/emails/${editingEmail.id}` : '/api/templates/emails';
      const method = editingEmail.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEmail)
      });

      if (res.ok) {
        setEditingEmail(null);
        fetchData();
      } else {
        alert('Failed to save email template');
      }
    } catch (err) {
      alert('Save error');
    }
  };

  const handleSaveLanding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLanding) return;

    try {
      const url = editingLanding.id ? `/api/templates/landing-pages/${editingLanding.id}` : '/api/templates/landing-pages';
      const method = editingLanding.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLanding)
      });

      if (res.ok) {
        setEditingLanding(null);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to save landing page template');
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!confirm('ยืนยันลบเทมเพลตอีเมลนี้?')) return;
    try {
      const res = await fetch(`/api/templates/emails/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'ลบเทมเพลตไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(`ลบเทมเพลตไม่สำเร็จ: ${err.message}`);
    }
  };

  const handleDeleteLanding = async (id: string) => {
    if (!confirm('ยืนยันลบเทมเพลตหน้าฟอร์มนี้?')) return;
    try {
      const res = await fetch(`/api/templates/landing-pages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'ลบหน้าฟอร์มไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(`ลบหน้าฟอร์มไม่สำเร็จ: ${err.message}`);
    }
  };

  const insertVariable = (variable: string) => {
    if (editingEmail) {
      setEditingEmail({
        ...editingEmail,
        bodyHtml: (editingEmail.bodyHtml || '') + variable
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">คลังเทมเพลต (Template Library & Customizer)</h2>
          <p className="text-sm text-gray-500 mt-1">
            เลือกเทมเพลตต้นแบบสำเร็จรูป หรือโคลน (1-Click Clone) และแก้ไข Layout / ข้อความ / โลโก้ / ช่องฟอร์ม ได้อย่างอิสระ
          </p>
        </div>

        <div className="flex space-x-2">
          {activeTab === 'email' ? (
            <button
              onClick={() => setEditingEmail({ name: 'New Custom Email', subject: 'แจ้งเตือนสำคัญ', bodyHtml: '<p>เนื้อหาอีเมลจำลอง {{name}}</p>', bodyText: 'เนื้อหาอีเมลจำลอง' })}
              className="flex items-center space-x-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-hover shadow-soft"
            >
              <Plus className="w-4 h-4" />
              <span>สร้าง Email Template ใหม่</span>
            </button>
          ) : (
            <button
              onClick={() => setEditingLanding({
                name: 'New Custom Portal',
                pageTitle: 'Single Sign-On',
                logoUrl: '',
                headerText: 'เข้าสู่ระบบบัญชีองค์กร',
                subHeaderText: 'กรุณากรอกข้อมูลเพื่อยืนยันตัวตน',
                submitButtonText: 'เข้าสู่ระบบ',
                showEmailField: true,
                showPasswordField: true,
                postSubmitAction: 'AWARENESS_PAGE'
              })}
              className="flex items-center space-x-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-hover shadow-soft"
            >
              <Plus className="w-4 h-4" />
              <span>สร้าง Landing Page ใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-2 border-b border-stone-border pb-3">
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'email'
              ? 'bg-forest text-white shadow-soft'
              : 'text-gray-600 hover:bg-stone-muted'
          }`}
        >
          📧 Email Templates ({emailTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab('landing')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'landing'
              ? 'bg-forest text-white shadow-soft'
              : 'text-gray-600 hover:bg-stone-muted'
          }`}
        >
          🌐 Landing Pages ({landingTemplates.length})
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'email' ? (
          emailTemplates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-stone-border shadow-soft p-5 flex flex-col justify-between hover:border-forest/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      t.isPreset ? 'bg-forest-light text-forest' : 'bg-amber-50 text-amber-terracotta'
                    }`}>
                      {t.isPreset ? 'Official Preset (ต้นแบบ)' : 'Custom Template (แก้ไขได้)'}
                    </span>
                    {t.hasAttachment && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200" title={`มีไฟล์แนบ: ${t.attachmentName}`}>
                        <Paperclip className="w-3 h-3 text-purple-600" />
                        <span>{t.attachmentName || 'Attachment'}</span>
                      </span>
                    )}
                  </div>
                  {!t.isPreset && (
                    <button
                      onClick={() => handleDeleteEmail(t.id)}
                      className="text-gray-400 hover:text-red-600 transition-all"
                      title="ลบเทมเพลต"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-deep-slate text-base line-clamp-1">{t.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-medium">หัวเรื่อง: {t.subject}</p>
                <div className="mt-4 p-3 bg-stone-muted/50 rounded-lg text-[12px] text-gray-600 line-clamp-3 font-mono border border-stone-border/50">
                  {t.bodyText || t.bodyHtml.substring(0, 150)}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewTemplate({ type: 'email', ...t })}
                    className="flex items-center space-x-1 text-xs font-semibold text-gray-600 hover:text-deep-slate"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleOpenTestSend(t)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-stone-border text-forest hover:bg-forest-light transition-all"
                    title="ทดสอบส่งอีเมลนี้เข้ากล่องจดหมายจริงของคุณ"
                  >
                    <Send className="w-3 h-3" />
                    <span>ทดสอบส่ง</span>
                  </button>
                </div>

                <div className="flex space-x-1.5">
                  {!t.isPreset && (
                    <button
                      onClick={() => setEditingEmail(t)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-stone-border text-gray-700 hover:bg-stone-muted transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCloneEmail(t.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest text-white hover:bg-forest-hover transition-all shadow-soft"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Clone & Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          landingTemplates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-stone-border shadow-soft p-5 flex flex-col justify-between hover:border-forest/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    t.isPreset ? 'bg-forest-light text-forest' : 'bg-amber-50 text-amber-terracotta'
                  }`}>
                    {t.isPreset ? 'Official Preset (ต้นแบบ)' : 'Custom Template (แก้ไขได้)'}
                  </span>
                  {!t.isPreset && (
                    <button
                      onClick={() => handleDeleteLanding(t.id)}
                      className="text-gray-400 hover:text-red-600 transition-all"
                      title="ลบเทมเพลต"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-deep-slate text-base line-clamp-1">{t.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-medium">{t.pageTitle}</p>
                <div className="mt-4 p-3 bg-stone-muted/50 rounded-lg text-[12px] text-gray-600 space-y-1 border border-stone-border/50">
                  <p>หัวข้อ: <span className="font-semibold text-deep-slate">{t.headerText}</span></p>
                  <p>ปุ่มส่ง: <span className="font-semibold text-deep-slate">{t.submitButtonText}</span></p>
                  <p>ช่องกรอก: {t.showEmailField && 'อีเมล '}{t.showPasswordField && 'รหัสผ่าน'}</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-border flex items-center justify-between">
                <button
                  onClick={() => setPreviewTemplate({ type: 'landing', ...t })}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-deep-slate"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Form</span>
                </button>

                <div className="flex space-x-1.5">
                  {!t.isPreset && (
                    <button
                      onClick={() => setEditingLanding(t)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-stone-border text-gray-700 hover:bg-stone-muted transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCloneLanding(t.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest text-white hover:bg-forest-hover transition-all shadow-soft"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Clone & Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= MODAL: EDIT EMAIL TEMPLATE ================= */}
      {editingEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-stone-border space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-border">
              <div>
                <h3 className="font-bold text-deep-slate text-lg">
                  {editingEmail.id ? '✏️ ปรับแต่งเทมเพลตอีเมล (Email Template Customizer)' : '➕ สร้างเทมเพลตอีเมลใหม่'}
                </h3>
                <p className="text-xs text-gray-500">
                  ออกแบบผ่าน Visual Tools บล็อกสำเร็จรูป หรือสลับไปแก้โค้ด Raw HTML ได้อย่างอิสระ พร้อม Live Preview
                </p>
              </div>
              <button onClick={() => setEditingEmail(null)} className="text-gray-400 hover:text-deep-slate text-sm font-bold">✕ ปิด</button>
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-4 text-xs">
              <EmailEditorWithTools
                name={editingEmail.name || ''}
                subject={editingEmail.subject || ''}
                bodyHtml={editingEmail.bodyHtml || ''}
                hasAttachment={editingEmail.hasAttachment || false}
                attachmentName={editingEmail.attachmentName || ''}
                attachmentType={editingEmail.attachmentType || 'application/pdf'}
                onChangeName={(val) => setEditingEmail({ ...editingEmail, name: val })}
                onChangeSubject={(val) => setEditingEmail({ ...editingEmail, subject: val })}
                onChangeBodyHtml={(val) => setEditingEmail({ ...editingEmail, bodyHtml: val })}
                onChangeHasAttachment={(val) => setEditingEmail({ ...editingEmail, hasAttachment: val })}
                onChangeAttachmentName={(val) => setEditingEmail({ ...editingEmail, attachmentName: val })}
                onChangeAttachmentType={(val) => setEditingEmail({ ...editingEmail, attachmentType: val })}
              />

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-border">
                <button
                  type="button"
                  onClick={() => setEditingEmail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest-hover shadow-soft"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT LANDING PAGE TEMPLATE ================= */}
      {editingLanding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-border space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-border">
              <div>
                <h3 className="font-bold text-deep-slate text-lg">
                  {editingLanding.id ? '✏️ ปรับแต่งหน้าเว็บ/ฟอร์ม (Customize Landing Page)' : '➕ สร้างหน้าเว็บใหม่'}
                </h3>
                <p className="text-xs text-gray-500">ปรับเปลี่ยนชื่อ โลโก้ หัวข้อฟอร์ม ปุ่มกด และเลือกเปิด-ปิดช่องกรอกข้อมูล</p>
              </div>
              <button onClick={() => setEditingLanding(null)} className="text-gray-400 hover:text-deep-slate text-sm font-bold">✕ ปิด</button>
            </div>

            <form onSubmit={handleSaveLanding} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">ชื่อเทมเพลต (Template Name)</label>
                  <input
                    type="text"
                    required
                    value={editingLanding.name}
                    onChange={e => setEditingLanding({ ...editingLanding, name: e.target.value })}
                    className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Title บนแท็บเบราว์เซอร์ (Page Title)</label>
                  <input
                    type="text"
                    required
                    value={editingLanding.pageTitle}
                    onChange={e => setEditingLanding({ ...editingLanding, pageTitle: e.target.value })}
                    className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">URL โลโก้ (Logo Image URL)</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png (เว้นว่างได้)"
                  value={editingLanding.logoUrl || ''}
                  onChange={e => setEditingLanding({ ...editingLanding, logoUrl: e.target.value })}
                  className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">ข้อความหัวข้อฟอร์ม (Header Text)</label>
                  <input
                    type="text"
                    required
                    value={editingLanding.headerText}
                    onChange={e => setEditingLanding({ ...editingLanding, headerText: e.target.value })}
                    className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">ข้อความปุ่มส่ง (Button Text)</label>
                  <input
                    type="text"
                    required
                    value={editingLanding.submitButtonText}
                    onChange={e => setEditingLanding({ ...editingLanding, submitButtonText: e.target.value })}
                    className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">คำอธิบายใต้หัวข้อ (Sub-header)</label>
                <input
                  type="text"
                  value={editingLanding.subHeaderText || ''}
                  onChange={e => setEditingLanding({ ...editingLanding, subHeaderText: e.target.value })}
                  className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                />
              </div>

              {/* Form Fields Toggle */}
              <div className="p-3.5 bg-stone-muted/50 rounded-xl border border-stone-border/60 space-y-2">
                <span className="block font-bold text-deep-slate">ช่องกรอกข้อมูลในแบบฟอร์ม (Form Fields Layout):</span>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingLanding.showEmailField}
                      onChange={e => setEditingLanding({ ...editingLanding, showEmailField: e.target.checked })}
                      className="rounded text-forest focus:ring-forest"
                    />
                    <span>ช่องอีเมล (Email)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingLanding.showPasswordField}
                      onChange={e => setEditingLanding({ ...editingLanding, showPasswordField: e.target.checked })}
                      className="rounded text-forest focus:ring-forest"
                    />
                    <span>ช่องรหัสผ่าน (Password)</span>
                  </label>
                </div>
              </div>

              {/* Post Submit Action */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">พฤติกรรมหลังจากผู้ใช้กด Submit</label>
                <select
                  value={editingLanding.postSubmitAction}
                  onChange={e => setEditingLanding({ ...editingLanding, postSubmitAction: e.target.value })}
                  className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                >
                  <option value="AWARENESS_PAGE">แสดงหน้า Security Awareness ให้ความรู้ทันที (แนะนำ)</option>
                  <option value="REDIRECT">Redirect ส่งต่อไปยังเว็บไซต์อื่น</option>
                  <option value="SIMULATED_ERROR">แสดงหน้า Error 500 จำลอง</option>
                </select>
              </div>

              {editingLanding.postSubmitAction === 'REDIRECT' && (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">URL ปลายทางที่ต้องการให้ Redirect ไป</label>
                  <input
                    type="url"
                    placeholder="https://intranet.company.com"
                    value={editingLanding.redirectUrl || ''}
                    onChange={e => setEditingLanding({ ...editingLanding, redirectUrl: e.target.value })}
                    className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-border">
                <button
                  type="button"
                  onClick={() => setEditingLanding(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest-hover shadow-soft"
                >
                  บันทึกการปรับแต่ง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SANDBOXED PREVIEW ================= */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-border max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-border">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-deep-slate text-lg">{previewTemplate.name}</h3>
                  {previewTemplate.hasAttachment && (
                    <span className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                      <span>{previewTemplate.attachmentName}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Iframe Sandboxed Preview (ตัดสิทธิ์เข้าถึง Admin Cookies/Tokens ป้องกัน XSS)</p>
              </div>

              <div className="flex items-center space-x-3">
                {previewTemplate.type === 'email' && (
                  <button
                    onClick={() => handleOpenTestSend(previewTemplate)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-hover shadow-soft transition-all"
                    title="ทดสอบส่งอีเมลนี้เข้ากล่องจดหมายจริงของคุณ"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ทดสอบส่งจริง</span>
                  </button>
                )}

                {/* Viewport switch */}
                <div className="flex items-center bg-stone-muted p-1 rounded-lg border border-stone-border">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-white text-forest shadow-xs' : 'text-gray-500'}`}
                    title="Desktop View"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-white text-forest shadow-xs' : 'text-gray-500'}`}
                    title="Mobile View"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-gray-400 hover:text-deep-slate text-sm font-bold p-1"
                >
                  ✕ ปิด
                </button>
              </div>
            </div>

            <div className="flex-1 mt-4 border border-stone-border rounded-xl overflow-hidden bg-warm-sand min-h-[420px] flex items-center justify-center p-4">
              <div className={`transition-all duration-200 h-full w-full ${previewDevice === 'mobile' ? 'max-w-[375px] shadow-lg rounded-2xl border border-gray-300 overflow-hidden' : ''}`}>
                <iframe
                  title="Preview"
                  sandbox="allow-scripts allow-forms"
                  className="w-full h-full min-h-[420px] bg-white"
                  srcDoc={previewTemplate.bodyHtml || `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF8F5; padding: 24px; color: #24292F; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
                        .card { background: #fff; border: 1px solid #E7E5E0; border-radius: 12px; max-width: 380px; width: 100%; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                        .logo { max-height: 40px; margin-bottom: 16px; }
                        h2 { font-size: 18px; margin-bottom: 6px; }
                        p { font-size: 13px; color: #666; margin-bottom: 20px; }
                        .group { margin-bottom: 12px; }
                        label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px; color: #444; }
                        input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; }
                        button { width: 100%; padding: 10px; background: #2D5A43; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 10px; }
                      </style>
                    </head>
                    <body>
                      <div class="card">
                        ${previewTemplate.logoUrl ? `<img src="${previewTemplate.logoUrl}" class="logo" />` : ''}
                        <h2>${previewTemplate.headerText || previewTemplate.pageTitle}</h2>
                        <p>${previewTemplate.subHeaderText || ''}</p>
                        ${previewTemplate.showEmailField ? '<div class="group"><label>Email</label><input type="text" value="employee@company.com" /></div>' : ''}
                        ${previewTemplate.showPasswordField ? '<div class="group"><label>Password</label><input type="password" /></div>' : ''}
                        <button>${previewTemplate.submitButtonText || 'เข้าสู่ระบบ'}</button>
                      </div>
                    </body>
                    </html>
                  `}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TEST SEND EMAIL ================= */}
      {testEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-forest-light text-forest flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-deep-slate text-sm">ทดสอบส่งอีเมล (Send Test Mail)</h3>
                  <p className="text-[11px] text-gray-500">ทดลองส่งเข้ากล่องจดหมายจริงเพื่อตรวจสอบการแสดงผล</p>
                </div>
              </div>
              <button
                onClick={() => { setTestEmailModal(null); setTestSendResult(null); }}
                className="text-gray-400 hover:text-deep-slate text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">เทมเพลตที่เลือก</label>
                <div className="p-2.5 bg-stone-muted/50 rounded-lg border border-stone-border">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-deep-slate text-xs line-clamp-1">{testEmailModal.name}</p>
                    {testEmailModal.hasAttachment && (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        <Paperclip className="w-3 h-3 text-purple-600" />
                        <span>{testEmailModal.attachmentName}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">หัวเรื่อง: {testEmailModal.subject}</p>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">เลือกโปรไฟล์ SMTP สำหรับส่ง <span className="text-red-500">*</span></label>
                {smtpProfiles.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-[11px]">
                    ยังไม่มีโปรไฟล์ SMTP ในระบบ กรุณาไปเพิ่มโปรไฟล์ที่หน้า "ตั้งค่า SMTP" ก่อน
                  </div>
                ) : (
                  <select
                    value={testSmtpId}
                    onChange={e => setTestSmtpId(e.target.value)}
                    required
                    className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest text-xs bg-white"
                  >
                    {smtpProfiles.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.fromEmail}) - {s.host}:{s.port}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">อีเมลผู้รับปลายทาง (Recipient Email) <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="เช่น your-email@company.com"
                  value={testRecipient}
                  onChange={e => setTestRecipient(e.target.value)}
                  className="w-full p-2.5 border border-stone-border rounded-lg outline-none focus:border-forest text-xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">ใส่อีเมลของคุณเพื่อตรวจสอบความถูกต้องของเนื้อหา ฟอนต์ และลิงก์</p>
              </div>

              {testSendResult && (
                <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                  testSendResult.success ? 'bg-forest-light text-forest border-forest/30' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {testSendResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{testSendResult.msg}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-border">
                <button
                  type="button"
                  onClick={() => { setTestEmailModal(null); setTestSendResult(null); }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest || smtpProfiles.length === 0}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest-hover transition-all shadow-soft disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังส่งอีเมลทดสอบ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>ส่งอีเมลทดสอบ (Send Test Mail)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
