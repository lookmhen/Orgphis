import React, { useEffect, useState } from 'react';
import { Send, Play, Square, Download, Plus, CheckCircle2, Clock } from 'lucide-react';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetGroups, setTargetGroups] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [landingTemplates, setLandingTemplates] = useState<any[]>([]);
  const [smtpProfiles, setSmtpProfiles] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    targetGroupId: '',
    emailTemplateId: '',
    landingPageTemplateId: '',
    smtpProfileId: ''
  });

  const fetchCampaigns = () => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(setCampaigns);
  };

  useEffect(() => {
    fetchCampaigns();
    Promise.all([
      fetch('/api/targets/groups').then(r => r.json()),
      fetch('/api/templates/emails').then(r => r.json()),
      fetch('/api/templates/landing-pages').then(r => r.json()),
      fetch('/api/smtp-profiles').then(r => r.json())
    ]).then(([groups, emails, landings, smtps]) => {
      setTargetGroups(groups);
      setEmailTemplates(emails);
      setLandingTemplates(landings);
      setSmtpProfiles(smtps);
      if (groups.length > 0) setForm(f => ({ ...f, targetGroupId: groups[0].id }));
      if (emails.length > 0) setForm(f => ({ ...f, emailTemplateId: emails[0].id }));
      if (landings.length > 0) setForm(f => ({ ...f, landingPageTemplateId: landings[0].id }));
      if (smtps.length > 0) setForm(f => ({ ...f, smtpProfileId: smtps[0].id }));
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setShowCreateModal(false);
      fetchCampaigns();
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm('ยืนยันเริ่มส่งแบบทดสอบ Phishing จำลองไปยังกลุ่มเป้าหมายทันที?')) return;
    const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' });
    if (res.ok) {
      alert('เริ่มส่งอีเมลจำลองแล้ว! ระบบจะทยอยส่งตาม Rate Limit เพื่อความปลอดภัย');
      fetchCampaigns();
    }
  };

  const handleKill = async (id: string) => {
    if (!confirm('⚠️ คำเตือน: คุณต้องการสั่ง Emergency Kill Switch เพื่อหยุดแคมเปญนี้ทันทีใช่หรือไม่?')) return;
    const res = await fetch(`/api/campaigns/${id}/kill`, { method: 'POST' });
    if (res.ok) {
      alert('หยุดแคมเปญฉุกเฉินสำเร็จ');
      fetchCampaigns();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">การจัดการแคมเปญ (Campaigns)</h2>
          <p className="text-sm text-gray-500 mt-1">สร้าง รันคิวส่งอีเมลจำลอง ติดตามผล และดาวน์โหลดรายงานสถิติ</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-hover shadow-soft"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างแคมเปญใหม่</span>
        </button>
      </div>

      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 border border-stone-border">
            ยังไม่มีแคมเปญในระบบ เริ่มต้นสร้างแคมเปญแรกของคุณด้วยปุ่มด้านบน
          </div>
        ) : (
          campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-stone-border shadow-soft p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h3 className="font-bold text-deep-slate text-base">{c.name}</h3>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      c.status === 'RUNNING' ? 'bg-amber-50 text-amber-terracotta animate-pulse' :
                      c.status === 'COMPLETED' ? 'bg-forest-light text-forest' :
                      c.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                      'bg-stone-muted text-gray-600'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    กลุ่มผู้รับ: <span className="font-semibold text-deep-slate">{c.targetGroup?.name}</span> &bull;
                    เทมเพลต: <span className="font-semibold text-deep-slate">{c.emailTemplate?.name}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {c.status === 'DRAFT' && (
                    <button
                      onClick={() => handleLaunch(c.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-hover shadow-soft"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>สั่งเริ่มส่ง (Launch)</span>
                    </button>
                  )}

                  {c.status === 'RUNNING' && (
                    <button
                      onClick={() => handleKill(c.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 shadow-soft"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>หยุดฉุกเฉิน (Kill)</span>
                    </button>
                  )}

                  <a
                    href={`/api/campaigns/${c.id}/export`}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-stone-border rounded-lg text-xs font-semibold text-gray-700 hover:bg-stone-muted"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </a>
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-5 gap-3 pt-2 border-t border-stone-border">
                <div className="p-2.5 bg-stone-muted/40 rounded-lg text-center">
                  <span className="text-[11px] text-gray-500 block">Sent</span>
                  <span className="text-sm font-bold text-deep-slate">{c.metrics?.sent || 0}</span>
                </div>
                <div className="p-2.5 bg-stone-muted/40 rounded-lg text-center">
                  <span className="text-[11px] text-gray-500 block">Opened</span>
                  <span className="text-sm font-bold text-amber-600">{c.metrics?.opened || 0}</span>
                </div>
                <div className="p-2.5 bg-stone-muted/40 rounded-lg text-center">
                  <span className="text-[11px] text-gray-500 block">Clicked</span>
                  <span className="text-sm font-bold text-amber-terracotta">{c.metrics?.clicked || 0}</span>
                </div>
                <div className="p-2.5 bg-red-50/60 rounded-lg text-center">
                  <span className="text-[11px] text-red-600 block font-medium">Compromised</span>
                  <span className="text-sm font-bold text-red-700">{c.metrics?.submitted || 0}</span>
                </div>
                <div className="p-2.5 bg-forest-light/60 rounded-lg text-center">
                  <span className="text-[11px] text-forest block font-medium">Reported</span>
                  <span className="text-sm font-bold text-forest">{c.metrics?.reported || 0}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-border space-y-4">
            <h3 className="font-bold text-deep-slate text-base">สร้างแคมเปญ Phishing Simulation ใหม่</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">ชื่อแคมเปญ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Q3 Phishing Test - IT & HR"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">กลุ่มเป้าหมาย (Target Group)</label>
                <select
                  value={form.targetGroupId}
                  onChange={e => setForm({ ...form, targetGroupId: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                >
                  {targetGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g._count?.targets || 0} คน)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Email Template</label>
                <select
                  value={form.emailTemplateId}
                  onChange={e => setForm({ ...form, emailTemplateId: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                >
                  {emailTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Landing Page Template</label>
                <select
                  value={form.landingPageTemplateId}
                  onChange={e => setForm({ ...form, landingPageTemplateId: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                >
                  {landingTemplates.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">SMTP Profile</label>
                <select
                  value={form.smtpProfileId}
                  onChange={e => setForm({ ...form, smtpProfileId: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                >
                  {smtpProfiles.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.fromEmail})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest-hover shadow-soft"
                >
                  สร้างแคมเปญ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
