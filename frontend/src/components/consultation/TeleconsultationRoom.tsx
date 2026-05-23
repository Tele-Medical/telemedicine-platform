import React, { useState } from 'react';
import VideoFeed from './VideoFeed';
import PatientRecordsPanel from './PatientRecordsPanel';
import PrescriptionComposer from './PrescriptionComposer';
import { useSearchParams } from 'react-router-dom';

interface TeleconsultationRoomProps {
  userRole?: string;
  appointmentId?: string;
  token?: string;
}

const TeleconsultationRoom: React.FC<TeleconsultationRoomProps> = ({ 
  userRole = 'practitioner', 
  appointmentId: propAppointmentId
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'prescription'>('records');
  const [searchParams] = useSearchParams();
  const appointmentId = propAppointmentId || searchParams.get('appointmentId') || '11111111-2222-3333-4444-555555555555';

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Top Section - Video Call */}
      <div className="flex-none">
        <VideoFeed appointmentId={appointmentId} userRole={userRole} />
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
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Records
          </button>
          {userRole !== 'patient' && (
            <button
              id="tab-prescription"
              role="tab"
              aria-selected={activeTab === 'prescription'}
              aria-controls="panel-prescription"
              onClick={() => setActiveTab('prescription')}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'prescription'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Prescription
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
            >
              <PatientRecordsPanel />
            </div>
          )}
          {userRole !== 'patient' && activeTab === 'prescription' && (
            <div
              id="panel-prescription"
              role="tabpanel"
              aria-labelledby="tab-prescription"
            >
              <PrescriptionComposer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeleconsultationRoom;
