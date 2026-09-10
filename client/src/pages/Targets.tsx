import React, { useEffect, useState } from 'react';
import { Upload, Users, Plus, Check, AlertCircle } from 'lucide-react';

export const Targets: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchGroups = () => {
    fetch('/api/targets/groups')
      .then(r => r.json())
      .then(data => {
        setGroups(data);
        if (data.length > 0 && !selectedGroup) {
          setSelectedGroup(data[0]);
        }
      });
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetch(`/api/targets/groups/${selectedGroup.id}/targets`)
        .then(r => r.json())
        .then(setTargets);
    }
  }, [selectedGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;

    const res = await fetch('/api/targets/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName })
    });

    if (res.ok) {
      setNewGroupName('');
      fetchGroups();
    }
  };

  const handleImportCsv = async () => {
    if (!selectedGroup || !csvText) return;

    // Parse simple CSV text
    const lines = csvText.trim().split('\n');
    const parsed: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (i === 0 && parts[0].toLowerCase().includes('email')) {
        continue; // skip header
      }
      if (parts[0] && parts[0].includes('@')) {
        parsed.push({
          email: parts[0],
          name: parts[1] || '',
          department: parts[2] || 'General',
          empid: parts[3] || ''
        });
      }
    }

    if (parsed.length === 0) {
      alert('ไม่พบข้อมูลอีเมลที่ถูกต้อง กรุณาตรวจสอบรูปแบบ (Email, Name, Department, EmpID)');
      return;
    }

    const res = await fetch(`/api/targets/groups/${selectedGroup.id}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets: parsed })
    });

    if (res.ok) {
      alert(`นำเข้ารายชื่อพนักงานสำเร็จ ${parsed.length} รายการ!`);
      setShowImportModal(false);
      setCsvText('');
      fetchGroups();
      fetch(`/api/targets/groups/${selectedGroup.id}/targets`).then(r => r.json()).then(setTargets);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">กลุ่มเป้าหมาย (Targets & Departments)</h2>
          <p className="text-sm text-gray-500 mt-1">จัดการรายชื่อพนักงานและกลุ่มที่จะส่งแบบทดสอบ Phishing จำลอง</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Groups Column */}
        <div className="bg-white rounded-xl border border-stone-border shadow-soft p-5 space-y-4">
          <h3 className="font-bold text-deep-slate text-sm uppercase tracking-wider">กลุ่มเป้าหมาย ({groups.length})</h3>

          {/* New Group Form */}
          <form onSubmit={handleCreateGroup} className="flex space-x-2">
            <input
              type="text"
              placeholder="ชื่อกลุ่มใหม่ (เช่น IT, HR)"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-stone-border rounded-lg text-xs outline-none focus:border-forest"
            />
            <button type="submit" className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-hover">
              + เพิ่ม
            </button>
          </form>

          {/* Groups List */}
          <div className="space-y-2 pt-2">
            {groups.map(g => (
              <div
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  selectedGroup?.id === g.id
                    ? 'bg-forest-light border-forest text-forest font-semibold shadow-soft'
                    : 'bg-white border-stone-border text-gray-700 hover:bg-stone-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{g.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 border border-stone-border/40 font-mono">
                    {g._count?.targets || 0} คน
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Targets Table Column */}
        <div className="md:col-span-2 bg-white rounded-xl border border-stone-border shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-deep-slate text-base">
                {selectedGroup ? `สมาชิกในกลุ่ม: ${selectedGroup.name}` : 'เลือกกลุ่มเพื่อดูรายชื่อ'}
              </h3>
              <p className="text-xs text-gray-500">รายชื่อพนักงานทั้งหมดที่จะได้รับอีเมลจำลอง</p>
            </div>
            {selectedGroup && (
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-hover shadow-soft"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้า CSV</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-muted/50 text-gray-600 border-b border-stone-border">
                <tr>
                  <th className="p-2.5">อีเมล (Email)</th>
                  <th className="p-2.5">ชื่อ-นามสกุล</th>
                  <th className="p-2.5">แผนก (Department)</th>
                  <th className="p-2.5">รหัสพนักงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-border/60">
                {targets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-400">
                      ยังไม่มีรายชื่อในกลุ่มนี้ คลิกปุ่ม "นำเข้า CSV" เพื่อเพิ่มรายชื่อ
                    </td>
                  </tr>
                ) : (
                  targets.map(t => (
                    <tr key={t.id} className="hover:bg-stone-muted/30">
                      <td className="p-2.5 font-medium text-deep-slate">{t.email}</td>
                      <td className="p-2.5 text-gray-600">{t.firstName || '-'}</td>
                      <td className="p-2.5 text-gray-600">{t.department || '-'}</td>
                      <td className="p-2.5 text-gray-600">{t.employeeId || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-border space-y-4">
            <h3 className="font-bold text-deep-slate text-base">นำเข้ารายชื่อพนักงานด้วย CSV</h3>
            <p className="text-xs text-gray-500">
              วางข้อความ CSV ในรูปแบบ: <br />
              <code className="bg-stone-muted px-1 py-0.5 rounded font-mono text-[11px]">email,name,department,empid</code>
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="somchai@company.com,สมชาย ใจดี,IT,EMP001&#10;kanya@company.com,กัญญา ศรีสุข,HR,EMP002"
              className="w-full p-3 border border-stone-border rounded-xl font-mono text-xs outline-none focus:border-forest"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleImportCsv}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest-hover shadow-soft"
              >
                ยืนยันการนำเข้า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
