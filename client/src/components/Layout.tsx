import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Send, Users, FileCode, Server, ShieldCheck } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navItems = [
    { to: '/', label: 'ภาพรวมระบบ (Dashboard)', icon: LayoutDashboard },
    { to: '/campaigns', label: 'แคมเปญ (Campaigns)', icon: Send },
    { to: '/targets', label: 'กลุ่มเป้าหมาย (Targets)', icon: Users },
    { to: '/templates', label: 'คลังเทมเพลต (Templates)', icon: FileCode },
    { to: '/smtp', label: 'การส่งเมล (SMTP Profiles)', icon: Server },
  ];

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

        {/* Footer info */}
        <div className="p-4 m-4 rounded-xl bg-forest-light border border-forest/10">
          <p className="text-xs font-semibold text-forest flex items-center space-x-1">
            <span>🛡️ PDPA Compliant</span>
          </p>
          <p className="text-[11px] text-forest/80 mt-0.5 leading-relaxed">
            Zero-Password Policy: ไม่มีการเก็บรหัสผ่านจริงของพนักงาน
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
