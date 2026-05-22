import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Heart, FileText, Pill, User, RefreshCw, BarChart2 } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const BottomNav = () => {
  const role = React.useMemo(() => {
    try {
      return localStorage.getItem('role') || 'patient';
    } catch {
      return 'patient';
    }
  }, []);

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'doctor':
      case 'practitioner':
        return [
          { to: '/', label: 'Queue', icon: Calendar },
          { to: '/consults', label: 'Consults', icon: Heart },
          { to: '/patients', label: 'Patients', icon: User },
          { to: '/prescriptions', label: 'Prescriptions', icon: FileText },
          { to: '/profile', label: 'Profile', icon: User },
        ];
      case 'asha':
      case 'staff':
        return [
          { to: '/', label: 'Assisted', icon: Heart },
          { to: '/patients', label: 'Patients', icon: User },
          { to: '/appointments', label: 'Appts', icon: Calendar },
          { to: '/sync', label: 'Sync', icon: RefreshCw },
          { to: '/profile', label: 'Profile', icon: User },
        ];
      case 'pharmacist':
        return [
          { to: '/', label: 'Fulfill', icon: Pill },
          { to: '/inventory', label: 'Inventory', icon: FileText },
          { to: '/search', label: 'Search', icon: Home },
          { to: '/profile', label: 'Profile', icon: User },
        ];
      case 'admin':
        return [
          { to: '/', label: 'Overview', icon: BarChart2 },
          { to: '/users', label: 'Users', icon: User },
          { to: '/clinics', label: 'Clinics', icon: Home },
          { to: '/profile', label: 'Profile', icon: User },
        ];
      case 'patient':
      default:
        return [
          { to: '/', label: 'Home', icon: Home },
          { to: '/records', label: 'Records', icon: FileText },
          { to: '/medicines', label: 'Medicines', icon: Pill },
          { to: '/profile', label: 'Profile', icon: User },
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
            <span className="text-[11px] tracking-wide">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
