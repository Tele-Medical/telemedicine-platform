import React, { useState } from 'react';
import VideoFeed from './VideoFeed';
import PatientRecordsPanel from './PatientRecordsPanel';
import PrescriptionComposer from './PrescriptionComposer';
import { useNavigate } from 'react-router-dom';

const TeleconsultationRoom: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'records' | 'prescription'>('records');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      
      {/* Top Header - Context */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>

      {/* Top Section - Video */}
      <div className="flex-none">
        <VideoFeed />
      </div>

      {/* Bottom Section - Interactive Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        
        {/* Tab Navigation */}
        <div className="flex p-4 gap-2 border-b border-black/5 bg-background sticky top-0 z-10">
          <button 
            onClick={() => setActiveTab('records')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'records' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-surface-dim'}`}
          >
            Records
          </button>
          <button 
            onClick={() => setActiveTab('prescription')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'prescription' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-surface-dim'}`}
          >
            Prescription
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'records' ? (
            <PatientRecordsPanel />
          ) : (
            <PrescriptionComposer />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeleconsultationRoom;
