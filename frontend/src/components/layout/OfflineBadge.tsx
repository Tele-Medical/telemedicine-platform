import React from 'react';

interface OfflineBadgeProps {
  isOffline: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

const OfflineBadge: React.FC<OfflineBadgeProps> = ({ isOffline, syncStatus }) => {
  if (!isOffline && syncStatus === 'synced') {
    return null;
  }

  const getBadgeConfig = () => {
    if (isOffline) {
      return { text: 'Offline Mode', className: 'bg-yellow-500 text-white' };
    }
    if (syncStatus === 'conflict') {
      return { text: 'Sync Conflict', className: 'bg-red-500 text-white' };
    }
    if (syncStatus === 'pending') {
      return { text: 'Syncing...', className: 'bg-blue-500 text-white' };
    }
    return { text: 'Synced', className: 'bg-green-500 text-white' };
  };

  const config = getBadgeConfig();

  return (
    <div className={`text-xs px-2 py-1 rounded-full font-medium ${config.className}`}>
      {config.text}
    </div>
  );
};

export default OfflineBadge;
