import React from 'react';
import { FileText } from 'lucide-react';

interface RecentRecordsListProps {
  isDemo?: boolean;
}

const RecentRecordsList: React.FC<RecentRecordsListProps> = ({ isDemo = false }) => {
  const records = [
    { id: 1, title: 'Lab Report - Blood Test', date: 'Oct 12, 2026', type: 'lab' },
    { id: 2, title: 'Prescription - Dr. Sharma', date: 'Oct 05, 2026', type: 'prescription' },
  ];

  if (!isDemo) {
    return (
      <div className="mt-6 mb-8 animate-fade-in">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Recent Records</h2>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-neutral-50 text-neutral-400 border border-neutral-100 flex items-center justify-center">
            <FileText size={22} className="stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">No Recent Records</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              No recent medical records found. Go to the Records tab to upload health files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 mb-8">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-text-primary">Recent Records</h2>
        <button className="text-sm text-primary font-medium hover:underline">View All</button>
      </div>
      
      <ul className="flex flex-col gap-3">
        {records.map(record => (
          <li key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-black/5 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.type === 'lab' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-text-primary">{record.title}</h3>
              <p className="text-xs text-text-secondary mt-0.5">{record.date}</p>
            </div>
            <svg className="text-text-secondary opacity-50" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentRecordsList;
