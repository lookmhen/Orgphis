import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Cell
} from 'recharts';
import {
  Send,
  MousePointerClick,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Building2,
  Clock,
  Layers,
  Award,
  UsersRound,
  CheckCircle2
} from 'lucide-react';

interface DepartmentStat {
  department: string;
  sent: number;
  clicked: number;
  submitted: number;
  reported: number;
  compromiseRate: number;
  reportRate: number;
  clickRate: number;
}

interface CampaignTrend {
  id: string;
  name: string;
  round: string;
  date: string;
  sent: number;
  clicked: number;
  submitted: number;
  reported: number;
  compromiseRate: number;
  reportRate: number;
}

interface TimeDistribution {
  range: string;
  count: number;
}

interface TemplateStat {
  name: string;
  sent: number;
  clicked: number;
  submitted: number;
  compromiseRate: number;
  clickRate: number;
}

interface RepeatOffender {
  id: string;
  email: string;
  name: string;
  department: string;
  compromisedCount: number;
  clickedCount: number;
}

interface InsightsData {
  departmentStats: DepartmentStat[];
  campaignTrends: CampaignTrend[];
  timeDistribution: TimeDistribution[];
  avgMinutesToClick: number;
  templateStats: TemplateStat[];
  resilience: {
    score: number;
    grade: string;
    gradeLabel: string;
    gradeColor: string;
    globalCompromiseRate: number;
    globalReportRate: number;
  };
  repeatOffenders: RepeatOffender[];
}

export const Dashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = () => {
    Promise.all([
      fetch('/api/campaigns').then(res => res.json()),
      fetch('/api/dashboard/insights').then(res => res.json())
    ])
      .then(([campaignsData, insightsData]) => {
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
        setInsights(insightsData && !insightsData.error ? insightsData : null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
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
      fetchDashboardData();
    } else {
      const data = await res.json();
      alert(data.error || 'ล้างประวัติไม่สำเร็จ');
    }
  };

  // Aggregate global metrics from campaigns
  let totalSent = 0;
  let totalClicked = 0;
  let totalSubmitted = 0;
  let totalReported = 0;

  campaigns.forEach(c => {
    if (c.metrics) {
      totalSent += c.metrics.sent || 0;
      totalClicked += c.metrics.clicked || 0;
      totalSubmitted += c.metrics.submitted || 0;
      totalReported += c.metrics.reported || 0;
    }
  });

  const compromiseRate = totalSent > 0 ? ((totalSubmitted / totalSent) * 100).toFixed(1) : '0';
  const reportRate = totalSent > 0 ? ((totalReported / totalSent) * 100).toFixed(1) : '0';

  const funnelData = [
    { stage: 'Sent (ส่งแล้ว)', count: totalSent, fill: '#6B7280' },
    { stage: 'Clicked (คลิกลิงก์)', count: totalClicked, fill: '#D97736' },
    { stage: 'Compromised (เผลอกรอก)', count: totalSubmitted, fill: '#DC2626' },
    { stage: 'Reported (แจ้งเตือน)', count: totalReported, fill: '#3A5A40' }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Reset Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">ภาพรวมความปลอดภัย (Security Dashboard)</h2>
          <p className="text-sm text-gray-500 mt-1">
            สรุปผลการทดสอบ Phishing Simulation และวิเคราะห์ระดับความตระหนักรู้ขององค์กรแบบรอบด้าน
          </p>
        </div>
        {campaigns.length > 0 && (
          <button
            onClick={handleResetAll}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3.5 py-2 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-xs transition-all"
            title="ล้างแคมเปญและประวัติการทดสอบทั้งหมดเพื่อเริ่มใช้งานจริง"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-600" />
            <span>ล้างประวัติทดสอบทั้งหมด (Reset All)</span>
          </button>
        )}
      </div>

      {/* KPI & Organizational Resilience Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Executive Grade & Resilience Score */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ดัชนีความพร้อมรับมือ</span>
            <div className="w-8 h-8 rounded-lg bg-forest-light text-forest flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-deep-slate">
              {insights ? insights.resilience.score : 100}
            </span>
            <span className="text-xs text-gray-400 font-medium">/ 100</span>
            <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold border ${insights?.resilience?.gradeColor || 'text-forest bg-forest-light border-forest/30'}`}>
              เกรด {insights ? insights.resilience.grade : 'A'}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-2 truncate" title={insights?.resilience?.gradeLabel}>
            {insights ? insights.resilience.gradeLabel : 'พร้อมรับมือระดับสูง'}
          </p>
        </div>

        {/* Card 2: Compromise Rate */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">อัตราเผลอกรอกข้อมูล</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-deep-slate">{compromiseRate}%</span>
            <span className="text-xs text-gray-500 ml-2">({totalSubmitted} คน)</span>
          </div>
          <p className="text-xs text-red-600 font-medium mt-2">
            Phish-Prone Vulnerability
          </p>
        </div>

        {/* Card 3: Resilience Report Rate */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">อัตราแจ้งเตือน Phishing</span>
            <div className="w-8 h-8 rounded-lg bg-forest-light text-forest flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-deep-slate">{reportRate}%</span>
            <span className="text-xs text-gray-500 ml-2">({totalReported} คน)</span>
          </div>
          <p className="text-xs text-forest font-medium mt-2">
            Report & Defense Rate
          </p>
        </div>

        {/* Card 4: Total Emails Sent */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">อีเมลที่ส่งแล้ว</span>
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

        {/* Card 5: Avg Speed to Click */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ความเร็วเฉลี่ยในการคลิก</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-terracotta flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-deep-slate">
              {insights?.avgMinutesToClick || 0}
            </span>
            <span className="text-xs text-gray-500 ml-2">นาที</span>
          </div>
          <p className="text-xs text-amber-terracotta font-medium mt-2">
            Avg. Time to Click (Latency)
          </p>
        </div>
      </div>

      {/* Row 1: Department Vulnerability Benchmark */}
      <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-forest" />
              <h3 className="text-base font-bold text-deep-slate">Department Vulnerability Benchmark (เปรียบเทียบระดับฝ่าย)</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              เปรียบเทียบอัตราการตกเป็นเหยื่อ (Compromise Rate %) กับอัตราการช่วยแจ้งเตือน (Report Rate %) แยกตามแผนก
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-600" />
              <span>เผลอกรอกข้อมูล (Compromise %)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-forest" />
              <span>กดรายงานแจ้งเตือน (Report %)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 h-80 w-full">
          {insights && insights.departmentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={insights.departmentStats}
                margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="department"
                  stroke="#4B5563"
                  fontSize={12}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value}%`,
                    name === 'compromiseRate' ? 'เผลอกรอกข้อมูล' : 'กดรายงาน Phishing'
                  ]}
                  labelFormatter={(label) => `แผนก: ${label}`}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '0.75rem' }}
                />
                <Bar
                  dataKey="compromiseRate"
                  name="compromiseRate"
                  fill="#DC2626"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="reportRate"
                  name="reportRate"
                  fill="#3A5A40"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
              <Building2 className="w-8 h-8 mb-2 opacity-40" />
              <span>ยังไม่มีข้อมูลสถิติแยกตามแผนกในขณะนี้</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: 2 Columns (Compromise Funnel & Time-to-Click Velocity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Compromise Funnel */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
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
                <YAxis dataKey="stage" type="category" stroke="#4B5563" fontSize={12} tickLine={false} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`funnel-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Threat Reaction Speed (Time to Click) */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-deep-slate">Speed of Threat (ความเร็วในการคลิก)</h3>
              <p className="text-xs text-gray-500 mt-0.5">การกระจายตัวของเวลาที่พนักงานเผลอคลิกหลังได้รับอีเมล</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Latency Distribution</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {insights && insights.timeDistribution.some(t => t.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={insights.timeDistribution}
                  margin={{ top: 15, right: 20, left: 0, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="range" stroke="#4B5563" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any) => [`${value} คน`, 'จำนวนที่คลิก']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '0.75rem' }}
                  />
                  <Bar dataKey="count" fill="#D97706" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <CheckCircle2 className="w-8 h-8 mb-2 text-forest opacity-80" />
                <span>ยังไม่มีการคลิกลิงก์ทดสอบ หรือยังไม่มีข้อมูลเวลาคลิก</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: 2 Columns (Campaign Progress Trend & Top Phishing Hooks) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Campaign Progress Trend */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-deep-slate">พัฒนาการความปลอดภัยตามแคมเปญ (Trend Over Time)</h3>
              <p className="text-xs text-gray-500 mt-0.5">การเปลี่ยนแปลงของอัตราเผลอกรอกข้อมูลเทียบกับแต่ละรอบการฝึกอบรม</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-deep-slate bg-stone-muted px-3 py-1.5 rounded-lg">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Campaign Trend</span>
            </div>
          </div>

          <div className="h-72 w-full">
            {insights && insights.campaignTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={insights.campaignTrends}
                  margin={{ top: 15, right: 25, left: 5, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="round" stroke="#4B5563" fontSize={12} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      `${value}%`,
                      name === 'compromiseRate' ? 'อัตราเผลอกรอก' : 'อัตรากดรายงาน'
                    ]}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return `${payload[0].payload.name} (${payload[0].payload.date})`;
                      }
                      return '';
                    }}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '0.75rem' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    formatter={(val) => val === 'compromiseRate' ? 'เผลอกรอกข้อมูล (%)' : 'กดรายงาน (%)'}
                  />
                  <Line
                    type="monotone"
                    dataKey="compromiseRate"
                    name="compromiseRate"
                    stroke="#DC2626"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#DC2626' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reportRate"
                    name="reportRate"
                    stroke="#3A5A40"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3A5A40' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
                <span>ต้องมีอย่างน้อย 1 แคมเปญที่รันแล้วเพื่อแสดงแนวโน้มพัฒนาการ</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Top Phishing Hooks / Template Effectiveness */}
        <div className="bg-white p-6 rounded-xl border border-stone-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-deep-slate">เหยื่อล่อที่ได้ผลสูงสุด (Top Phishing Hooks)</h3>
              <p className="text-xs text-gray-500 mt-0.5">เทมเพลตอีเมลที่ทำให้พนักงานหลงเชื่อและเผลอกรอกข้อมูลมากที่สุด</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Highest Risk Lures</span>
            </div>
          </div>

          <div className="h-72 w-full overflow-y-auto">
            {insights && insights.templateStats.length > 0 ? (
              <div className="space-y-4 pt-2">
                {insights.templateStats.slice(0, 5).map((t, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-stone-border bg-stone-muted/30">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-deep-slate truncate max-w-[240px]" title={t.name}>
                        {idx + 1}. {t.name}
                      </span>
                      <span className="font-extrabold text-red-600">
                        {t.compromiseRate}% Compromised
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-red-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, t.compromiseRate)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-gray-500 mt-2">
                      <span>ส่งทั้งหมด: {t.sent} ฉบับ</span>
                      <span>คลิกลิงก์: {t.clickRate}% ({t.clicked} คน)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <Layers className="w-8 h-8 mb-2 opacity-40" />
                <span>ยังไม่มีข้อมูลสถิติเทมเพลต</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Repeat Offenders / High-Risk Targets (Targeted Retraining) */}
      {insights && insights.repeatOffenders.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-amber-700" />
              <div>
                <h3 className="text-base font-bold text-deep-slate">กลุ่มเป้าหมายที่ต้องเข้าอบรมเสริม (Targeted Retraining Needed)</h3>
                <p className="text-xs text-gray-500 mt-0.5">รายชื่อพนักงานที่เผลอคลิกหรือส่งรหัสผ่านซ้ำซ้อนมากกว่า 1 ครั้ง ควรส่งหลักสูตรอบรมความตระหนักรู้เพิ่มเติม</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              พบ {insights.repeatOffenders.length} ราย
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-muted/50 text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">ชื่อ - นามสกุล</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">แผนก</th>
                  <th className="px-4 py-3 text-center">จำนวนคลิกลิงก์</th>
                  <th className="px-4 py-3 text-center">จำนวนที่เผลอกรอกข้อมูล</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">สถานะการอบรม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {insights.repeatOffenders.map((offender) => (
                  <tr key={offender.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-deep-slate">{offender.name}</td>
                    <td className="px-4 py-3 text-gray-600">{offender.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-medium text-gray-700">
                        {offender.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-amber-700">
                      {offender.clickedCount} ครั้ง
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-red-600">
                      {offender.compromisedCount} ครั้ง
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg font-bold text-[11px]">
                        ต้องเข้ารับการอบรมซ้ำ
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
