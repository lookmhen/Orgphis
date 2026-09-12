import React, { useEffect, useState, useRef } from 'react';
import { Upload, Users, Plus, Trash2, UserPlus, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export const Targets: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [csvText, setCsvText] = useState('');
  
  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Single target form
  const [singleTarget, setSingleTarget] = useState({
    email: '',
    firstName: '',
    department: ''
  });

  const fetchGroups = (selectGroupId?: string) => {
    fetch('/api/targets/groups')
      .then(r => r.json())
      .then(data => {
        setGroups(data);
        if (data.length > 0) {
          if (selectGroupId) {
            const found = data.find((g: any) => g.id === selectGroupId);
            setSelectedGroup(found || data[0]);
          } else if (!selectedGroup) {
            setSelectedGroup(data[0]);
          }
        } else {
          setSelectedGroup(null);
        }
      });
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchTargets = (groupId: string) => {
    fetch(`/api/targets/groups/${groupId}/targets`)
      .then(r => r.json())
      .then(setTargets);
  };

  useEffect(() => {
    if (selectedGroup) {
      fetchTargets(selectedGroup.id);
    } else {
      setTargets([]);
    }
  }, [selectedGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch('/api/targets/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() })
      });

      if (res.ok) {
        const created = await res.json();
        setNewGroupName('');
        fetchGroups(created.id);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'ไม่สามารถสร้างกลุ่มเป้าหมายได้');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddSingleTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !singleTarget.email) return;

    try {
      const res = await fetch(`/api/targets/groups/${selectedGroup.id}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleTarget)
      });

      if (res.ok) {
        setSingleTarget({ email: '', firstName: '', department: '' });
        setShowAddSingleModal(false);
        fetchTargets(selectedGroup.id);
        fetchGroups(selectedGroup.id);
      } else {
        const data = await res.json();
        alert(data.error || 'เพิ่มรายชื่อไม่สำเร็จ');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!selectedGroup) return;
    if (!confirm('ยืนยันลบรายชื่อนี้ออกจากกลุ่ม?')) return;

    try {
      const res = await fetch(`/api/targets/groups/${selectedGroup.id}/targets/${targetId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTargets(selectedGroup.id);
        fetchGroups(selectedGroup.id);
      }
    } catch (err) {
      alert('Delete failed');
    }
  };

  // Download Sample CSV Template with UTF-8 BOM (Opens correctly in Microsoft Excel Thai/English)
  const handleDownloadCsvTemplate = () => {
    const csvContent = 
      '\uFEFF' +
      'email,name,department\n' +
      'somchai.j@company.com,สมชาย ใจมั่นคง,Information Technology\n' +
      'kanya.s@company.com,กัญญา ศรีสุข,Human Resources\n' +
      'vichai.p@company.com,วิชัย พัฒนาการ,Finance & Accounting\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'phishcentral_targets_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle direct file upload (.csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportCsv = async () => {
    if (!selectedGroup || !csvText) return;

    // Parse simple CSV text
    const lines = csvText.trim().split(/\r?\n/);
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
          department: parts[2] || 'General'
        });
      }
    }

    if (parsed.length === 0) {
      alert('ไม่พบข้อมูลอีเมลที่ถูกต้อง กรุณาตรวจสอบรูปแบบ (Email, Name, Department)');
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
      fetchTargets(selectedGroup.id);
      fetchGroups(selectedGroup.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-deep-slate tracking-tight">กลุ่มเป้าหมาย (Targets & Groups)</h2>
          <p className="text-sm text-gray-500 mt-1">จัดการรายชื่อพนักงานและกลุ่มที่จะส่งแบบทดสอบ Phishing จำลอง</p>
        </div>
        <button
          onClick={handleDownloadCsvTemplate}
          className="flex items-center space-x-1.5 px-3.5 py-2 border border-stone-border text-gray-700 bg-white hover:bg-stone-muted rounded-xl text-xs font-semibold shadow-xs transition-all"
          title="ดาวน์โหลดไฟล์ตัวอย่าง .CSV สำหรับเปิดใน Excel"
        >
          <FileSpreadsheet className="w-4 h-4 text-forest" />
          <span>ดาวน์โหลดเทมเพลต CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Groups Column */}
        <div className="bg-white rounded-xl border border-stone-border shadow-soft p-5 space-y-4">
          <h3 className="font-bold text-deep-slate text-sm uppercase tracking-wider">กลุ่มเป้าหมาย ({groups.length})</h3>

          {/* New Group Form */}
          <form onSubmit={handleCreateGroup} className="flex space-x-2">
            <input
              type="text"
              placeholder="ชื่อกลุ่มใหม่ (เช่น IT, All Staff)"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-stone-border rounded-lg text-xs outline-none focus:border-forest"
            />
            <button type="submit" className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-hover shadow-xs">
              + สร้างกลุ่ม
            </button>
          </form>

          {/* Groups List */}
          <div className="space-y-2 pt-2">
            {groups.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">ยังไม่มีกลุ่ม กรุณาพิมพ์ชื่อแล้วกด "+ สร้างกลุ่ม"</p>
            ) : (
              groups.map(g => (
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
              ))
            )}
          </div>
        </div>

        {/* Targets Table Column */}
        <div className="md:col-span-2 bg-white rounded-xl border border-stone-border shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-deep-slate text-base">
                {selectedGroup ? `สมาชิกในกลุ่ม: ${selectedGroup.name}` : 'กรุณาสร้างหรือเลือกกลุ่มเป้าหมาย'}
              </h3>
              <p className="text-xs text-gray-500">รายชื่อพนักงานทั้งหมดที่จะได้รับอีเมลจำลองในกลุ่มนี้</p>
            </div>
            {selectedGroup && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddSingleModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-hover shadow-soft"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มรายบุคคล</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 border border-stone-border text-gray-700 hover:bg-stone-muted rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>นำเข้า CSV</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-muted/50 text-gray-600 border-b border-stone-border">
                <tr>
                  <th className="p-2.5">อีเมล (Email)</th>
                  <th className="p-2.5">ชื่อ-นามสกุล</th>
                  <th className="p-2.5">แผนก (Department)</th>
                  <th className="p-2.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-border/60">
                {targets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400">
                      {selectedGroup ? 'ยังไม่มีรายชื่อในกลุ่มนี้ คลิกปุ่ม "+ เพิ่มรายบุคคล" หรือ "นำเข้า CSV"' : 'กรุณาสร้างกลุ่มทางซ้ายมือก่อน'}
                    </td>
                  </tr>
                ) : (
                  targets.map(t => (
                    <tr key={t.id} className="hover:bg-stone-muted/30">
                      <td className="p-2.5 font-medium text-deep-slate">{t.email}</td>
                      <td className="p-2.5 text-gray-600">{t.firstName || '-'}</td>
                      <td className="p-2.5 text-gray-600">{t.department || '-'}</td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleDeleteTarget(t.id)}
                          className="text-gray-400 hover:text-red-600 transition-all p-1"
                          title="ลบรายชื่อ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add Single Target */}
      {showAddSingleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-border space-y-4">
            <h3 className="font-bold text-deep-slate text-base">➕ เพิ่มพนักงานรายบุคคล ({selectedGroup?.name})</h3>
            <form onSubmit={handleAddSingleTarget} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">อีเมลพนักงาน *</label>
                <input
                  type="email"
                  required
                  placeholder="user@company.com"
                  value={singleTarget.email}
                  onChange={e => setSingleTarget({ ...singleTarget, email: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  placeholder="สมชาย ใจมั่นคง"
                  value={singleTarget.firstName}
                  onChange={e => setSingleTarget({ ...singleTarget, firstName: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">แผนก (Department)</label>
                <input
                  type="text"
                  placeholder="IT, HR, Accounting"
                  value={singleTarget.department}
                  onChange={e => setSingleTarget({ ...singleTarget, department: e.target.value })}
                  className="w-full p-2 border border-stone-border rounded-lg outline-none focus:border-forest"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-border">
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest-hover shadow-soft"
                >
                  เพิ่มพนักงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-border">
              <h3 className="font-bold text-deep-slate text-base">นำเข้ารายชื่อพนักงานด้วย CSV ({selectedGroup?.name})</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-deep-slate font-bold">✕ ปิด</button>
            </div>

            {/* Quick Action: Download Template & Choose File */}
            <div className="flex items-center justify-between bg-stone-muted/50 p-3 rounded-xl border border-stone-border/60">
              <div>
                <p className="text-xs font-semibold text-deep-slate">ยังไม่มีไฟล์รูปแบบ CSV?</p>
                <p className="text-[11px] text-gray-500">ดาวน์โหลดแม่แบบเพื่อนำไปเปิดแก้ไขใน Excel</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-stone-border text-forest font-semibold rounded-lg text-xs hover:bg-forest hover:text-white transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด Template (.CSV)</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-medium text-gray-700 text-xs">เลือกอัปโหลดไฟล์ หรือวางข้อความ:</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-forest hover:underline font-semibold flex items-center space-x-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>คลิกเลือกไฟล์จากเครื่อง...</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,text/csv"
                  className="hidden"
                />
              </div>

              <textarea
                rows={6}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="email,name,department&#10;somchai@company.com,สมชาย ใจดี,IT&#10;kanya@company.com,กัญญา ศรีสุข,HR"
                className="w-full p-3 border border-stone-border rounded-xl font-mono text-xs outline-none focus:border-forest"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                รูปแบบ: <code className="bg-stone-muted px-1 py-0.5 rounded font-mono">email,name,department</code> (รองรับภาษาไทย 100%)
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-stone-border">
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
