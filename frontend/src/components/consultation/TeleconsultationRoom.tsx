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
          aria-label="Exit consultation and return to dashboard"
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
        <div 
          role="tablist"
          aria-label="Clinical information panels"
          className="flex p-4 gap-2 border-b border-black/5 bg-background sticky top-0 z-10"
        >
          <button 
            id="tab-records"
            role="tab"
            aria-selected={activeTab === 'records'}
            aria-controls="panel-records"
            onClick={() => setActiveTab('records')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'records' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-surface-dim'}`}
          >
            Records
          </button>
          <button 
            id="tab-prescription"
            role="tab"
            aria-selected={activeTab === 'prescription'}
            aria-controls="panel-prescription"
            onClick={() => setActiveTab('prescription')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'prescription' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-surface-dim'}`}
          >
            Prescription
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div 
            id="panel-records"
            role="tabpanel"
            aria-labelledby="tab-records"
            hidden={activeTab !== 'records'}
            className={activeTab === 'records' ? 'block' : 'hidden'}
          >
            <PatientRecordsPanel />
          </div>
          <div 
            id="panel-prescription"
            role="tabpanel"
            aria-labelledby="tab-prescription"
            hidden={activeTab !== 'prescription'}
            className={activeTab === 'prescription' ? 'block' : 'hidden'}
          >
            <PrescriptionComposer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeleconsultationRoom;
