import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-sand flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-forest flex items-center justify-center text-white shadow-soft animate-pulse mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <p className="text-sm font-medium text-gray-600">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
