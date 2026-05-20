import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, Pill, ShoppingCart, Package, Truck, Users,
  BarChart3, Settings, Activity, X, LogOut, ChevronRight,
} from 'lucide-react';

function MedicalCrossIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="9" y="2" width="6" height="20" rx="1.5" />
      <rect x="2" y="9" width="20" height="6" rx="1.5" />
    </svg>
  );
}
import { toast } from 'sonner';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/medicines',  label: 'Medicines',    icon: Pill },
      { path: '/billing',    label: 'Billing / POS', icon: ShoppingCart },
      { path: '/purchases',  label: 'Purchases',    icon: Package },
      { path: '/suppliers',  label: 'Suppliers',    icon: Truck },
      { path: '/customers',  label: 'Customers',    icon: Users },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Admin',
    items: [
      { path: '/audit-logs', label: 'Audit Logs', icon: Activity,  roles: ['ADMIN'] },
      { path: '/settings',   label: 'Settings',   icon: Settings,  roles: ['ADMIN'] },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

export function Sidebar({ collapsed, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'hsl(var(--sidebar))', borderRight: '1px solid hsl(var(--sidebar-border))' }}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex items-center h-16 px-4 flex-shrink-0',
          collapsed ? 'justify-center' : 'gap-3'
        )}
        style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
      >
        <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-primary to-sky-500 rounded-xl flex items-center justify-center shadow-glow-sm">
          <MedicalCrossIcon className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">Shri Ram Medical</p>
            <p className="text-xs truncate leading-tight" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
              Mandla
            </p>
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'hsl(var(--sidebar-foreground))' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            !item.roles || (user && item.roles.includes(user.role))
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p
                  className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'hsl(var(--sidebar-foreground) / 0.5)' }}
                >
                  {section.label}
                </p>
              )}
              {collapsed && <div className="my-2 mx-3 h-px" style={{ background: 'hsl(var(--sidebar-border))' }} />}

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                        collapsed ? 'justify-center' : '',
                        isActive
                          ? 'bg-primary/15 text-primary border border-primary/25'
                          : 'border border-transparent hover:border-transparent'
                      )}
                      style={
                        isActive
                          ? {}
                          : { color: 'hsl(var(--sidebar-foreground))' }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'hsl(var(--sidebar-muted))';
                          e.currentTarget.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = '';
                          e.currentTarget.style.color = 'hsl(var(--sidebar-foreground))';
                        }
                      }}
                    >
                      <item.icon className="w-4.5 h-4.5 flex-shrink-0 w-[18px] h-[18px]" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && (
                            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User / Logout ── */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}>
        {!collapsed && (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
            style={{ background: 'hsl(var(--sidebar-muted))' }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{user?.fullName}</p>
              <p className="text-xs capitalize leading-tight" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            collapsed ? 'justify-center' : ''
          )}
          style={{ color: 'hsl(var(--sidebar-foreground))' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
            e.currentTarget.style.color = 'rgb(248,113,113)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '';
            e.currentTarget.style.color = 'hsl(var(--sidebar-foreground))';
          }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
