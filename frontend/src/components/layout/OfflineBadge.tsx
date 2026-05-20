import React from 'react';

interface OfflineBadgeProps {
  isOffline: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

const OfflineBadge: React.FC<OfflineBadgeProps> = ({ isOffline, syncStatus }) => {
  if (!isOffline && syncStatus === 'synced') {
    return null;
  }

  return (
    <div className={`text-xs px-2 py-1 rounded-full font-medium ${isOffline ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}`}>
      {isOffline ? 'Offline Mode' : 'Syncing...'}
    </div>
  );
};

export default OfflineBadge;
