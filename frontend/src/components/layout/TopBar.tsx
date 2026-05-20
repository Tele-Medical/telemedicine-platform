import React from 'react';
import OfflineBadge from './OfflineBadge';

interface TopBarProps {
  isOffline: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

const TopBar: React.FC<TopBarProps> = ({ isOffline, syncStatus }) => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold text-gray-800 tracking-tight">Telemedicine</h1>
      <OfflineBadge isOffline={isOffline} syncStatus={syncStatus} />
    </header>
  );
};

export default TopBar;
