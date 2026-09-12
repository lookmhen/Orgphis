import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Send, MailOpen, MousePointerClick, AlertTriangle, ShieldCheck, TrendingUp, RotateCcw } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = () => {
    fetch('/api/campaigns')
      .then(res => res.json())
      .then(data => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleResetAll = async () => {
    const confirmation = prompt('⚠️ คำเตือน: คุณต้องการล้างประวัติการทดสอบและแคมเปญทั้งหมดออกจากระบบเพื่อเริ่มใช้งานจริงใช่หรือไม่?\n\n(กลุ่มเป้าหมาย, เทมเพลต, และ SMTP Profile จะยังคงอยู่ครบถ้วน)\n\nพิมพ์คำว่า "RESET" เพื่อยืนยัน:');
    if (confirmation !== 'RESET') {
      if (confirmation !== null) alert('คำยืนยันไม่ถูกต้อง ยกเลิกการล้างข้อมูล');
      return;
    }

    const res = await fetch('/api/campaigns/reset-all', { method: 'POST' });
    if (res.ok) {
      alert('ล้างประวัติการทดสอบทั้งหมดเรียบร้อยแล้ว สถิติบน Dashboard ถูกรีเซ็ตเป็น 0');
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || 'ล้างประวัติไม่สำเร็จ');
    }
  };

  // Aggregate global metrics
  let totalSent = 0;
  let totalOpened = 0;
  let totalClicked = 0;
  let totalSubmitted = 0;
  let totalReported = 0;

  campaigns.forEach(c => {
    if (c.metrics) {
      totalSent += c.metrics.sent || 0;
      totalOpened += c.metrics.opened || 0;
      totalClicked += c.metrics.clicked || 0;
      totalSubmitted += c.metrics.submitted || 0;
      totalReported += c.metrics.reported || 0;
    }
  });

  const compromiseRate = totalSent > 0 ? ((totalSubmitted / totalSent) * 100).toFixed(1) : '0';
  const reportRate = totalSent > 0 ? ((totalReported / totalSent) * 100).toFixed(1) : '0';

  const funnelData = [
    { stage: 'Sent (ส่งแล้ว)', count: totalSent, fill: '#6B7280' },
    { stage: 'Opened (เปิดอ่าน)', count: totalOpened, fill: '#D97706' },
    { stage: 'Clicked (คลิกลิงก์)', count: totalClicked, fill: '#D97736' },
    { stage: 'Compromised (เผลอกรอก)', count: totalSubmitted, fill: '#DC2626' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">ภาพรวมความปลอดภัย (Security Dashboard)</h2>
          <p className="text-sm text-gray-500 mt-1">สรุปผลการทดสอบ Phishing Simulation และระดับความตระหนักรู้ขององค์กร</p>
        </div>
        {campaigns.length > 0 && (
          <button
            onClick={handleResetAll}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-xs transition-all"
            title="ล้างแคมเปญและประวัติการทดสอบทั้งหมดเพื่อเริ่มใช้งานจริง"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-600" />
            <span>ล้างประวัติทดสอบทั้งหมด (Reset All)</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Compromise Rate */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">อัตราการตกเป็นเหยื่อ</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-deep-slate">{compromiseRate}%</span>
            <span className="text-xs text-gray-500 ml-2">({totalSubmitted} คน)</span>
          </div>
          <p className="text-xs text-red-600 font-medium mt-2 flex items-center">
            <span>Phish-Prone Vulnerability Rate</span>
          </p>
        </div>

        {/* Card 2: Resilience Report Rate */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">อัตราการแจ้งเตือน (Resilience)</span>
            <div className="w-8 h-8 rounded-lg bg-forest-light text-forest flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-deep-slate">{reportRate}%</span>
            <span className="text-xs text-gray-500 ml-2">({totalReported} คน)</span>
          </div>
          <p className="text-xs text-forest font-medium mt-2 flex items-center">
            <span>Report & Defense Action Rate</span>
          </p>
        </div>

        {/* Card 3: Total Emails Sent */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">อีเมลทดสอบที่ส่งแล้ว</span>
            <div className="w-8 h-8 rounded-lg bg-stone-muted text-gray-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-deep-slate">{totalSent}</span>
            <span className="text-xs text-gray-500 ml-2">ฉบับ</span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-2">
            จากทั้งหมด {campaigns.length} แคมเปญ
          </p>
        </div>

        {/* Card 4: Total Link Clicks */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">การคลิกลิงก์ฟิชชิ่ง</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-terracotta flex items-center justify-center">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-deep-slate">{totalClicked}</span>
            <span className="text-xs text-gray-500 ml-2">ครั้ง</span>
          </div>
          <p className="text-xs text-amber-terracotta font-medium mt-2">
            Click-Through Rate: {totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-deep-slate">Compromise Funnel Analysis</h3>
            <p className="text-xs text-gray-500 mt-0.5">การเปลี่ยนผ่านของเป้าหมายตั้งแต่รับอีเมลจนถึงขั้นกรอกข้อมูล</p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-forest bg-forest-light px-3 py-1.5 rounded-lg">
            <TrendingUp className="w-4 h-4" />
            <span>Real-time Funnel</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis dataKey="stage" type="category" stroke="#4B5563" fontSize={13} tickLine={false} />
              <Tooltip cursor={{ fill: '#F9FAFB' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
