
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
  return (
    <nav aria-label="Primary" className="sticky bottom-0 w-full bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
      <NavLink to="/" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-teal-600' : 'text-gray-500'}`}>
        <span className="text-2xl" aria-hidden="true">🏠</span>
        <span className="text-xs font-medium">Home</span>
      </NavLink>
      <NavLink to="/appointments" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-teal-600' : 'text-gray-500'}`}>
        <span className="text-2xl" aria-hidden="true">📅</span>
        <span className="text-xs font-medium">Appointments</span>
      </NavLink>
      <NavLink to="/profile" className={({isActive}) => `flex flex-col items-center gap-1 ${isActive ? 'text-teal-600' : 'text-gray-500'}`}>
        <span className="text-2xl" aria-hidden="true">👤</span>
        <span className="text-xs font-medium">Profile</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
