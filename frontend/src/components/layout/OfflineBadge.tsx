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
      return { text: 'Offline Mode', className: 'bg-warning/10 text-warning border-warning/20' };
    }
    if (syncStatus === 'conflict') {
      return { text: 'Sync Conflict', className: 'bg-danger/10 text-danger border-danger/20' };
    }
    if (syncStatus === 'pending') {
      return { text: 'Syncing...', className: 'bg-info/10 text-info border-info/20 animate-pulse' };
    }
    return { text: 'Synced', className: 'bg-success/10 text-success border-success/20' };
  };

  const config = getBadgeConfig();

  return (
    <div className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${config.className}`}>
      {config.text}
    </div>
  );
};

export default OfflineBadge;
