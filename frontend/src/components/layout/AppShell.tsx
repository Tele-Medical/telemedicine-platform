import React from 'react';
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
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans">
      <TopBar isOffline={isOffline} syncStatus={syncStatus} onLogout={onLogout} />
      
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 overflow-y-auto pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};

export default AppShell;
