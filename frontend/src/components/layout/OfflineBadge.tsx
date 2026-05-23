import React from 'react';
import { useTranslation } from 'react-i18next';

interface OfflineBadgeProps {
  isOffline: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

const OfflineBadge: React.FC<OfflineBadgeProps> = ({ isOffline, syncStatus }) => {
  const { t } = useTranslation();

  if (!isOffline && syncStatus === 'synced') {
    return null;
  }

  const getBadgeConfig = () => {
    if (isOffline) {
      return { text: t('app.offline_notice'), className: 'bg-warning/10 text-warning border-warning/20' };
    }
    if (syncStatus === 'conflict') {
      return { text: 'Sync Conflict', className: 'bg-danger/10 text-danger border-danger/20' };
    }
    if (syncStatus === 'pending') {
      return { text: t('app.syncing'), className: 'bg-info/10 text-info border-info/20 animate-pulse' };
    }
    return { text: 'Synced', className: 'bg-success/10 text-success border-success/20' };
  };

  const config = getBadgeConfig();

  return (
    <div className={`text-[10px] px-2.5 py-1 rounded-full font-black border uppercase tracking-wider ${config.className}`}>
      {config.text}
    </div>
  );
};

export default OfflineBadge;
