import React from 'react';
import OfflineBadge from './OfflineBadge';

interface TopBarProps {
  isOffline: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
  onLogout?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ isOffline, syncStatus, onLogout }) => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-neutral-200 px-4 py-3 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Telemedicine</h1>
      <div className="flex items-center gap-3">
        <OfflineBadge isOffline={isOffline} syncStatus={syncStatus} />
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 min-h-[40px] border border-danger-200 text-danger-600 rounded-xl text-sm font-semibold bg-danger-50/50 hover:bg-danger-50 hover:border-danger-300 transition-all duration-200 shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-danger-600/30"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
