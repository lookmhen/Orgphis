import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username.trim(), password);
    setIsSubmitting(false);

    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-warm-sand flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-forest text-white shadow-soft mb-4">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-deep-slate tracking-tight">PhishCentral</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Security Awareness &amp; Phishing Simulation Console
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-stone-border shadow-soft p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-deep-slate flex items-center space-x-2">
              <Lock className="w-4 h-4 text-forest" />
              <span>เข้าสู่ระบบผู้ดูแล (Admin Sign In)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              เฉพาะเจ้าหน้าที่ดูแลระบบความปลอดภัย (SOC / IT Security) เท่านั้น
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                ชื่อผู้ใช้ (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-border rounded-xl outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-border rounded-xl outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-forest hover:bg-forest-hover disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-soft flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>{isSubmitting ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-stone-border/60 flex items-center justify-between text-[11px] text-gray-400">
            <span>🛡️ Protected by JWT &amp; Rate Limiter</span>
            <span>Zero-Password Policy</span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          PhishCentral v2.2.0 • Enterprise Security Awareness Platform
        </p>
      </div>
    </div>
  );
};
