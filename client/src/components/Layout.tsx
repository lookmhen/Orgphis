import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  Users,
  FileCode,
  Server,
  ShieldCheck,
  LogOut,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserPlus,
  Trash2,
  Power
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'PASSWORD' | 'SESSIONS' | 'ADMINS'>('PASSWORD');

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Session Management state
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Multi-Admin Management state
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'VIEWER'>('ADMIN');
  const [adminMsg, setAdminMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const navItems = [
    { to: '/', label: 'ภาพรวมระบบ (Dashboard)', icon: LayoutDashboard },
    { to: '/campaigns', label: 'แคมเปญ (Campaigns)', icon: Send },
    { to: '/targets', label: 'กลุ่มเป้าหมาย (Targets)', icon: Users },
    { to: '/templates', label: 'คลังเทมเพลต (Templates)', icon: FileCode },
    { to: '/smtp', label: 'การส่งเมล (SMTP Profiles)', icon: Server },
  ];

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      }
    } catch (err) {
      console.error('Failed to load session info:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadAdminUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleOpenSecurityModal = () => {
    setPwdMessage(null);
    setAdminMsg(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveTab('PASSWORD');
    setShowSecurityModal(true);
    if (user?.role !== 'VIEWER') {
      loadSessions();
      loadAdminUsers();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (newPassword.length < 8) {
      setPwdMessage({ type: 'err', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'err', text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMessage({ type: 'ok', text: 'เปลี่ยนรหัสผ่านสำเร็จ ระบบจะนำท่านไปหน้าเข้าสู่ระบบใหม่...' });
        setTimeout(() => {
          setShowSecurityModal(false);
          logout();
        }, 1500);
      } else {
        setPwdMessage({ type: 'err', text: data.error || data.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' });
      }
    } catch {
      setPwdMessage({ type: 'err', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!confirm('ยืนยันการยกเลิก Session การเข้าสู่ระบบทั้งหมด? คุณจะต้องเข้าสู่ระบบใหม่อีกครั้ง')) return;
    try {
      const res = await fetch('/api/auth/revoke-sessions', { method: 'POST' });
      if (res.ok) {
        setShowSecurityModal(false);
        await logout();
      }
    } catch (err) {
      console.error('Revoke error:', err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);
    setIsCreatingAdmin(true);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          displayName: newAdminDisplayName.trim() || newAdminUsername.trim(),
          password: newAdminPassword,
          role: newAdminRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMsg({ type: 'ok', text: `เพิ่มบัญชี @${data.username} (${data.role}) เรียบร้อยแล้ว` });
        setNewAdminUsername('');
        setNewAdminDisplayName('');
        setNewAdminPassword('');
        setNewAdminRole('ADMIN');
        loadAdminUsers();
      } else {
        setAdminMsg({ type: 'err', text: data.error || 'ไม่สามารถสร้างบัญชีได้' });
      }
    } catch {
      setAdminMsg({ type: 'err', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (targetUser: any) => {
    setAdminMsg(null);
    try {
      const res = await fetch(`/api/auth/users/${targetUser.id}/status`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        loadAdminUsers();
      } else {
        setAdminMsg({ type: 'err', text: data.error || 'ไม่สามารถเปลี่ยนสถานะได้' });
      }
    } catch {
      setAdminMsg({ type: 'err', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    }
  };

  const handleDeleteAdmin = async (targetUser: any) => {
    if (!confirm(`ยืนยันการลบบัญชีผู้ดูแล "@${targetUser.username}" (${targetUser.displayName}) ถาวรใช่หรือไม่?`)) return;
    setAdminMsg(null);
    try {
      const res = await fetch(`/api/auth/users/${targetUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAdminMsg({ type: 'ok', text: `ลบบัญชี @${targetUser.username} เรียบร้อยแล้ว` });
        loadAdminUsers();
      } else {
        setAdminMsg({ type: 'err', text: data.error || 'ไม่สามารถลบบัญชีได้' });
      }
    } catch {
      setAdminMsg({ type: 'err', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    }
  };

  return (
    <div className="flex min-h-screen bg-warm-sand">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-stone-border flex flex-col justify-between shrink-0 shadow-soft">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-stone-border flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-white shadow-soft">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-deep-slate tracking-tight">PhishCentral</h1>
              <p className="text-xs text-gray-500 font-medium">Enterprise Simulation</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-forest text-white shadow-soft font-semibold'
                        : 'text-gray-600 hover:text-deep-slate hover:bg-stone-muted'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & PDPA Info */}
        <div className="space-y-3 p-4 border-t border-stone-border/60">
          {user && (
            <div className="p-3 rounded-xl bg-stone-muted/70 border border-stone-border/60">
              <div className="flex items-center justify-between">
                <div className="truncate pr-2">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-xs font-bold text-deep-slate truncate">{user.displayName}</p>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        user.role === 'VIEWER'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-forest/10 text-forest'
                      }`}
                    >
                      {user.role || 'ADMIN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-mono truncate">@{user.username}</p>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenSecurityModal}
                    title={user.role === 'VIEWER' ? 'เปลี่ยนรหัสผ่าน (Change Password)' : 'จัดการผู้ดูแลระบบ รหัสผ่าน และ Session'}
                    className="p-1.5 text-gray-600 hover:text-forest hover:bg-white rounded-lg transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    title="ออกจากระบบ (Logout)"
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-forest-light border border-forest/10">
            <p className="text-xs font-semibold text-forest flex items-center space-x-1">
              <span>🛡️ PDPA Compliant</span>
            </p>
            <p className="text-[11px] text-forest/80 mt-0.5 leading-relaxed">
              Zero-Password Policy: ไม่มีการเก็บรหัสผ่านจริงของพนักงาน
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Security, Multi-Admin & Session Management Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-border">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-forest" />
                <h3 className="font-bold text-deep-slate text-base">
                  {user?.role === 'VIEWER'
                    ? 'เปลี่ยนรหัสผ่านบัญชีผู้ใช้งาน (Change Password)'
                    : 'ตั้งค่าความปลอดภัย & จัดการผู้ดูแลระบบ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSecurityModal(false)}
                className="text-gray-400 hover:text-deep-slate font-bold p-1 rounded-lg hover:bg-stone-muted"
              >
                ✕
              </button>
            </div>

            {/* Tabs (Only shown for ADMIN; VIEWER only sees Change Password) */}
            {user?.role !== 'VIEWER' && (
              <div className="flex border-b border-stone-border bg-stone-muted/40 px-5 pt-2 space-x-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('PASSWORD')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                    activeTab === 'PASSWORD'
                      ? 'border-forest text-forest bg-white'
                      : 'border-transparent text-gray-500 hover:text-deep-slate'
                  }`}
                >
                  🔑 เปลี่ยนรหัสผ่าน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ADMINS');
                    loadAdminUsers();
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                    activeTab === 'ADMINS'
                      ? 'border-forest text-forest bg-white'
                      : 'border-transparent text-gray-500 hover:text-deep-slate'
                  }`}
                >
                  👥 จัดการผู้ดูแล ({adminUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('SESSIONS');
                    loadSessions();
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                    activeTab === 'SESSIONS'
                      ? 'border-forest text-forest bg-white'
                      : 'border-transparent text-gray-500 hover:text-deep-slate'
                  }`}
                >
                  🛡️ Session &amp; ประวัติเข้าใช้งาน
                </button>
              </div>
            )}

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {(activeTab === 'PASSWORD' || user?.role === 'VIEWER') && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {pwdMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                        pwdMessage.type === 'ok'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {pwdMessage.type === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                      )}
                      <span>{pwdMessage.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      รหัสผ่านปัจจุบัน (Current Password)
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2.5 border border-stone-border rounded-xl outline-none focus:border-forest text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 border border-stone-border rounded-xl outline-none focus:border-forest text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ยืนยันรหัสผ่านใหม่ (Confirm New Password)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 border border-stone-border rounded-xl outline-none focus:border-forest text-sm"
                    />
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowSecurityModal(false)}
                      className="px-4 py-2 border border-stone-border rounded-xl text-xs font-semibold text-gray-600 hover:bg-stone-muted"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isChangingPwd}
                      className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-hover disabled:opacity-50"
                    >
                      {isChangingPwd ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'ADMINS' && user?.role !== 'VIEWER' && (
                <div className="space-y-5">
                  {adminMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                        adminMsg.type === 'ok'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {adminMsg.type === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                      )}
                      <span>{adminMsg.text}</span>
                    </div>
                  )}

                  {/* Add Admin Form (Only visible for ADMIN role) */}
                  {user?.role !== 'VIEWER' && (
                    <form onSubmit={handleCreateAdmin} className="p-4 rounded-xl bg-stone-muted/50 border border-stone-border space-y-3">
                      <h4 className="text-xs font-bold text-deep-slate flex items-center space-x-1.5">
                        <UserPlus className="w-4 h-4 text-forest" />
                        <span>เพิ่มบัญชีผู้ดูแลระบบใหม่ (Add Administrator)</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Username *</label>
                          <input
                            type="text"
                            required
                            minLength={3}
                            placeholder="เช่น soc_admin2"
                            value={newAdminUsername}
                            onChange={(e) => setNewAdminUsername(e.target.value)}
                            className="w-full p-2 border border-stone-border rounded-lg text-xs bg-white outline-none focus:border-forest"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">ชื่อที่แสดงผล (Display Name)</label>
                          <input
                            type="text"
                            placeholder="เช่น สมชาย (SOC Lead)"
                            value={newAdminDisplayName}
                            onChange={(e) => setNewAdminDisplayName(e.target.value)}
                            className="w-full p-2 border border-stone-border rounded-lg text-xs bg-white outline-none focus:border-forest"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัวอักษร) *</label>
                          <input
                            type="password"
                            required
                            minLength={8}
                            placeholder="••••••••"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            className="w-full p-2 border border-stone-border rounded-lg text-xs bg-white outline-none focus:border-forest"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">ระดับสิทธิ์ (Role)</label>
                          <select
                            value={newAdminRole}
                            onChange={(e) => setNewAdminRole(e.target.value as 'ADMIN' | 'VIEWER')}
                            className="w-full p-2 border border-stone-border rounded-lg text-xs bg-white outline-none focus:border-forest"
                          >
                            <option value="ADMIN">ADMIN — ผู้ดูแลระบบเต็มสิทธิ์</option>
                            <option value="VIEWER">VIEWER — ดูรายงานอย่างเดียว (Read-Only)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isCreatingAdmin}
                          className="px-4 py-2 bg-forest hover:bg-forest-hover text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                        >
                          {isCreatingAdmin ? 'กำลังสร้างบัญชี...' : '+ เพิ่มผู้ดูแลระบบ'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Admin List */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-2">
                      รายชื่อบัญชีผู้ดูแลทั้งหมด ({adminUsers.length} บัญชี)
                    </h4>
                    {isLoadingUsers ? (
                      <p className="text-xs text-gray-400 py-4 text-center">กำลังโหลดรายชื่อ...</p>
                    ) : (
                      <div className="border border-stone-border rounded-xl divide-y divide-stone-border/60 max-h-60 overflow-y-auto">
                        {adminUsers.map((adm) => {
                          const isSelf = adm.id === user?.id;
                          return (
                            <div key={adm.id} className="p-3 flex items-center justify-between hover:bg-stone-muted/30">
                              <div className="min-w-0 pr-3">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-xs text-deep-slate truncate">{adm.displayName}</span>
                                  <span className="text-[11px] font-mono text-gray-500">@{adm.username}</span>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-forest-light text-forest font-semibold">
                                      คุณ (You)
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                      adm.role === 'VIEWER'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-forest/10 text-forest'
                                    }`}
                                  >
                                    {adm.role || 'ADMIN'}
                                  </span>
                                  {!adm.isActive && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-semibold">
                                      ถูกระงับ (Suspended)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  เข้าสู่ระบบล่าสุด: {adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleString('th-TH') : 'ยังไม่เคยเข้าสู่ระบบ'}
                                </p>
                              </div>

                              {user?.role !== 'VIEWER' && !isSelf && (
                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAdminStatus(adm)}
                                    title={adm.isActive ? 'ระงับการใช้งานชั่วคราว' : 'เปิดใช้งานบัญชี'}
                                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                      adm.isActive
                                        ? 'text-amber-600 hover:bg-amber-50'
                                        : 'text-green-600 hover:bg-green-50'
                                    }`}
                                  >
                                    <Power className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAdmin(adm)}
                                    title="ลบบัญชีนี้ถาวร"
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'SESSIONS' && user?.role !== 'VIEWER' && (
                <div className="space-y-4">
                  {isLoadingSessions ? (
                    <p className="text-xs text-gray-500 py-4 text-center">กำลังโหลดข้อมูล Session...</p>
                  ) : (
                    <>
                      <div className="p-3.5 rounded-xl bg-forest-light border border-forest/20 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-forest">Session ปัจจุบัน: @{sessionData?.activeSession?.username || user?.username}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            เข้าสู่ระบบล่าสุด: {sessionData?.activeSession?.lastLoginAt ? new Date(sessionData.activeSession.lastLoginAt).toLocaleString('th-TH') : '-'}
                            {' '}• IP: <span className="font-mono">{sessionData?.activeSession?.lastLoginIp || 'Local'}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRevokeSessions}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          Revoke All
                        </button>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-forest" />
                          <span>ประวัติกิจกรรมความปลอดภัยล่าสุด (Security Audit Log)</span>
                        </h4>
                        <div className="border border-stone-border rounded-xl max-h-52 overflow-y-auto divide-y divide-stone-border/60">
                          {sessionData?.recentActivity?.length ? (
                            sessionData.recentActivity.map((log: any) => (
                              <div key={log.id} className="p-2.5 text-xs flex items-center justify-between hover:bg-stone-muted/30">
                                <div>
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold mr-2 ${
                                      log.action === 'LOGIN_FAILED'
                                        ? 'bg-red-100 text-red-700'
                                        : log.action === 'LOGIN_SUCCESS'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {log.action}
                                  </span>
                                  <span className="text-gray-600 text-[11px]">{log.details}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">
                                  {new Date(log.createdAt).toLocaleString('th-TH')}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 p-4 text-center">ยังไม่มีประวัติกิจกรรม</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
