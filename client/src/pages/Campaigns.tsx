import React, { useEffect, useState } from 'react';
import { Send, Play, Square, Download, Plus, CheckCircle2, Clock, AlertCircle, RotateCcw, Trash2, RefreshCw, Calendar, Sliders, Users, Search, X, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    isMultiTemplate: boolean;
    emailTemplateIds: string[];
    landingPageTemplateId: string;
    smtpProfileId: string;
    scheduleType: 'IMMEDIATE' | 'RANDOMIZED';
    startDate: string;
    endDate: string;
    allowedDays: number[];
    dailyStartTime: string;
    dailyEndTime: string;
    randomizeSendTimes: boolean;
  }>({
    name: '',
    description: '',
    targetGroupIds: [],
    emailTemplateId: '',
    isMultiTemplate: false,
    emailTemplateIds: [],
    landingPageTemplateId: '',
    smtpProfileId: '',
    scheduleType: 'IMMEDIATE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    allowedDays: [1, 2, 3, 4, 5],
    dailyStartTime: '08:30',
    dailyEndTime: '17:00',
    randomizeSendTimes: true
  });

  // Viewing campaign recipients modal states
  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<string>('ALL');

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCampaigns();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleViewRecipients = async (campaignId: string, campaignName: string) => {
    setRecipientsLoading(true);
    setViewingCampaign({ id: campaignId, name: campaignName, campaignTargets: [] });
    setRecipientSearch('');
    setRecipientStatusFilter('ALL');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingCampaign(data);
      } else {
        alert('ไม่สามารถโหลดข้อมูลรายชื่อผู้รับได้');
      }
    } catch (err) {
      console.error('Failed to fetch campaign recipients:', err);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setRecipientsLoading(false);
    }
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
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

  const handleToggleEmailTemplate = (templateId: string) => {
    setForm(prev => {
      const exists = prev.emailTemplateIds.includes(templateId);
      if (exists) {
        return { ...prev, emailTemplateIds: prev.emailTemplateIds.filter(id => id !== templateId) };
      } else {
        return { ...prev, emailTemplateIds: [...prev.emailTemplateIds, templateId] };
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

  const handleToggleDay = (dayNum: number) => {
    setForm(prev => {
      const exists = prev.allowedDays.includes(dayNum);
      if (exists) {
        if (prev.allowedDays.length <= 1) return prev; // Keep at least one day
        return { ...prev, allowedDays: prev.allowedDays.filter(d => d !== dayNum) };
      } else {
        return { ...prev, allowedDays: [...prev.allowedDays, dayNum].sort() };
      }
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.targetGroupIds.length === 0 || !form.landingPageTemplateId || !form.smtpProfileId) {
      alert('กรุณาเลือกกลุ่มเป้าหมายอย่างน้อย 1 กลุ่ม, Landing Page, และ SMTP Profile ให้ครบถ้วน');
      return;
    }

    if (form.isMultiTemplate) {
      if (form.emailTemplateIds.length < 2) {
        alert('กรุณาเลือกอย่างน้อย 2 เทมเพลตสำหรับโหมดสุ่มหลายเทมเพลต (Multi-Vector)');
        return;
      }
    } else {
      if (!form.emailTemplateId) {
        alert('กรุณาเลือกเทมเพลตอีเมล');
        return;
      }
    }

    const payload = {
      ...form,
      emailTemplateIds: form.isMultiTemplate ? form.emailTemplateIds : [form.emailTemplateId],
      allowedDays: form.allowedDays.join(',')
    };

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setShowCreateModal(false);
      setForm({
        name: '',
        description: '',
        targetGroupIds: targetGroups.length > 0 ? [targetGroups[0].id] : [],
        emailTemplateId: emailTemplates[0]?.id || '',
        isMultiTemplate: false,
        emailTemplateIds: [],
        landingPageTemplateId: landingTemplates[0]?.id || '',
        smtpProfileId: smtpProfiles[0]?.id || '',
        scheduleType: 'IMMEDIATE',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        allowedDays: [1, 2, 3, 4, 5],
        dailyStartTime: '08:30',
        dailyEndTime: '17:00',
        randomizeSendTimes: true
      });
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || 'สร้างแคมเปญไม่สำเร็จ');
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm('ยืนยันเริ่มส่งอีเมลจำลอง Phishing สำหรับแคมเปญนี้?')) return;
    
    // Automatically infer accessible Base URL from client browser
    // In dev mode (port 5173), target backend port 3000
    let clientBaseUrl = window.location.origin;
    if (clientBaseUrl.includes(':5173')) {
      clientBaseUrl = clientBaseUrl.replace(':5173', ':3000');
    }

    const res = await fetch(`/api/campaigns/${id}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: clientBaseUrl })
    });
    if (res.ok) {
      const data = await res.json();
      alert(data.message || 'เริ่มรันแคมเปญและส่งอีเมลเรียบร้อยแล้ว');
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
    const confirmation = prompt(
      '⚠️ คำเตือนระดับสูงสุด: คุณต้องการล้างประวัติการทดสอบและแคมเปญทั้งหมดออกจากระบบใช่หรือไม่?\n\n' +
      '• ประวัติแคมเปญ, สถิติการส่ง, ผลการคลิก และ Event Logs ทั้งหมดจะถูกลบเป็น 0\n' +
      '• กลุ่มเป้าหมาย (Targets), เทมเพลต (Templates), และโปรไฟล์ SMTP จะยังคงอยู่ครบถ้วน\n\n' +
      '👉 กรุณาพิมพ์คำว่า: RESET (ตัวพิมพ์ใหญ่ภาษาอังกฤษ) เพื่อยืนยัน:'
    );

    if (confirmation === null) return; // User clicked Cancel

    if (confirmation.trim().toUpperCase() !== 'RESET') {
      alert('❌ คำยืนยันไม่ถูกต้อง! ยกเลิกการล้างข้อมูล\n(คุณต้องพิมพ์คำว่า "RESET" ตัวพิมพ์ใหญ่ภาษาอังกฤษ)');
      return;
    }

    const res = await fetch('/api/campaigns/reset-all', { method: 'POST' });
    if (res.ok) {
      alert('✅ ล้างประวัติการทดสอบทั้งหมดเรียบร้อยแล้ว ระบบสะอาดพร้อมเริ่มใช้งานจริง');
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
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-stone-border text-gray-700 bg-white hover:bg-stone-muted rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            title="รีเฟรชข้อมูลและสถิติล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-forest ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช (Refresh)</span>
          </button>
          {campaigns.length > 0 && (
            <a
              href="/api/dashboard/export"
              download={`phishcentral-summary-${new Date().toISOString().split('T')[0]}.csv`}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-forest/30 text-forest bg-forest-light/60 hover:bg-forest-light rounded-xl text-xs font-semibold shadow-xs transition-all"
              title="ดาวน์โหลดรายงานสรุปภาพรวมระดับองค์กรเป็นไฟล์ CSV"
            >
              <Download className="w-3.5 h-3.5 text-forest" />
              <span>สรุปภาพรวม (Summary CSV)</span>
            </a>
          )}
          {campaigns.length > 0 && (
            <button
              onClick={handleResetAllCampaigns}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-xs transition-all"
              title="ล้างแคมเปญและประวัติการทดสอบทั้งหมด (ต้องพิมพ์ RESET เพื่อยืนยัน)"
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
                    {c.scheduleType === 'RANDOMIZED' && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>Randomized Schedule ({c.startDate ? new Date(c.startDate).toLocaleDateString() : ''} - {c.endDate ? new Date(c.endDate).toLocaleDateString() : ''})</span>
                      </span>
                    )}
                    {c.campaignEmailTemplates && c.campaignEmailTemplates.length > 1 && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        <Sliders className="w-3 h-3 text-purple-600" />
                        <span>สุ่ม {c.campaignEmailTemplates.length} เทมเพลต (Multi-Vector)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    กลุ่มผู้รับ: <span className="font-semibold text-deep-slate">
                      {c.targetGroupNames && c.targetGroupNames.length > 0
                        ? c.targetGroupNames.join(', ')
                        : c.targetGroup?.name || 'ไม่มีกลุ่ม'}
                    </span> &bull;
                    เทมเพลต: <span className="font-semibold text-deep-slate">
                      {c.campaignEmailTemplates && c.campaignEmailTemplates.length > 1
                        ? `สุ่ม ${c.campaignEmailTemplates.length} เทมเพลต (${c.campaignEmailTemplates.map((cet: any) => cet.emailTemplate?.name).join(', ')})`
                        : c.emailTemplate?.name}
                    </span> &bull;
                    SMTP Profile: <span className="font-semibold text-deep-slate">{c.smtpProfile?.name}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                    <button
                      onClick={() => handleLaunch(c.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-hover shadow-soft"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{c.scheduleType === 'RANDOMIZED' ? 'เปิดระบบส่งตามตาราง (Start Schedule)' : 'สั่งเริ่มส่ง (Launch)'}</span>
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

                  <button
                    onClick={() => handleViewRecipients(c.id, c.name)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-forest-light/80 text-forest hover:bg-forest-light border border-forest/30 rounded-lg text-xs font-semibold transition-all shadow-xs"
                    title="เปิดดูตารางรายชื่อผู้รับและผลลัพธ์การทดสอบบนหน้าเว็บ"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>ดูรายชื่อผู้รับ</span>
                  </button>

                  <a
                    href={`/api/campaigns/${c.id}/export`}
                    download
                    className="flex items-center space-x-1 px-3 py-1.5 border border-stone-border rounded-lg text-xs font-semibold text-gray-700 hover:bg-stone-muted transition-all"
                    title="ดาวน์โหลดรายงานสรุปแยกรายบุคคลเป็นไฟล์ CSV สำหรับเปิดใน Excel"
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

              {/* Mini Stats Funnel (4 Stages) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { label: 'ส่งแล้ว (Sent)', val: c.stats?.sent || 0, color: 'text-deep-slate' },
                  { label: 'คลิกลิงก์ (Clicked)', val: c.stats?.clicked || 0, color: 'text-amber-terracotta' },
                  { label: 'กรอกฟอร์ม (Submitted)', val: c.stats?.submitted || 0, color: 'text-red-600 font-bold' },
                  { label: 'แจ้งเบาะแส (Reported)', val: c.stats?.reported || 0, color: 'text-forest font-bold' }
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
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-border overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-stone-border bg-white flex-shrink-0">
              <h3 className="font-bold text-deep-slate text-base">➕ สร้างแคมเปญทดสอบ Phishing</h3>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-deep-slate font-bold p-1 rounded-lg hover:bg-stone-muted transition-all"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden text-xs">
              {/* Scrollable Form Body */}
              <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
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

                <div>
                  <label className="block font-medium text-gray-700 mb-1">ชื่อแคมเปญ *</label>
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
                              onChange={() => handleToggleGroup(g.id)}
                              className="rounded text-forest focus:ring-forest cursor-pointer"
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-medium text-gray-700">Email Template</label>
                  <div className="flex items-center space-x-1 bg-stone-muted p-0.5 rounded-lg border border-stone-border/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isMultiTemplate: false })}
                      className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                        !form.isMultiTemplate
                          ? 'bg-white text-forest shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      แบบเดี่ยว (Single)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultIds = form.emailTemplateIds.length > 0
                          ? form.emailTemplateIds
                          : emailTemplates.slice(0, 2).map(t => t.id);
                        setForm({ ...form, isMultiTemplate: true, emailTemplateIds: defaultIds });
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center space-x-1 ${
                        form.isMultiTemplate
                          ? 'bg-forest text-white shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <span>สุ่มหลายแบบ (Multi-Vector)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sand-accent text-sand-dark font-mono">
                        สุ่มกระจาย
                      </span>
                    </button>
                  </div>
                </div>

                {!form.isMultiTemplate ? (
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
                ) : (
                  <div className="space-y-2">
                    <div className="border border-stone-border rounded-lg p-2.5 max-h-48 overflow-y-auto space-y-1.5 bg-stone-light/50">
                      {emailTemplates.length === 0 ? (
                        <p className="text-xs text-gray-500 italic p-2">ไม่มีเทมเพลตอีเมลในระบบ</p>
                      ) : (
                        emailTemplates.map(t => {
                          const isSelected = form.emailTemplateIds.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-forest-light border-forest text-forest font-medium'
                                  : 'bg-white border-stone-border/70 text-gray-700 hover:bg-stone-muted'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate pr-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleEmailTemplate(t.id)}
                                  className="rounded text-forest focus:ring-forest cursor-pointer"
                                />
                                <span className="truncate">{t.name}</span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-stone-border/40 text-gray-500 flex-shrink-0">
                                {t.category || 'General'}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                      <span>เลือกแล้ว <strong className="text-forest font-semibold">{form.emailTemplateIds.length}</strong> / {emailTemplates.length} แบบ</span>
                      <span className="text-[10px] text-amber-700 font-medium">สุ่มกระจาย 1 คนต่อ 1 รูปแบบ ไม่ซ้ำกัน</span>
                    </div>
                  </div>
                )}
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

              {/* Schedule Details Section */}
              <div className="border-t border-stone-border pt-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-deep-slate text-xs flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-forest" />
                      <span>กำหนดเวลาส่ง (Schedule Details)</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">เลือกรูปแบบการกระจายส่งอีเมลเพื่อความสมจริง</p>
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, scheduleType: 'IMMEDIATE' })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      form.scheduleType === 'IMMEDIATE'
                        ? 'bg-white text-forest shadow-xs'
                        : 'text-gray-500 hover:text-deep-slate'
                    }`}
                  >
                    ส่งทันที (Immediate Dispatch)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, scheduleType: 'RANDOMIZED' })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      form.scheduleType === 'RANDOMIZED'
                        ? 'bg-white text-forest shadow-xs'
                        : 'text-gray-500 hover:text-deep-slate'
                    }`}
                  >
                    สุ่มกระจายเวลา (Randomized Schedule) ⭐
                  </button>
                </div>

                {form.scheduleType === 'RANDOMIZED' && (
                  <div className="p-3 bg-stone-50/80 border border-stone-border rounded-xl space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                          วันที่เริ่มจำลอง (Simulation start) *
                        </label>
                        <input
                          type="date"
                          required
                          value={form.startDate}
                          onChange={e => setForm({ ...form, startDate: e.target.value })}
                          className="w-full p-2 border border-stone-border rounded-lg bg-white outline-none focus:border-forest text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                          วันที่สิ้นสุด (Simulation end) *
                        </label>
                        <input
                          type="date"
                          required
                          value={form.endDate}
                          onChange={e => setForm({ ...form, endDate: e.target.value })}
                          className="w-full p-2 border border-stone-border rounded-lg bg-white outline-none focus:border-forest text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1.5">
                        วันที่อนุญาตให้ส่ง (Simulation scoping) *
                      </label>
                      <div className="grid grid-cols-7 gap-1.5 text-center">
                        {[
                          { num: 1, label: 'Mon', full: 'จันทร์' },
                          { num: 2, label: 'Tue', full: 'อังคาร' },
                          { num: 3, label: 'Wed', full: 'พุธ' },
                          { num: 4, label: 'Thu', full: 'พฤหัส' },
                          { num: 5, label: 'Fri', full: 'ศุกร์' },
                          { num: 6, label: 'Sat', full: 'เสาร์' },
                          { num: 7, label: 'Sun', full: 'อาทิตย์' }
                        ].map(day => {
                          const isChecked = form.allowedDays.includes(day.num);
                          return (
                            <button
                              type="button"
                              key={day.num}
                              onClick={() => handleToggleDay(day.num)}
                              className={`py-1.5 px-1 rounded-lg border text-xs font-medium transition-all ${
                                isChecked
                                  ? 'bg-forest-light border-forest text-forest font-semibold'
                                  : 'bg-white border-stone-border text-gray-400 hover:bg-stone-muted'
                              }`}
                              title={day.full}
                            >
                              <div>{day.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                          เวลาเริ่มส่งประจำวัน (Start Time)
                        </label>
                        <input
                          type="time"
                          value={form.dailyStartTime}
                          onChange={e => setForm({ ...form, dailyStartTime: e.target.value })}
                          className="w-full p-2 border border-stone-border rounded-lg bg-white outline-none focus:border-forest text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                          เวลาหยุดส่งประจำวัน (End Time)
                        </label>
                        <input
                          type="time"
                          value={form.dailyEndTime}
                          onChange={e => setForm({ ...form, dailyEndTime: e.target.value })}
                          className="w-full p-2 border border-stone-border rounded-lg bg-white outline-none focus:border-forest text-xs"
                        />
                      </div>
                    </div>

                    <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.randomizeSendTimes}
                        onChange={e => setForm({ ...form, randomizeSendTimes: e.target.checked })}
                        className="rounded text-forest focus:ring-forest cursor-pointer"
                      />
                      <span className="text-xs text-gray-700 font-medium">
                        สุ่มเวลาและกระจายส่งอัตโนมัติ (Randomize send times)
                      </span>
                    </label>
                    <p className="text-[10px] text-gray-400">
                      ระบบจะสุ่มเวลาส่งของพนักงานแต่ละคนไม่ซ้ำกัน ป้องกันพนักงานส่งต่อข้อมูลเตือนกัน และป้องกัน Mail Server ดักจับสแปม
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="flex justify-end space-x-2 p-4 border-t border-stone-border bg-stone-50/70 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={targetGroups.length === 0 || smtpProfiles.length === 0 || form.targetGroupIds.length === 0}
                className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-soft transition-all ${
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

      {/* VIEW RECIPIENTS MODAL */}
      {viewingCampaign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-border overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-stone-border bg-white flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-forest-light text-forest flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-gray-900 text-base">รายชื่อผู้รับ & ผลลัพธ์การทดสอบ</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-gray-700 border border-stone-200">
                      แคมเปญ: {viewingCampaign.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ตรวจสอบรายชื่อพนักงาน สถานะการส่ง การคลิกลิงก์ และการเผลอกรอกข้อมูลแบบเรียลไทม์
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/api/campaigns/${viewingCampaign.id}/export`}
                  download
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-forest-light/60 text-forest hover:bg-forest-light border border-forest/30 rounded-xl text-xs font-semibold transition-all shadow-xs"
                  title="ดาวน์โหลดข้อมูลทั้งหมดนี้เป็นไฟล์ CSV สำหรับเปิดใน Microsoft Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel (CSV)</span>
                </a>
                <button
                  onClick={() => setViewingCampaign(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-stone-muted rounded-xl transition-all"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* KPI Summary Strip */}
            {(() => {
              const targets = viewingCampaign.campaignTargets || [];
              const totalCount = targets.length;
              const pendingCount = targets.filter((t: any) => !t.isSent).length;
              const sentCount = targets.filter((t: any) => t.isSent).length;
              const clickedCount = targets.filter((t: any) => t.isClicked).length;
              const compromisedCount = targets.filter((t: any) => t.isSubmitted).length;
              const reportedCount = targets.filter((t: any) => t.isReported).length;

              const filterTabs = [
                { id: 'ALL', label: 'ทั้งหมด', count: totalCount, badgeClass: 'bg-stone-200 text-gray-800' },
                { id: 'SENT', label: 'ส่งแล้ว', count: sentCount, badgeClass: 'bg-blue-100 text-blue-800 font-semibold' },
                { id: 'CLICKED', label: 'คลิกลิงก์', count: clickedCount, badgeClass: 'bg-amber-100 text-amber-800 font-semibold' },
                { id: 'COMPROMISED', label: 'เผลอกรอกข้อมูล', count: compromisedCount, badgeClass: 'bg-red-100 text-red-800 font-bold' },
                { id: 'REPORTED', label: 'แจ้งเบาะแส', count: reportedCount, badgeClass: 'bg-emerald-100 text-emerald-800 font-bold' },
                { id: 'PENDING', label: 'รอดำเนินการ', count: pendingCount, badgeClass: 'bg-gray-200 text-gray-600' }
              ];

              const matchStatus = (ct: any, filter: string) => {
                if (filter === 'ALL') return true;
                if (filter === 'SENT') return Boolean(ct.isSent);
                if (filter === 'CLICKED') return Boolean(ct.isClicked);
                if (filter === 'COMPROMISED') return Boolean(ct.isSubmitted);
                if (filter === 'REPORTED') return Boolean(ct.isReported);
                if (filter === 'PENDING') return !ct.isSent;
                return true;
              };

              const matchesSearch = (ct: any, query: string) => {
                if (!query.trim()) return true;
                const q = query.toLowerCase().trim();
                const fullName = `${ct.target?.firstName || ''} ${ct.target?.lastName || ''}`.toLowerCase();
                const email = (ct.target?.email || '').toLowerCase();
                const dept = (ct.target?.department || '').toLowerCase();
                const tmplName = (ct.emailTemplate?.name || viewingCampaign.emailTemplate?.name || '').toLowerCase();
                return fullName.includes(q) || email.includes(q) || dept.includes(q) || tmplName.includes(q);
              };

              const filtered = targets.filter((ct: any) => matchStatus(ct, recipientStatusFilter) && matchesSearch(ct, recipientSearch));

              return (
                <>
                  <div className="bg-warm-sand/50 p-4 border-b border-stone-border space-y-3 flex-shrink-0">
                    {/* Status Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {filterTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setRecipientStatusFilter(tab.id)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            recipientStatusFilter === tab.id
                              ? 'bg-deep-slate text-white border-deep-slate shadow-xs'
                              : 'bg-white text-gray-600 border-stone-border hover:bg-stone-muted'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${recipientStatusFilter === tab.id ? 'bg-white/20 text-white' : tab.badgeClass}`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Search Box */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        placeholder="ค้นหาด้วยชื่อ, อีเมล, แผนก, หรือเทมเพลตที่ได้รับ..."
                        className="w-full pl-9 pr-8 py-2 bg-white border border-stone-border rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                      />
                      {recipientSearch && (
                        <button
                          onClick={() => setRecipientSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recipient Table Area */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {recipientsLoading ? (
                      <div className="py-16 text-center text-gray-500">
                        <RefreshCw className="w-7 h-7 text-forest animate-spin mx-auto mb-2" />
                        <p className="text-xs">กำลังโหลดข้อมูลรายชื่อผู้รับ...</p>
                      </div>
                    ) : targets.length === 0 ? (
                      <div className="py-16 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-medium">ยังไม่มีรายชื่อผู้รับในแคมเปญนี้</p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="py-16 text-center text-gray-400">
                        <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-xs">ไม่พบรายชื่อผู้รับที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรอง</p>
                      </div>
                    ) : (
                      <div className="border border-stone-border rounded-xl overflow-hidden shadow-xs bg-white">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-stone-50 border-b border-stone-border text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-3 w-10 text-center">#</th>
                                <th className="py-3 px-3">พนักงานผู้รับ</th>
                                <th className="py-3 px-3">แผนก</th>
                                <th className="py-3 px-3">เทมเพลตที่ได้รับ</th>
                                <th className="py-3 px-3 text-center">สถานะ</th>
                                <th className="py-3 px-3">เวลาส่ง</th>
                                <th className="py-3 px-3">เวลาคลิก</th>
                                <th className="py-3 px-3">เวลากรอกข้อมูล</th>
                                <th className="py-3 px-3">เวลาแจ้งเตือน</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-border/60">
                              {filtered.map((ct: any, idx: number) => {
                                const fullName = `${ct.target?.firstName || ''} ${ct.target?.lastName || ''}`.trim();
                                const templateName = ct.emailTemplate?.name || viewingCampaign.emailTemplate?.name || 'General Template';

                                return (
                                  <tr key={ct.id || idx} className="hover:bg-warm-sand/40 transition-colors">
                                    <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-semibold text-deep-slate">
                                        {fullName || 'ไม่ระบุชื่อ'}
                                      </div>
                                      <div className="text-[11px] text-gray-500 font-mono">
                                        {ct.target?.email}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="px-2 py-0.5 bg-stone-100 text-gray-700 rounded text-[11px]">
                                        {ct.target?.department || 'ไม่ระบุ'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="text-gray-800 font-medium truncate max-w-[180px]" title={templateName}>
                                        {templateName}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      {ct.isSubmitted ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                          เผลอกรอกข้อมูล
                                        </span>
                                      ) : ct.isReported ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          แจ้งเบาะแส
                                        </span>
                                      ) : ct.isClicked ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                          คลิกลิงก์
                                        </span>
                                      ) : ct.isSent ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                                          ส่งแล้ว
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                          รอดำเนินการ
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                                      {formatTimestamp(ct.sentAt)}
                                    </td>
                                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                                      {ct.clickedAt ? (
                                        <span className="text-amber-700 font-medium">{formatTimestamp(ct.clickedAt)}</span>
                                      ) : '-'}
                                    </td>
                                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                                      {ct.submittedAt ? (
                                        <span className="text-red-700 font-bold">{formatTimestamp(ct.submittedAt)}</span>
                                      ) : '-'}
                                    </td>
                                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                                      {ct.reportedAt ? (
                                        <span className="text-forest font-semibold">{formatTimestamp(ct.reportedAt)}</span>
                                      ) : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between p-4 border-t border-stone-border bg-stone-50/70 flex-shrink-0">
                    <div className="text-xs text-gray-500 font-medium">
                      แสดง {filtered.length} จากทั้งหมด {targets.length} รายการ
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/api/campaigns/${viewingCampaign.id}/export`}
                        download
                        className="px-3.5 py-1.5 border border-stone-border bg-white hover:bg-stone-muted text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด CSV (Excel)</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setViewingCampaign(null)}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-deep-slate text-white hover:bg-gray-800 transition-all shadow-xs"
                      >
                        ปิดหน้าต่าง
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

