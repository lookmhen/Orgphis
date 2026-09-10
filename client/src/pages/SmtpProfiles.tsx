import React, { useEffect, useState } from 'react';
import { Server, CheckCircle2, AlertCircle, Plus, Edit3, Trash2, Info, ExternalLink } from 'lucide-react';

interface SmtpPreset {
  id: string;
  label: string;
  badge: string;
  host: string;
  port: number;
  secure: boolean;
  fromName: string;
  fromEmail: string;
  rateLimit: number;
  delaySeconds: number;
  tip: string;
}

const SMTP_PRESETS: SmtpPreset[] = [
  {
    id: 'm365',
    label: 'Microsoft 365 / Outlook (Office 365)',
    badge: 'Microsoft 365',
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // STARTTLS
    fromName: 'IT Security Support',
    fromEmail: 'security-alert@yourdomain.com',
    rateLimit: 5,
    delaySeconds: 3,
    tip: 'Microsoft 365 ใช้ Host: smtp.office365.com, Port: 587 (STARTTLS) โดยบัญชีที่เปิด MFA ต้องสร้าง "App Password" และเปิดใช้งาน SMTP AUTH ใน M365 Admin Center'
  },
  {
    id: 'gmail_tls',
    label: 'Google Workspace / Gmail (STARTTLS 587)',
    badge: 'Google Workspace',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    fromName: 'Security Notification',
    fromEmail: 'it-notice@yourdomain.com',
    rateLimit: 5,
    delaySeconds: 2,
    tip: 'Google Workspace/Gmail แนะนำ Port: 587 (STARTTLS) โดยต้องสร้าง "App Password" (รหัสผ่านแอป 16 ตัวอักษร) จากหน้า Google Account Security เนื่องจาก Google ยกเลิกระบบ Less Secure Apps แล้ว'
  },
  {
    id: 'gmail_ssl',
    label: 'Google Workspace / Gmail (Direct SSL 465)',
    badge: 'Google SSL',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Direct SSL
    fromName: 'Google Workspace Admin',
    fromEmail: 'admin@yourdomain.com',
    rateLimit: 5,
    delaySeconds: 2,
    tip: 'Google Workspace Port: 465 (Direct SSL) ต้องใช้ App Password 16 หลักเช่นกัน'
  },
  {
    id: 'gmail_relay',
    label: 'Google Workspace SMTP Relay (Corporate IP)',
    badge: 'Google Relay',
    host: 'smtp-relay.gmail.com',
    port: 587,
    secure: false,
    fromName: 'Company Mail Delivery',
    fromEmail: 'mailer@yourdomain.com',
    rateLimit: 10,
    delaySeconds: 1,
    tip: 'สำหรับองค์กรที่ทำ IP Whitelist ใน Google Workspace Admin Console เพื่อส่งผ่าน Relay โดยตรง'
  }
];

export const SmtpProfiles: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);
  const [activePresetTip, setActivePresetTip] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: 'Microsoft 365 Relay',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromName: 'IT Security Support',
    fromEmail: 'security-alert@yourdomain.com',
    rateLimit: 5,
    delaySeconds: 3
  });

  const fetchProfiles = () => {
    fetch('/api/smtp-profiles')
      .then(r => r.json())
      .then(setProfiles);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const applyPreset = (preset: SmtpPreset) => {
    setForm(prev => ({
      ...prev,
      name: preset.label,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
      fromName: preset.fromName,
      fromEmail: preset.fromEmail,
      rateLimit: preset.rateLimit,
      delaySeconds: preset.delaySeconds
    }));
    setActivePresetTip(preset.tip);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    applyPreset(SMTP_PRESETS[0]); // Default to M365 preset
    setShowModal(true);
  };

  const handleOpenEdit = (profile: any) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      host: profile.host,
      port: profile.port,
      secure: profile.secure,
      username: profile.username || '',
      password: profile.password || '',
      fromName: profile.fromName,
      fromEmail: profile.fromEmail,
      rateLimit: profile.rateLimit,
      delaySeconds: profile.delaySeconds
    });
    setActivePresetTip('คุณสามารถปรับแต่งค่าคอนฟิก Host, Port, หรือข้อมูลผู้ส่งได้อิสระ');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/smtp-profiles/${editingId}` : '/api/smtp-profiles';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setShowModal(false);
      fetchProfiles();
    } else {
      alert('บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบโปรไฟล์ SMTP นี้?')) return;
    const res = await fetch(`/api/smtp-profiles/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProfiles();
  };

  const handleTestConnection = async (id: string) => {
    setTestResult(null);
    try {
      const res = await fetch(`/api/smtp-profiles/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ id, success: res.ok, msg: data.message || data.error });
    } catch (err: any) {
      setTestResult({ id, success: false, msg: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">การตั้งค่าการส่งอีเมล (SMTP Profiles)</h2>
          <p className="text-sm text-gray-500 mt-1">
            เลือกโปรไฟล์มาตรฐาน (Microsoft 365, Google Workspace) หรือกำหนดค่า Custom ได้อย่างอิสระ
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-hover shadow-soft"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มโปรไฟล์ SMTP</span>
        </button>
      </div>

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profiles.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl p-8 text-center text-gray-400 border border-stone-border">
            ยังไม่มีโปรไฟล์ SMTP คลิกปุ่ม "+ เพิ่มโปรไฟล์ SMTP" เพื่อเลือกเทมเพลต M365 หรือ Google
          </div>
        ) : (
          profiles.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-stone-border shadow-soft p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-forest-light text-forest flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-deep-slate text-sm">{p.name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{p.host}:{p.port}</p>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-muted text-gray-600 font-mono">
                  {p.rateLimit} ฉบับ / {p.delaySeconds} วิ
                </span>
              </div>

              <div className="p-3 bg-stone-muted/50 rounded-lg text-xs space-y-1 text-gray-600 border border-stone-border/40 font-mono">
                <p>From: <span className="font-semibold text-deep-slate">{p.fromName} &lt;{p.fromEmail}&gt;</span></p>
                <p>Security: {p.secure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)'}</p>
                <p>Account: {p.username || '(Anonymous Relay)'}</p>
              </div>

              {testResult && testResult.id === p.id && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                  testResult.success ? 'bg-forest-light text-forest' : 'bg-red-50 text-red-700'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.msg}</span>
                </div>
              )}

              <div className="pt-2 border-t border-stone-border flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 text-gray-500 hover:text-deep-slate text-xs font-semibold rounded hover:bg-stone-muted flex items-center space-x-1"
                    title="แก้ไขโปรไฟล์"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 text-xs rounded hover:bg-red-50"
                    title="ลบโปรไฟล์"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => handleTestConnection(p.id)}
                  className="px-3 py-1.5 rounded-lg border border-stone-border text-xs font-semibold text-gray-700 hover:bg-stone-muted transition-all"
                >
                  ทดสอบการเชื่อมต่อ (Test Handshake)
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= MODAL: CREATE / EDIT SMTP PROFILE ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-border space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-border">
              <div>
                <h3 className="font-bold text-deep-slate text-base">
                  {editingId ? '✏️ แก้ไขโปรไฟล์ SMTP' : '➕ เพิ่มโปรไฟล์การส่งอีเมล (SMTP)'}
                </h3>
                <p className="text-xs text-gray-500">เลือกเทมเพลตผู้ให้บริการยอดนิยมเพื่อเติมค่าอัตโนมัติ หรือปรับแต่งเองได้อิสระ</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-deep-slate font-bold">✕ ปิด</button>
            </div>

            {/* Quick Provider Preset Selector */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-xs">เลือกแม่แบบผู้ให้บริการ (Quick Presets):</label>
              <div className="grid grid-cols-2 gap-2">
                {SMTP_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="p-2.5 rounded-xl border border-stone-border text-left hover:border-forest/50 hover:bg-stone-muted/40 transition-all text-xs"
                  >
                    <div className="font-semibold text-deep-slate flex items-center justify-between">
                      <span>{preset.badge}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Port {preset.port}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">{preset.host}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Setting Tip */}
            {activePresetTip && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-terracotta" />
                <p className="leading-relaxed">{activePresetTip}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">ชื่อโปรไฟล์</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">SMTP Host / Server URL</label>
                  <input
                    type="text"
                    required
                    value={form.host}
                    onChange={e => setForm({ ...form, host: e.target.value })}
                    className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={form.port}
                    onChange={e => setForm({ ...form, port: parseInt(e.target.value) })}
                    className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 py-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.secure}
                    onChange={e => setForm({ ...form, secure: e.target.checked })}
                    className="rounded text-forest focus:ring-forest"
                  />
                  <span>ใช้ Direct SSL (เปิดสำหรับ Port 465, ปิดสำหรับ Port 587/STARTTLS)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">From Name (ชื่อผู้ส่งจำลอง)</label>
                  <input
                    type="text"
                    required
                    value={form.fromName}
                    onChange={e => setForm({ ...form, fromName: e.target.value })}
                    className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">From Email (อีเมลผู้ส่งจำลอง)</label>
                  <input
                    type="email"
                    required
                    value={form.fromEmail}
                    onChange={e => setForm({ ...form, fromEmail: e.target.value })}
                    className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Username / Email ที่ใช้ส่ง</label>
                  <input
                    type="text"
                    placeholder="user@yourdomain.com"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Password / App Password</label>
                  <input
                    type="password"
                    placeholder="รหัสผ่าน หรือ App Password 16 หลัก"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-muted/50 rounded-xl border border-stone-border/50">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Rate Limit (จำนวนฉบับ/รอบ)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.rateLimit}
                    onChange={e => setForm({ ...form, rateLimit: parseInt(e.target.value) })}
                    className="w-full p-1.5 border border-stone-border rounded-lg outline-none focus:border-forest text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Delay (เว้นระยะกี่วินาที/รอบ)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.delaySeconds}
                    onChange={e => setForm({ ...form, delaySeconds: parseInt(e.target.value) })}
                    className="w-full p-1.5 border border-stone-border rounded-lg outline-none focus:border-forest text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest-hover shadow-soft"
                >
                  {editingId ? 'บันทึกการแก้ไข' : 'สร้างโปรไฟล์ SMTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
