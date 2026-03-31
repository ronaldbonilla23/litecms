import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0e0e0e] text-white selection:bg-primary selection:text-black flex flex-col min-h-screen font-body">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="sticky top-0 h-screen overflow-hidden">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
