import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-60' : 'w-[60px]'
        )}
      >
        <Sidebar collapsed={!sidebarOpen} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-60 animate-slide-in">
            <Sidebar collapsed={false} onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
          onMobileMenu={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-mesh" style={{ background: 'hsl(var(--background))' }}>
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
        <footer className="shrink-0 border-t border-border bg-background px-6 py-2 flex items-center justify-center gap-3 text-xs font-semibold text-foreground">
          <span>Created by <span className="text-primary">Vishwas Agrawal</span>, Mandla</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 inline-block" />
          <span>9035785285</span>
        </footer>
      </div>
    </div>
  );
}
