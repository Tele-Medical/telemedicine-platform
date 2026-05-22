import React from 'react';
import OfflineBadge from './OfflineBadge';

interface TopBarProps {
  isOffline: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
  onLogout?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ isOffline, syncStatus, onLogout }) => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold text-gray-800 tracking-tight">Telemedicine</h1>
      <div className="flex items-center gap-3">
        <OfflineBadge isOffline={isOffline} syncStatus={syncStatus} />
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition-all duration-200 shadow-sm active:scale-95 outline-none"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
