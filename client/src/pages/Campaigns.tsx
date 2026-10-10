import React, { useEffect, useState } from 'react';
import { Send, Play, Pause, Square, Download, Plus, CheckCircle2, Clock, AlertCircle, RotateCcw, Trash2, RefreshCw, Calendar, Sliders, Users, Search, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ChevronsUpDown, ShieldCheck } from 'lucide-react';
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

  // Expand/collapse campaign accordion state
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedCampaignIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedCampaignIds.size === campaigns.length) {
      setExpandedCampaignIds(new Set());
    } else {
      setExpandedCampaignIds(new Set(campaigns.map(c => c.id)));
    }
  };

  // Viewing campaign recipients modal states
  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<string>('ALL');
  const [recipientSortKey, setRecipientSortKey] = useState<
    'index' | 'name' | 'department' | 'template' | 'status' | 'scheduledAt' | 'sentAt' | 'clickedAt' | 'submittedAt' | 'reportedAt'
  >('scheduledAt');
  const [recipientSortDir, setRecipientSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : []);
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
    setRecipientSortKey('scheduledAt');
    setRecipientSortDir('asc');
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

  // Simplified manual report toggle handler
  const handleToggleManualReport = async (ct: any, isReporting: boolean) => {
    if (!viewingCampaign) return;
    const fullName = `${ct.target?.firstName || ''} ${ct.target?.lastName || ''}`.trim() || ct.target?.email;

    if (isReporting) {
      if (!confirm(`ยืนยันบันทึกว่าคุณ "${fullName}" (${ct.target?.email}) มีการแจ้งเบาะแสว่าพบอีเมลแปลกปลอมเข้ามาใช่หรือไม่?`)) return;

      try {
        const res = await fetch(`/api/campaigns/${viewingCampaign.id}/targets/${ct.id}/manual-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: 'มีการแจ้งเตือนเข้ามา' })
        });

        if (res.ok) {
          const data = await res.json();
          setViewingCampaign((prev: any) => {
            if (!prev) return prev;
            const updatedTargets = prev.campaignTargets.map((t: any) => {
              if (t.id === ct.id) {
                return {
                  ...t,
                  isReported: true,
                  reportedAt: data.campaignTarget?.reportedAt || new Date().toISOString()
                };
              }
              return t;
            });
            return { ...prev, campaignTargets: updatedTargets };
          });
          fetchCampaigns();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'บันทึกการแจ้งไม่สำเร็จ');
        }
      } catch (err) {
        console.error('Failed to submit manual report:', err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      }
    } else {
      if (!confirm(`คุณต้องการยกเลิกการบันทึกแจ้งเบาะแสของ "${fullName}" ใช่หรือไม่?`)) return;

      try {
        const res = await fetch(`/api/campaigns/${viewingCampaign.id}/targets/${ct.id}/manual-report/cancel`, {
          method: 'POST'
        });

        if (res.ok) {
          setViewingCampaign((prev: any) => {
            if (!prev) return prev;
            const updatedTargets = prev.campaignTargets.map((t: any) => {
              if (t.id === ct.id) {
                return {
                  ...t,
                  isReported: false,
                  reportedAt: null
                };
              }
              return t;
            });
            return { ...prev, campaignTargets: updatedTargets };
          });
          fetchCampaigns();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'ยกเลิกการบันทึกไม่สำเร็จ');
        }
      } catch (err) {
        console.error('Failed to cancel manual report:', err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      }
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
      fetch('/api/targets/groups').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/templates/emails').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/templates/landing-pages').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/smtp-profiles').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([groups, emails, landings, smtps]) => {
      const validGroups = Array.isArray(groups) ? groups : [];
      const validEmails = Array.isArray(emails) ? emails : [];
      const validLandings = Array.isArray(landings) ? landings : [];
      const validSmtps = Array.isArray(smtps) ? smtps : [];

      setTargetGroups(validGroups);
      setEmailTemplates(validEmails);
      setLandingTemplates(validLandings);
      setSmtpProfiles(validSmtps);
      setForm(f => ({
        ...f,
        targetGroupIds: f.targetGroupIds.length > 0 ? f.targetGroupIds : (validGroups.length > 0 ? [validGroups[0].id] : []),
        emailTemplateId: f.emailTemplateId || (validEmails.length > 0 ? validEmails[0].id : ''),
        landingPageTemplateId: f.landingPageTemplateId || (validLandings.length > 0 ? validLandings[0].id : ''),
        smtpProfileId: f.smtpProfileId || (validSmtps.length > 0 ? validSmtps[0].id : '')
      }));
    }).catch(err => {
      console.error('Failed to load campaign dependencies:', err);
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
      allowedDays: form.allowedDays.join(','),
      timezoneOffset: new Date().getTimezoneOffset()
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

  const handlePause = async (id: string) => {
    if (!confirm('ต้องการพักการส่งอีเมลสำหรับแคมเปญนี้ชั่วคราว (Pause) ใช่หรือไม่?')) return;
    const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' });
    if (res.ok) {
      alert('พักการส่งแคมเปญชั่วคราวเรียบร้อยแล้ว');
      fetchCampaigns();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'พักแคมเปญไม่สำเร็จ');
    }
  };

  const handleResume = async (id: string) => {
    if (!confirm('ยืนยันให้ระบบรันต่อ (Resume) และส่งอีเมลต่อจากเดิม?')) return;

    let clientBaseUrl = window.location.origin;
    if (clientBaseUrl.includes(':5173')) {
      clientBaseUrl = clientBaseUrl.replace(':5173', ':3000');
    }

    const res = await fetch(`/api/campaigns/${id}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: clientBaseUrl })
    });
    if (res.ok) {
      const data = await res.json();
      alert(data.message || 'รันแคมเปญต่อเรียบร้อยแล้ว');
      fetchCampaigns();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'รันแคมเปญต่อไม่สำเร็จ');
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
          {campaigns.length > 0 && (
            <button
              onClick={toggleExpandAll}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-stone-border text-gray-700 bg-white hover:bg-stone-muted rounded-xl text-xs font-semibold shadow-xs transition-all"
              title={expandedCampaignIds.size === campaigns.length ? 'ยุบการ์ดแคมเปญทั้งหมด' : 'ขยายการ์ดแคมเปญทั้งหมด'}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span>{expandedCampaignIds.size === campaigns.length ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}</span>
            </button>
          )}
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
          campaigns.map(c => {
            const isExpanded = expandedCampaignIds.has(c.id);
            const totalTargets = c.stats?.total ?? c._count?.campaignTargets ?? 0;
            const sentCount = c.stats?.sent ?? 0;
            const clickedCount = c.stats?.clicked ?? 0;
            const submittedCount = c.stats?.submitted ?? 0;
            const reportedCount = c.stats?.reported ?? 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-stone-border shadow-xs hover:border-forest/40 transition-all overflow-hidden"
              >
                {/* Clickable Header Bar (Collapsed View) */}
                <div
                  onClick={() => toggleExpand(c.id)}
                  className="p-3.5 sm:px-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors select-none"
                >
                  {/* Left: Chevron + Name + Badges + Quick Metrics Pill */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="text-gray-400 hover:text-forest transition-colors flex-shrink-0 p-1 rounded-md">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-forest" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-deep-slate text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs md:max-w-sm" title={c.name}>
                          {c.name}
                        </h3>

                        {/* Status Badge */}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          c.status === 'RUNNING' ? 'bg-amber-50 text-amber-terracotta animate-pulse border border-amber-200' :
                          c.status === 'PAUSED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          c.status === 'COMPLETED' ? 'bg-forest-light text-forest border border-forest/20' :
                          c.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border border-red-200' :
                          'bg-stone-muted text-gray-600 border border-stone-border'
                        }`}>
                          {c.status === 'PAUSED' ? 'PAUSED (พัก)' : c.status}
                        </span>

                        {/* Schedule Badge */}
                        {c.scheduleType === 'RANDOMIZED' && (
                          <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                            <Calendar className="w-3 h-3 text-blue-600" />
                            <span>Randomized</span>
                          </span>
                        )}

                        {/* Multi-Vector Badge */}
                        {c.campaignEmailTemplates && c.campaignEmailTemplates.length > 1 && (
                          <span className="hidden md:inline-flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                            <Sliders className="w-3 h-3 text-purple-600" />
                            <span>{c.campaignEmailTemplates.length} เทมเพลต</span>
                          </span>
                        )}

                        {/* Quick Metrics Pill (Visible in Collapsed State) */}
                        <div className="flex items-center divide-x divide-stone-border/80 bg-stone-muted/50 rounded-lg px-2.5 py-0.5 text-[11px] font-medium text-gray-600 border border-stone-border/70 flex-shrink-0">
                          <span className="pr-2 flex items-center space-x-1" title="ผู้รับทั้งหมด">
                            <span>👥</span>
                            <span className="font-semibold text-deep-slate">{totalTargets}</span>
                          </span>
                          <span className="px-2 flex items-center space-x-1" title="ส่งสำเร็จแล้ว">
                            <span>✉️</span>
                            <span className="font-semibold text-deep-slate">{sentCount}</span>
                          </span>
                          <span className="px-2 flex items-center space-x-1" title="มีผู้คลิกลิงก์">
                            <span>🔗</span>
                            <span className="font-semibold text-amber-600">{clickedCount}</span>
                          </span>
                          <span className="px-2 flex items-center space-x-1" title="กรอกรหัสผ่าน/ข้อมูล">
                            <span>🚨</span>
                            <span className="font-semibold text-red-600">{submittedCount}</span>
                          </span>
                          <span className="pl-2 flex items-center space-x-1" title="แจ้งเตือนเบาะแส">
                            <span>🛡️</span>
                            <span className="font-semibold text-forest">{reportedCount}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons (Uniform h-8, no dynamic stretching, stopPropagation) */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 flex-shrink-0 self-end md:self-center"
                  >
                    {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                      <button
                        onClick={() => handleLaunch(c.id)}
                        className="h-8 px-2.5 bg-forest hover:bg-forest-hover text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-soft transition-all"
                        title={c.scheduleType === 'RANDOMIZED' ? 'เปิดระบบส่งตามตาราง (Start Schedule)' : 'สั่งเริ่มส่งอีเมลทันที (Launch)'}
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>เริ่มส่ง</span>
                      </button>
                    )}

                    {c.status === 'RUNNING' && (
                      <>
                        <button
                          onClick={() => handlePause(c.id)}
                          className="h-8 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-soft transition-all"
                          title="พักการส่งชั่วคราว (Pause)"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>พัก</span>
                        </button>

                        <button
                          onClick={() => handleKill(c.id)}
                          className="h-8 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-soft transition-all"
                          title="หยุดฉุกเฉิน (Kill Switch)"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>หยุด</span>
                        </button>
                      </>
                    )}

                    {c.status === 'PAUSED' && (
                      <>
                        <button
                          onClick={() => handleResume(c.id)}
                          className="h-8 px-2.5 bg-forest hover:bg-forest-hover text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-soft transition-all"
                          title="รันต่อ (Resume)"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>รันต่อ</span>
                        </button>

                        <button
                          onClick={() => handleKill(c.id)}
                          className="h-8 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-soft transition-all"
                          title="หยุดฉุกเฉิน (Kill Switch)"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>หยุด</span>
                        </button>
                      </>
                    )}

                    {c.status !== 'RUNNING' && (
                      <button
                        onClick={() => handleResetCampaign(c.id, c.name)}
                        className="h-8 px-2.5 border border-stone-border text-gray-600 hover:text-deep-slate hover:bg-stone-muted rounded-lg text-xs font-medium transition-all flex items-center space-x-1"
                        title="Reset สถิติของแคมเปญนี้กลับเป็น 0 เพื่อเริ่มส่งใหม่"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>รีเซ็ต</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleViewRecipients(c.id, c.name)}
                      className="h-8 px-2.5 bg-forest-light/80 text-forest hover:bg-forest-light border border-forest/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all shadow-xs"
                      title="เปิดดูตารางรายชื่อผู้รับและผลลัพธ์การทดสอบรายบุคคล"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>ผู้รับ</span>
                    </button>

                    <a
                      href={`/api/campaigns/${c.id}/export`}
                      download
                      className="h-8 px-2.5 border border-stone-border rounded-lg text-xs font-semibold text-gray-700 hover:bg-stone-muted transition-all flex items-center space-x-1"
                      title="ดาวน์โหลดรายงานสรุปแยกรายบุคคลเป็นไฟล์ CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </a>

                    <button
                      onClick={() => handleDeleteCampaign(c.id, c.name)}
                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center flex-shrink-0"
                      title="ลบแคมเปญนี้ทิ้ง"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-stone-border/70 bg-stone-50/50 p-4 space-y-4">
                    {/* Metadata Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs bg-white p-3.5 rounded-lg border border-stone-border/60">
                      <div className="lg:col-span-3 min-w-0">
                        <p className="text-gray-400 font-medium">🎯 กลุ่มเป้าหมาย:</p>
                        <p className="font-semibold text-deep-slate mt-0.5 truncate" title={c.targetGroupNames?.join(', ') || c.targetGroup?.name}>
                          {c.targetGroupNames && c.targetGroupNames.length > 0
                            ? c.targetGroupNames.join(', ')
                            : c.targetGroup?.name || 'ไม่มีกลุ่ม'}
                        </p>
                      </div>
                      <div className="lg:col-span-3 min-w-0">
                        <p className="text-gray-400 font-medium">✉️ เทมเพลตอีเมล:</p>
                        <p className="font-semibold text-deep-slate mt-0.5 truncate" title={c.campaignEmailTemplates && c.campaignEmailTemplates.length > 1 ? c.campaignEmailTemplates.map((cet: any) => cet.emailTemplate?.name).join(', ') : c.emailTemplate?.name}>
                          {c.campaignEmailTemplates && c.campaignEmailTemplates.length > 1
                            ? `สุ่ม ${c.campaignEmailTemplates.length} เทมเพลต (${c.campaignEmailTemplates.map((cet: any) => cet.emailTemplate?.name).join(', ')})`
                            : c.emailTemplate?.name || '-'}
                        </p>
                      </div>
                      <div className="lg:col-span-2 min-w-0">
                        <p className="text-gray-400 font-medium">📤 โปรไฟล์ SMTP:</p>
                        <p className="font-semibold text-deep-slate mt-0.5 truncate" title={c.smtpProfile?.name}>
                          {c.smtpProfile?.name || '-'}
                        </p>
                      </div>
                      <div className="lg:col-span-4 min-w-0">
                        <p className="text-gray-400 font-medium">📅 รูปแบบการส่ง:</p>
                        {c.scheduleType === 'RANDOMIZED' ? (
                          <div
                            className="flex items-center space-x-1.5 mt-0.5 min-w-0"
                            title={`สุ่มส่งเฉพาะวันทำการ จันทร์-ศุกร์ เวลา ${c.dailyStartTime || '08:30'} - ${c.dailyEndTime || '17:00'} น. (${c.startDate ? new Date(c.startDate).toLocaleDateString('th-TH') : ''} ถึง ${c.endDate ? new Date(c.endDate).toLocaleDateString('th-TH') : ''})`}
                          >
                            <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded text-[11px] font-bold flex-shrink-0">
                              {c.dailyStartTime || '08:30'} - {c.dailyEndTime || '17:00'}
                            </span>
                            <span className="font-semibold text-deep-slate truncate text-[11px]">
                              สุ่มวันทำการ ({c.startDate ? new Date(c.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' }) : ''} - {c.endDate ? new Date(c.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' }) : ''})
                            </span>
                          </div>
                        ) : (
                          <p className="font-semibold text-deep-slate mt-0.5 truncate">
                            ส่งทันที (Immediate)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mini Stats Funnel (4 Stages) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: 'ส่งแล้ว (Sent)',
                          val: sentCount,
                          percent: totalTargets > 0 ? Math.round((sentCount / totalTargets) * 100) : 0,
                          color: 'text-deep-slate',
                          bg: 'bg-white'
                        },
                        {
                          label: 'คลิกลิงก์ (Clicked)',
                          val: clickedCount,
                          percent: sentCount > 0 ? Math.round((clickedCount / sentCount) * 100) : 0,
                          color: 'text-amber-terracotta',
                          bg: 'bg-amber-50/40'
                        },
                        {
                          label: 'กรอกฟอร์ม (Submitted)',
                          val: submittedCount,
                          percent: sentCount > 0 ? Math.round((submittedCount / sentCount) * 100) : 0,
                          color: 'text-red-600 font-bold',
                          bg: 'bg-red-50/40'
                        },
                        {
                          label: 'แจ้งเบาะแส (Reported)',
                          val: reportedCount,
                          percent: sentCount > 0 ? Math.round((reportedCount / sentCount) * 100) : 0,
                          color: 'text-forest font-bold',
                          bg: 'bg-forest-light/30'
                        }
                      ].map((s, idx) => (
                        <div key={idx} className={`${s.bg} p-3 rounded-lg border border-stone-border text-center shadow-xs`}>
                          <p className="text-[11px] text-gray-500">{s.label}</p>
                          <p className={`text-lg font-mono font-bold mt-0.5 ${s.color}`}>{s.val}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">({s.percent}% ของยอดส่ง)</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
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
              const rawTargets = viewingCampaign.campaignTargets || [];
              const targets = rawTargets.map((t: any, idx: number) => ({
                ...t,
                _originalIndex: idx
              }));
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

              const sortKeyLabels: Record<string, string> = {
                index: 'ลำดับ',
                name: 'พนักงานผู้รับ',
                department: 'แผนก',
                template: 'เทมเพลตที่ได้รับ',
                status: 'สถานะ',
                scheduledAt: 'กำหนดส่ง (Scheduled)',
                sentAt: 'เวลาส่งจริง (Sent)',
                clickedAt: 'เวลาคลิก',
                submittedAt: 'เวลากรอกข้อมูล',
                reportedAt: 'เวลาแจ้งเตือน'
              };

              const handleToggleSort = (key: any) => {
                if (recipientSortKey === key) {
                  setRecipientSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                } else {
                  setRecipientSortKey(key);
                  setRecipientSortDir('asc');
                }
              };

              const sortedRecipients = [...filtered].sort((a: any, b: any) => {
                if (recipientSortKey === 'index') {
                  return recipientSortDir === 'asc'
                    ? a._originalIndex - b._originalIndex
                    : b._originalIndex - a._originalIndex;
                }

                if (recipientSortKey === 'name') {
                  const nameA = `${a.target?.firstName || ''} ${a.target?.lastName || ''} ${a.target?.email || ''}`.trim();
                  const nameB = `${b.target?.firstName || ''} ${b.target?.lastName || ''} ${b.target?.email || ''}`.trim();
                  const cmp = nameA.localeCompare(nameB, 'th', { sensitivity: 'base' });
                  return recipientSortDir === 'asc' ? cmp : -cmp;
                }

                if (recipientSortKey === 'department') {
                  const deptA = a.target?.department || '';
                  const deptB = b.target?.department || '';
                  const cmp = deptA.localeCompare(deptB, 'th', { sensitivity: 'base' });
                  return recipientSortDir === 'asc' ? cmp : -cmp;
                }

                if (recipientSortKey === 'template') {
                  const tmplA = a.emailTemplate?.name || viewingCampaign.emailTemplate?.name || '';
                  const tmplB = b.emailTemplate?.name || viewingCampaign.emailTemplate?.name || '';
                  const cmp = tmplA.localeCompare(tmplB, 'th', { sensitivity: 'base' });
                  return recipientSortDir === 'asc' ? cmp : -cmp;
                }

                if (recipientSortKey === 'status') {
                  const getStatusWeight = (ct: any) => {
                    if (ct.isSubmitted) return 5;
                    if (ct.isReported) return 4;
                    if (ct.isClicked) return 3;
                    if (ct.isSent) return 2;
                    return 1;
                  };
                  const diff = getStatusWeight(a) - getStatusWeight(b);
                  return recipientSortDir === 'asc' ? diff : -diff;
                }

                // Date columns: scheduledAt, sentAt, clickedAt, submittedAt, reportedAt
                const getDateVal = (ct: any) => {
                  switch (recipientSortKey) {
                    case 'scheduledAt': return ct.scheduledAt;
                    case 'sentAt': return ct.sentAt;
                    case 'clickedAt': return ct.clickedAt;
                    case 'submittedAt': return ct.submittedAt;
                    case 'reportedAt': return ct.reportedAt;
                    default: return null;
                  }
                };

                const valA = getDateVal(a);
                const valB = getDateVal(b);

                // Nulls always go to bottom regardless of asc/desc
                if (!valA && !valB) return a._originalIndex - b._originalIndex;
                if (!valA) return 1;
                if (!valB) return -1;

                const timeA = new Date(valA).getTime();
                const timeB = new Date(valB).getTime();
                const diff = recipientSortDir === 'asc' ? timeA - timeB : timeB - timeA;
                return diff !== 0 ? diff : a._originalIndex - b._originalIndex;
              });

              const renderSortHeader = (
                key: any,
                label: string,
                align: 'left' | 'center' = 'left',
                extraClasses = ''
              ) => {
                const isActive = recipientSortKey === key;
                return (
                  <th
                    key={key}
                    onClick={() => handleToggleSort(key)}
                    className={`py-3 px-3 cursor-pointer select-none transition-all group hover:bg-stone-100 ${
                      isActive ? 'text-forest font-bold bg-forest-light/40 border-b-2 border-forest' : 'text-gray-600'
                    } ${align === 'center' ? 'text-center' : 'text-left'} ${extraClasses}`}
                    title={`คลิกเพื่อสลับการเรียง (${label})`}
                  >
                    <div className={`inline-flex items-center space-x-1.5 ${align === 'center' ? 'justify-center w-full' : ''}`}>
                      <span>{label}</span>
                      <span className="shrink-0">
                        {isActive ? (
                          recipientSortDir === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-forest" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-forest" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              };

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

                    {/* Search Box & Sort Status Bar */}
                    <div className="space-y-2">
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

                      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                        <div className="flex items-center space-x-1.5">
                          <span>กำลังเรียงตาม:</span>
                          <span className="font-semibold text-deep-slate bg-white px-2 py-0.5 rounded border border-stone-border inline-flex items-center space-x-1 shadow-xs">
                            <span>{sortKeyLabels[recipientSortKey] || recipientSortKey}</span>
                            {recipientSortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-forest inline" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-forest inline" />
                            )}
                            <span className="text-gray-400 font-normal">
                              ({recipientSortDir === 'asc' ? 'น้อยไปมาก / เก่าไปใหม่' : 'มากไปน้อย / ใหม่ไปเก่า'})
                            </span>
                          </span>
                        </div>
                        {(recipientSortKey !== 'scheduledAt' || recipientSortDir !== 'asc') && (
                          <button
                            type="button"
                            onClick={() => {
                              setRecipientSortKey('scheduledAt');
                              setRecipientSortDir('asc');
                            }}
                            className="text-forest hover:underline flex items-center space-x-1 font-medium"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>รีเซ็ตการเรียงลำดับ</span>
                          </button>
                        )}
                      </div>
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
                                {renderSortHeader('index', '#', 'center', 'w-12')}
                                {renderSortHeader('name', 'พนักงานผู้รับ')}
                                {renderSortHeader('department', 'แผนก')}
                                {renderSortHeader('template', 'เทมเพลตที่ได้รับ')}
                                {renderSortHeader('status', 'สถานะ', 'center')}
                                {renderSortHeader('scheduledAt', 'กำหนดส่ง (Scheduled)')}
                                {renderSortHeader('sentAt', 'เวลาส่งจริง (Sent)')}
                                {renderSortHeader('clickedAt', 'เวลาคลิก')}
                                {renderSortHeader('submittedAt', 'เวลากรอกข้อมูล')}
                                {renderSortHeader('reportedAt', 'เวลาแจ้งเตือน')}
                                <th className="py-3 px-3 text-center text-gray-600 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                  บันทึกการแจ้ง
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-border/60">
                              {sortedRecipients.map((ct: any, idx: number) => {
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
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                            เผลอกรอกข้อมูล
                                          </span>
                                          {ct.isReported && (
                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200" title="มีรายงานแจ้งเบาะแสเข้ามาภายหลัง">
                                              🛡️ มีแจ้งเบาะแส
                                            </span>
                                          )}
                                        </div>
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
                                    <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                                      {ct.scheduledAt ? (
                                        <span className="inline-flex items-center text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="กำหนดส่งตามคิวสุ่มเวลา">
                                          <Clock className="w-3 h-3 text-amber-600 mr-1 shrink-0" />
                                          <span>{formatTimestamp(ct.scheduledAt)}</span>
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 font-sans">ส่งทันที</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                                      {ct.isSent ? (
                                        <span className="text-gray-700">{formatTimestamp(ct.sentAt)}</span>
                                      ) : (
                                        <span className="text-gray-400 font-sans">ยังไม่ส่ง</span>
                                      )}
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
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      {ct.isReported ? (
                                        <div className="inline-flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <span className="text-[11px] font-bold text-emerald-700">แจ้งแล้ว</span>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleManualReport(ct, false)}
                                            className="text-gray-400 hover:text-red-600 ml-1 p-0.5 hover:bg-red-50 rounded transition-colors"
                                            title="ยกเลิกการบันทึกแจ้งเบาะแส"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleManualReport(ct, true)}
                                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition-all shadow-2xs hover:shadow-xs active:scale-95"
                                          title="คลิกเพื่อบันทึกว่าพนักงานคนนี้มีการแจ้งเข้ามาว่าพบอีเมลแปลกปลอม"
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span>บันทึกการแจ้ง</span>
                                        </button>
                                      )}
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
                    <div className="text-xs text-gray-500 font-medium flex items-center space-x-2">
                      <span>แสดง {sortedRecipients.length} จากทั้งหมด {targets.length} รายการ</span>
                      <span className="text-stone-300">&bull;</span>
                      <span className="text-gray-600">
                        เรียงตาม: <strong className="text-deep-slate">{sortKeyLabels[recipientSortKey]}</strong> ({recipientSortDir === 'asc' ? 'น้อยไปมาก ↑' : 'มากไปน้อย ↓'})
                      </span>
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

