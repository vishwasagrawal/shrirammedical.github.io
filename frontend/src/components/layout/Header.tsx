import { Bell, Menu, Moon, Sun, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth.store';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  readonly onToggleSidebar: () => void;
  readonly onMobileMenu: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/medicines':  'Medicines',
  '/billing':    'Billing / POS',
  '/purchases':  'Purchases',
  '/suppliers':  'Suppliers',
  '/customers':  'Customers',
  '/reports':    'Reports',
  '/audit-logs': 'Audit Logs',
  '/settings':   'Settings',
};

export function Header({ onToggleSidebar, onMobileMenu }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const location = useLocation();

  const currentLabel = ROUTE_LABELS[location.pathname] || 'MedStore';

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Desktop toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        {/* Mobile */}
        <button
          onClick={onMobileMenu}
          className="flex lg:hidden items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground hidden sm:block">Shri Ram Medical</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:block" />
          <span className="font-semibold text-foreground">{currentLabel}</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-1 ring-card animate-pulse-dot" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-semibold text-foreground leading-none">{user?.fullName}</p>
            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
