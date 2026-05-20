import React from 'react';

const VitalsWidget: React.FC = () => {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-text-primary mb-3">Recent Vitals</h2>
      <div className="grid grid-cols-2 gap-4">
        
        {/* BP Widget */}
        <div className="bg-white rounded-2xl p-4 shadow-soft border border-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>
            <span className="text-sm font-medium text-text-secondary">Blood Pressure</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">120/80</div>
            <div className="text-xs text-text-secondary mt-1">mmHg • Normal</div>
          </div>
        </div>

        {/* Pulse Widget */}
        <div className="bg-white rounded-2xl p-4 shadow-soft border border-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <span className="text-sm font-medium text-text-secondary">Pulse</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">72</div>
            <div className="text-xs text-text-secondary mt-1">bpm • Normal</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VitalsWidget;
