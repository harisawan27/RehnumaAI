'use client';
import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 text-slate-900 overflow-hidden">
      {children}
    </div>
  );
}
