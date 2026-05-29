import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Heart, FileText, Pill, User, RefreshCw, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const BottomNav = () => {
  const { t } = useTranslation();

  const [role, setRole] = React.useState(() => {
    try {
      return localStorage.getItem('role') || 'patient';
    } catch {
      return 'patient';
    }
  });

  React.useEffect(() => {
    const handleStorage = () => {
      try {
        setRole(localStorage.getItem('role') || 'patient');
      } catch {
        setRole('patient');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'doctor':
      case 'practitioner':
        return [
          { to: '/', labelKey: 'nav.queue', icon: Calendar },
          { to: '/consults', labelKey: 'nav.consults', icon: Heart },
          { to: '/patients', labelKey: 'nav.patients', icon: User },
          { to: '/profile', labelKey: 'nav.profile', icon: User },
        ];
      case 'asha':
      case 'asha_worker':
      case 'staff':
        return [
          { to: '/', labelKey: 'nav.assisted', icon: Heart },
          { to: '/patients', labelKey: 'nav.patients', icon: User },
          { to: '/sync', labelKey: 'nav.sync', icon: RefreshCw },
          { to: '/profile', labelKey: 'nav.profile', icon: User },
        ];
      case 'pharmacist':
        return [
          { to: '/', labelKey: 'nav.fulfill', icon: Pill },
          { to: '/inventory', labelKey: 'nav.inventory', icon: FileText },
          { to: '/search', labelKey: 'nav.search', icon: Home },
          { to: '/profile', labelKey: 'nav.profile', icon: User },
        ];
      case 'admin':
        return [
          { to: '/', labelKey: 'nav.overview', icon: BarChart2 },
          { to: '/users', labelKey: 'nav.users', icon: User },
          { to: '/clinics', labelKey: 'nav.clinics', icon: Home },
          { to: '/profile', labelKey: 'nav.profile', icon: User },
        ];
      case 'patient':
      default:
        return [
          { to: '/', labelKey: 'nav.home', icon: Home },
          { to: '/records', labelKey: 'nav.records', icon: FileText },
          { to: '/medicines', labelKey: 'nav.medicines', icon: Pill },
          { to: '/profile', labelKey: 'nav.profile', icon: User },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav 
      aria-label="Primary Navigation" 
      className="sticky bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-neutral-200 px-4 py-2.5 flex justify-around items-center shadow-[0_-4px_12px_-2px_rgba(15,23,42,0.06)] z-50"
    >
      {navItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <NavLink 
            key={item.to}
            to={item.to} 
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30 ${
                isActive 
                  ? 'text-primary-600 font-semibold scale-105' 
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50/50'
              }`
            }
          >
            <IconComponent size={20} className="stroke-[2.25]" />
            <span className="text-[11px] tracking-wide">{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
