import React from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  isOffline?: boolean;
  syncStatus?: 'synced' | 'pending' | 'conflict';
  onLogout?: () => void;
}

const AppShell: React.FC<AppShellProps> = ({ 
  children, 
  isOffline = false, 
  syncStatus = 'synced',
  onLogout
}) => {
  const location = useLocation();
  const isConsultation = location.pathname === '/consultation';

  if (isConsultation) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900 font-sans">
        <main className="flex-1 w-full overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <TopBar isOffline={isOffline} syncStatus={syncStatus} onLogout={onLogout} />
      
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 overflow-y-auto pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};

export default AppShell;
