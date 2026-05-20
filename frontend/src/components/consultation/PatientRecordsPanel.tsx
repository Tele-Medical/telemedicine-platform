import React from 'react';

const PatientRecordsPanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-8">
      {/* Vitals Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Latest Vitals</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background rounded-xl p-3">
            <span className="text-xs text-text-secondary block">Blood Pressure</span>
            <span className="text-lg font-bold text-text-primary">120/80 <span className="text-xs font-normal">mmHg</span></span>
          </div>
          <div className="bg-background rounded-xl p-3">
            <span className="text-xs text-text-secondary block">Pulse</span>
            <span className="text-lg font-bold text-text-primary">72 <span className="text-xs font-normal">bpm</span></span>
          </div>
          <div className="bg-background rounded-xl p-3">
            <span className="text-xs text-text-secondary block">Temp</span>
            <span className="text-lg font-bold text-text-primary">98.6 <span className="text-xs font-normal">°F</span></span>
          </div>
          <div className="bg-background rounded-xl p-3">
            <span className="text-xs text-text-secondary block">SpO2</span>
            <span className="text-lg font-bold text-text-primary">99 <span className="text-xs font-normal">%</span></span>
          </div>
        </div>
      </div>

      {/* Past Documents */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Documents</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 bg-background rounded-xl active:bg-black/5 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Complete Blood Count</p>
              <p className="text-xs text-text-secondary">Oct 12, 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-background rounded-xl active:bg-black/5 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Previous Prescription</p>
              <p className="text-xs text-text-secondary">Oct 05, 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRecordsPanel;
