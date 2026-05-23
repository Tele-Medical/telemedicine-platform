import React, { useState } from 'react';
import VideoFeed from './VideoFeed';
import PatientRecordsPanel from './PatientRecordsPanel';
import PrescriptionComposer from './PrescriptionComposer';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface TeleconsultationRoomProps {
  userRole?: string;
  appointmentId?: string;
  token?: string;
}

const TeleconsultationRoom: React.FC<TeleconsultationRoomProps> = ({ 
  userRole = 'practitioner', 
  appointmentId: propAppointmentId
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'records' | 'prescription'>('records');
  const [searchParams] = useSearchParams();
  const [appointmentId] = useState(() => {
    return propAppointmentId || searchParams.get('appointmentId') || (
      typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + '-' + Date.now()
    );
  });

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-50 text-neutral-900 font-sans">
      {/* Top Section - Video Call */}
      <div className="flex-none">
        <VideoFeed appointmentId={appointmentId} userRole={userRole} />
      </div>

      {/* Bottom Section - Interactive Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Clinical information panels"
          className="flex p-4 gap-2 border-b border-neutral-200 bg-white sticky top-0 z-10"
        >
          <button
            id="tab-records"
            role="tab"
            aria-selected={activeTab === 'records'}
            aria-controls="panel-records"
            onClick={() => setActiveTab('records')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'records'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {t('nav.records')}
          </button>
          {userRole !== 'patient' && (
            <button
              id="tab-prescription"
              role="tab"
              aria-selected={activeTab === 'prescription'}
              aria-controls="panel-prescription"
              onClick={() => setActiveTab('prescription')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'prescription'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {t('clinical.prescription')}
            </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'records' && (
            <div
              id="panel-records"
              role="tabpanel"
              aria-labelledby="tab-records"
              className="animate-fade-in"
            >
              <PatientRecordsPanel />
            </div>
          )}
          {userRole !== 'patient' && activeTab === 'prescription' && (
            <div
              id="panel-prescription"
              role="tabpanel"
              aria-labelledby="tab-prescription"
              className="animate-fade-in"
            >
              <PrescriptionComposer appointmentId={appointmentId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeleconsultationRoom;
