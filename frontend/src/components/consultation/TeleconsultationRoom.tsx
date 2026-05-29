import React, { useState, useCallback, useEffect } from 'react';
import VideoFeed from './VideoFeed';
import PatientRecordsPanel from './PatientRecordsPanel';
import PrescriptionComposer from './PrescriptionComposer';
import InCallChat, { type ChatMessage } from './InCallChat';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';

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
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sendMessageCallback, setSendMessageCallback] = useState<((text: string) => void) | null>(null);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sendSignalCallback, setSendSignalCallback] = useState<((type: string, payload: any) => void) | null>(null);

  const patientId = searchParams.get('patientId');
  const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(patientId);

  useEffect(() => {
    if (!resolvedPatientId && appointmentId && !appointmentId.startsWith('appt-')) {
      apiClient(`/appointments/${appointmentId}`)
        .then(data => {
          if (data && data.patient_id) {
            setResolvedPatientId(data.patient_id);
          }
        })
        .catch(err => console.warn("Failed to fetch patientId from appointment in TeleconsultationRoom", err));
    }
  }, [appointmentId, resolvedPatientId]);

  const handleChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  const handleRegisterSendChat = useCallback((sendFn: (text: string) => void) => {
    setSendMessageCallback(() => sendFn);
  }, []);

  const handleAppSignal = useCallback((type: string) => {
    if (type === 'data_refresh') setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleRegisterSendSignal = useCallback((sendFn: (type: string, payload: any) => void) => {
    setSendSignalCallback(() => sendFn);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-neutral-950 text-neutral-900 font-sans">
      {/* Top/Left Section - Video Call */}
      <div className="flex-none lg:flex-1 lg:h-full relative overflow-hidden">
        <VideoFeed 
          appointmentId={appointmentId} 
          userRole={userRole} 
          onChatMessage={handleChatMessage}
          registerSendChat={handleRegisterSendChat}
          onAppSignal={handleAppSignal}
          registerSendSignal={handleRegisterSendSignal}
        />
      </div>

      {/* Bottom/Right Section - Interactive Panel */}
      <div className="flex-1 lg:w-[420px] lg:flex-none flex flex-col overflow-hidden bg-neutral-50 border-t lg:border-t-0 lg:border-l border-white/10 lg:border-neutral-200">
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
          <button
            id="tab-chat"
            role="tab"
            aria-selected={activeTab === 'chat' as any}
            aria-controls="panel-chat"
            onClick={() => setActiveTab('chat' as any)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'chat' as any
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {t('clinical.chat', 'Chat')}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'records' as any && (
            <div
              id="panel-records"
              role="tabpanel"
              aria-labelledby="tab-records"
              className="animate-fade-in h-full"
            >
              <PatientRecordsPanel 
                patientId={resolvedPatientId || undefined} 
                appointmentId={appointmentId}
                refreshTrigger={refreshTrigger}
                onDataUpdated={() => {
                  if (sendSignalCallback) sendSignalCallback('data_refresh', {});
                }}
              />
            </div>
          )}
          {userRole !== 'patient' && activeTab === 'prescription' && (
            <div
              id="panel-prescription"
              role="tabpanel"
              aria-labelledby="tab-prescription"
              className="animate-fade-in h-full"
            >
              <PrescriptionComposer appointmentId={appointmentId} patientId={resolvedPatientId || undefined} />
            </div>
          )}
          {activeTab === 'chat' as any && (
            <div
              id="panel-chat"
              role="tabpanel"
              aria-labelledby="tab-chat"
              className="animate-fade-in h-full"
            >
              <InCallChat 
                messages={chatMessages} 
                currentUserId={userRole} 
                onSendMessage={(text) => {
                  if (sendMessageCallback) {
                    sendMessageCallback(text);
                  }
                }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeleconsultationRoom;
