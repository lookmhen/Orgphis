import React, { useEffect, useState } from 'react';
import { Send, Play, Square, Download, Plus, CheckCircle2, Clock, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetGroups, setTargetGroups] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [landingTemplates, setLandingTemplates] = useState<any[]>([]);
  const [smtpProfiles, setSmtpProfiles] = useState<any[]>([]);

  const [form, setForm] = useState<{
    name: string;
    description: string;
    targetGroupIds: string[];
    emailTemplateId: string;
    landingPageTemplateId: string;
    smtpProfileId: string;
  }>({
    name: '',
    description: '',
    targetGroupIds: [],
    emailTemplateId: '',
    landingPageTemplateId: '',
    smtpProfileId: ''
  });

  const fetchCampaigns = () => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(setCampaigns);
  };

  const loadDependencies = () => {
    return Promise.all([
      fetch('/api/targets/groups').then(r => r.json()),
      fetch('/api/templates/emails').then(r => r.json()),
      fetch('/api/templates/landing-pages').then(r => r.json()),
      fetch('/api/smtp-profiles').then(r => r.json())
    ]).then(([groups, emails, landings, smtps]) => {
      setTargetGroups(groups);
      setEmailTemplates(emails);
      setLandingTemplates(landings);
      setSmtpProfiles(smtps);
      setForm(f => ({
        ...f,
        targetGroupIds: f.targetGroupIds.length > 0 ? f.targetGroupIds : (groups.length > 0 ? [groups[0].id] : []),
        emailTemplateId: f.emailTemplateId || (emails.length > 0 ? emails[0].id : ''),
        landingPageTemplateId: f.landingPageTemplateId || (landings.length > 0 ? landings[0].id : ''),
        smtpProfileId: f.smtpProfileId || (smtps.length > 0 ? smtps[0].id : '')
      }));
    });
  };

  useEffect(() => {
    fetchCampaigns();
    loadDependencies();
  }, []);

  const handleOpenCreateModal = () => {
    loadDependencies();
    setShowCreateModal(true);
  };

  const handleToggleGroup = (groupId: string) => {
    setForm(prev => {
      const exists = prev.targetGroupIds.includes(groupId);
      if (exists) {
        return { ...prev, targetGroupIds: prev.targetGroupIds.filter(id => id !== groupId) };
      } else {
        return { ...prev, targetGroupIds: [...prev.targetGroupIds, groupId] };
      }
    });
  };

  const handleSelectAllGroups = () => {
    if (form.targetGroupIds.length === targetGroups.length) {
      setForm(prev => ({ ...prev, targetGroupIds: [] }));
    } else {
      setForm(prev => ({ ...prev, targetGroupIds: targetGroups.map(g => g.id) }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.targetGroupIds.length === 0 || !form.emailTemplateId || !form.landingPageTemplateId || !form.smtpProfileId) {
      alert('กรุณาเลือกกลุ่มเป้าหมายอย่างน้อย 1 กลุ่ม, เทมเพลตอีเมล, Landing Page, และ SMTP Profile ให้ครบถ้วน');
      return;
    }

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setShowCreateModal(false);
      setForm({
        name: '',
        description: '',
        targetGroupIds: targetGroups.length > 0 ? [targetGroups[0].id] : [],
        emailTemplateId: emailTemplates[0]?.id || '',
        landingPageTemplateId: landingTemplates[0]?.id || '',
        smtpProfileId: smtpProfiles[0]?.id || ''
      });
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || 'สร้างแคมเปญไม่สำเร็จ');
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm('ยืนยันเริ่มส่งอีเมลจำลอง Phishing สำหรับแคมเปญนี้?')) return;
    const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' });
    if (res.ok) {
      alert('เริ่มรันแคมเปญและส่งอีเมลเรียบร้อยแล้ว');
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || 'เริ่มแคมเปญไม่สำเร็จ');
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

  const handleResetCampaign = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการ Reset สถิติและผลลัพธ์ของแคมเปญ "${name}" กลับเป็น 0 (DRAFT) เพื่อใช้ทดสอบใหม่ใช่หรือไม่?`)) return;
    const res = await fetch(`/api/campaigns/${id}/reset`, { method: 'POST' });
    if (res.ok) {
      alert('Reset สถิติของแคมเปญเรียบร้อยแล้ว');
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || 'Reset แคมเปญไม่สำเร็จ');
    }
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!confirm(`⚠️ ยืนยันลบแคมเปญ "${name}" ออกจากระบบถาวร?\n(สถิติและประวัติการส่งทั้งหมดของแคมเปญนี้จะถูกลบออก)`)) return;
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('ลบแคมเปญเรียบร้อยแล้ว');
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || 'ลบแคมเปญไม่สำเร็จ');
    }
  };

  const handleResetAllCampaigns = async () => {
    const confirmation = prompt('⚠️ คำเตือนระดับสูงสุด: คุณต้องการล้างประวัติการทดสอบและแคมเปญทั้งหมดออกจากระบบเพื่อเริ่มใช้งานจริงใช่หรือไม่?\n\n(กลุ่มเป้าหมาย, เทมเพลต, และ SMTP Profile จะยังคงอยู่ครบถ้วน)\n\nพิมพ์คำว่า "RESET" เพื่อยืนยัน:');
    if (confirmation !== 'RESET') {
      if (confirmation !== null) alert('คำยืนยันไม่ถูกต้อง ยกเลิกการล้างข้อมูล');
      return;
    }

    const res = await fetch('/api/campaigns/reset-all', { method: 'POST' });
    if (res.ok) {
      alert('ล้างประวัติการทดสอบทั้งหมดเรียบร้อยแล้ว ระบบสะอาดพร้อมเริ่มใช้งานจริง');
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || 'ล้างประวัติไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">การจัดการแคมเปญ (Campaigns)</h2>
          <p className="text-sm text-gray-500 mt-1">สร้าง รันคิวส่งอีเมลจำลอง ติดตามผล และดาวน์โหลดรายงานสถิติ</p>
        </div>
        <div className="flex items-center space-x-2">
          {campaigns.length > 0 && (
            <button
              onClick={handleResetAllCampaigns}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-xs transition-all"
              title="ล้างแคมเปญและประวัติการทดสอบทั้งหมดเพื่อเริ่มใช้งานจริง"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              <span>ล้างประวัติทั้งหมด (Reset All)</span>
            </button>
          )}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-hover shadow-soft"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างแคมเปญใหม่</span>
          </button>
        </div>
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
                    กลุ่มผู้รับ: <span className="font-semibold text-deep-slate">
                      {c.targetGroupNames && c.targetGroupNames.length > 0
                        ? c.targetGroupNames.join(', ')
                        : c.targetGroup?.name || 'ไม่มีกลุ่ม'}
                    </span> &bull;
                    เทมเพลต: <span className="font-semibold text-deep-slate">{c.emailTemplate?.name}</span> &bull;
                    SMTP Profile: <span className="font-semibold text-deep-slate">{c.smtpProfile?.name}</span>
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

                  {c.status !== 'RUNNING' && (
                    <button
                      onClick={() => handleResetCampaign(c.id, c.name)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 border border-stone-border text-gray-600 hover:text-deep-slate hover:bg-stone-muted rounded-lg text-xs font-medium transition-all"
                      title="Reset สถิติของแคมเปญนี้กลับเป็น 0 เพื่อเริ่มส่งใหม่"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}

                  <a
                    href={`/api/campaigns/${c.id}/export`}
                    download
                    className="flex items-center space-x-1 px-3 py-1.5 border border-stone-border rounded-lg text-xs font-semibold text-gray-700 hover:bg-stone-muted transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV Report</span>
                  </a>

                  <button
                    onClick={() => handleDeleteCampaign(c.id, c.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="ลบแคมเปญนี้ทิ้ง"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mini Stats Funnel */}
              <div className="grid grid-cols-5 gap-3 pt-2">
                {[
                  { label: 'ส่งแล้ว (Sent)', val: c.stats?.sent || 0, color: 'text-deep-slate' },
                  { label: 'เปิดอ่าน (Opened)', val: c.stats?.opened || 0, color: 'text-forest' },
                  { label: 'คลิกลิงก์ (Clicked)', val: c.stats?.clicked || 0, color: 'text-amber-terracotta' },
                  { label: 'กรอกฟอร์ม (Submitted)', val: c.stats?.submitted || 0, color: 'text-red-600 font-bold' },
                  { label: 'แจ้งเบาะแส (Reported)', val: c.stats?.reported || 0, color: 'text-blue-600 font-bold' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-stone-muted/40 p-2.5 rounded-lg border border-stone-border/40 text-center">
                    <p className="text-[11px] text-gray-500">{s.label}</p>
                    <p className={`text-base font-mono font-semibold mt-0.5 ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-border space-y-4">
            <h3 className="font-bold text-deep-slate text-base">➕ สร้างแคมเปญทดสอบ Phishing</h3>
            
            {/* Warning if no targets or smtps */}
            {(targetGroups.length === 0 || smtpProfiles.length === 0) && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                <p className="font-semibold flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-amber-terracotta" />
                  <span>ข้อมูลที่จำเป็นยังไม่ครบ:</span>
                </p>
                {targetGroups.length === 0 && (
                  <p>&bull; ยังไม่มีกลุ่มเป้าหมาย (กรุณาไปสร้างที่เมนู <Link to="/targets" className="underline font-semibold">Targets</Link>)</p>
                )}
                {smtpProfiles.length === 0 && (
                  <p>&bull; ยังไม่มีโปรไฟล์การส่งอีเมล (กรุณาไปสร้างที่เมนู <Link to="/smtp" className="underline font-semibold">SMTP Profiles</Link>)</p>
                )}
              </div>
            )}

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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-medium text-gray-700">
                    กลุ่มเป้าหมาย / แผนก ({form.targetGroupIds.length} กลุ่มที่เลือก)
                  </label>
                  {targetGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllGroups}
                      className="text-[11px] text-forest font-semibold hover:underline"
                    >
                      {form.targetGroupIds.length === targetGroups.length ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทุกกลุ่ม'}
                    </button>
                  )}
                </div>

                {targetGroups.length === 0 ? (
                  <p className="p-3 bg-stone-muted text-gray-500 rounded-lg text-xs">
                    ยังไม่มีกลุ่มเป้าหมาย กรุณาสร้างที่เมนู <Link to="/targets" className="underline font-semibold text-forest">Targets</Link>
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-stone-border rounded-lg p-2 space-y-1.5 bg-stone-50/40">
                    {targetGroups.map(g => {
                      const isSelected = form.targetGroupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          onClick={() => handleToggleGroup(g.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border text-xs transition-all ${
                            isSelected
                              ? 'bg-forest-light border-forest text-forest font-medium'
                              : 'bg-white border-stone-border/70 text-gray-700 hover:bg-stone-muted'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by label onClick
                              className="rounded text-forest focus:ring-forest pointer-events-none"
                            />
                            <span>{g.name}</span>
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-stone-border/40 text-gray-600">
                            {g._count?.targets || 0} คน
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">สามารถเลือกได้หลายกลุ่มพร้อมกัน (ระบบจะกรองอีเมลที่ซ้ำกันออกให้อัตโนมัติ)</p>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Email Template</label>
                <select
                  required
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
                  required
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
                <label className="block font-medium text-gray-700 mb-1">SMTP Profile (เซิร์ฟเวอร์ส่งอีเมล)</label>
                <select
                  required
                  value={form.smtpProfileId}
                  onChange={e => setForm({ ...form, smtpProfileId: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                >
                  {smtpProfiles.length === 0 ? (
                    <option value="">-- ยังไม่มี SMTP Profile --</option>
                  ) : (
                    smtpProfiles.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.fromEmail})</option>
                    ))
                  )}
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
                  disabled={targetGroups.length === 0 || smtpProfiles.length === 0 || form.targetGroupIds.length === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-soft ${
                    targetGroups.length === 0 || smtpProfiles.length === 0 || form.targetGroupIds.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-forest text-white hover:bg-forest-hover'
                  }`}
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
