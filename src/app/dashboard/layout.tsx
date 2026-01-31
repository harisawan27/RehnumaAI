'use client';
import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar will be handled in the page itself */}
      {children}
    </div>
  );
}