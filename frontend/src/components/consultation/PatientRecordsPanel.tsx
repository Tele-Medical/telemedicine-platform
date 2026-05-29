import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';
import { 
  Download, 
  FileText, 
  Search, 
  Activity, 
  Upload, 
  Plus, 
  X,
  Clipboard,
  ShieldAlert
} from 'lucide-react';

interface Observation {
  id: string;
  code: string;
  value_numeric: number;
  value_string: string;
  unit: string;
}

interface DocumentRef {
  id: string;
  file_name: string;
  document_type: string;
  created_at: string;
}

interface MedicalCondition {
  id: string;
  clinical_status: string;
  disease_name: string;
  created_at: string;
}

interface AllergyRecord {
  id: string;
  substance: string;
  criticality: string;
  created_at: string;
}

interface AppointmentDetail {
  id: string;
  chief_complaint?: string;
  triage_priority?: string;
}

interface PatientRecordsPanelProps {
  patientId?: string;
  appointmentId?: string;
  refreshTrigger?: number; // Used to trigger refetch when websocket signal received
  onDataUpdated?: () => void; // Trigger websocket signal to other peer
}

const PatientRecordsPanel: React.FC<PatientRecordsPanelProps> = ({ 
  patientId, 
  appointmentId, 
  refreshTrigger = 0, 
  onDataUpdated 
}) => {
  const { t } = useTranslation();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [documents, setDocuments] = useState<DocumentRef[]>([]);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [allergies, setAllergies] = useState<AllergyRecord[]>([]);
  const [apptDetails, setApptDetails] = useState<AppointmentDetail | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Vitals Modal State
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [vitalsData, setVitalsData] = useState({ temp: '', pulse: '', bp: '' });

  const fetchData = async () => {
    if (!patientId) return;
    try {
      // 1. Fetch vital observations
      const obsData = await apiClient(`/clinical/observations?patient_id=${patientId}`);
      if (obsData && Array.isArray(obsData)) setObservations(obsData);
      
      // 2. Fetch reports
      const docData = await apiClient(`/clinical/documents?patient_id=${patientId}`);
      if (docData && Array.isArray(docData)) setDocuments(docData);

      // 3. Fetch active conditions/diagnoses (Medical History)
      const conditionData = await apiClient(`/clinical/conditions?patient_id=${patientId}`);
      if (conditionData && Array.isArray(conditionData)) setConditions(conditionData);

      // 4. Fetch allergies
      const allergyData = await apiClient(`/clinical/allergies?patient_id=${patientId}`);
      if (allergyData && Array.isArray(allergyData)) setAllergies(allergyData);

      // 5. Fetch active appointment details (ASHA Triage Symptoms & notes)
      if (appointmentId) {
        try {
          const appt = await apiClient(`/appointments/${appointmentId}`);
          if (appt) setApptDetails(appt);
        } catch (err) {
          console.warn('Failed to load active appointment clinical details', err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch records", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId, appointmentId, refreshTrigger]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    if (appointmentId) formData.append('appointment_id', appointmentId);
    formData.append('document_type', 'report');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/clinical/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      if (response.ok) {
        await fetchData();
        if (onDataUpdated) onDataUpdated();
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    const ops: Promise<unknown>[] = [];

    const addObs = (code: string, value: string, unit: string) => {
      ops.push(apiClient('/clinical/observations', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          encounter_id: appointmentId || null,
          code,
          value_string: value,
          unit
        })
      }));
    };

    if (vitalsData.temp) addObs('8310-5', vitalsData.temp, 'F');
    if (vitalsData.pulse) addObs('8867-4', vitalsData.pulse, 'bpm');
    if (vitalsData.bp) addObs('85354-9', vitalsData.bp, 'mmHg');

    try {
      await Promise.all(ops);
      setVitalsData({ temp: '', pulse: '', bp: '' });
      setIsVitalsModalOpen(false);
      await fetchData();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error("Failed to save vitals", err);
    }
  };

  const filteredDocs = documents.filter(d => d.file_name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Resolve LOINC clinical codes
  const getObservation = (codeList: string[]) => {
    const obs = observations.find(o => codeList.includes(o.code));
    if (!obs) return { value: '--', unit: '' };
    return { value: obs.value_string || obs.value_numeric, unit: obs.unit || '' };
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in p-4 text-neutral-900 font-sans h-full overflow-y-auto">
      
      {/* ASHA Symptoms & ML Triage Card */}
      {apptDetails && apptDetails.chief_complaint && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 animate-fade-in">
          <div className="flex items-center justify-between border-b pb-2 mb-2.5">
            <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
              <Clipboard size={14} className="text-primary stroke-[2.25]" />
              <span>ASHA Triage Symptoms</span>
            </h3>
            {apptDetails.triage_priority && (
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider shadow-inner ${
                apptDetails.triage_priority === 'Critical' 
                  ? 'bg-danger/5 text-danger border-danger/10 animate-pulse'
                  : apptDetails.triage_priority === 'Urgent'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200/50'
              }`}>
                {apptDetails.triage_priority}
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-neutral-800 leading-relaxed bg-neutral-50 border border-neutral-200/60 p-3 rounded-xl italic">
            "{apptDetails.chief_complaint}"
          </p>
        </div>
      )}

      {/* Vitals screening Dashboard (All 8 Vitals & dynamic BMI) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 animate-fade-in">
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <Activity size={14} className="text-success stroke-[2.25]" />
            <span>Physiological Screening Vitals</span>
          </h3>
          <button onClick={() => setIsVitalsModalOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-600 transition-colors bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full">
            <Plus size={14} className="stroke-[3]" />
            Update
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">BP</span>
            <span className="text-base font-black text-neutral-900 tracking-tight">{getObservation(['BP', '85354-9']).value} <span className="text-[9px] font-bold text-neutral-400">mmHg</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Pulse</span>
            <span className="text-base font-black text-neutral-900 tracking-tight">{getObservation(['HR', '8867-4']).value} <span className="text-[9px] font-bold text-neutral-400">bpm</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Temperature</span>
            <span className="text-base font-black text-neutral-900 tracking-tight">{getObservation(['TEMP', '8310-5']).value} <span className="text-[9px] font-bold text-neutral-400">°F</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Oxygen Sat</span>
            <span className="text-base font-black text-neutral-900 tracking-tight">{getObservation(['SPO2', '59408-5']).value} <span className="text-[9px] font-bold text-neutral-400">%</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Blood Sugar</span>
            <span className="text-base font-black text-neutral-900 tracking-tight">{getObservation(['15074-8']).value.split(' ')[0]} <span className="text-[9px] font-bold text-neutral-400">mg/dL</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Hemoglobin</span>
            <span className="text-base font-black text-neutral-900 tracking-tight">{getObservation(['718-7']).value} <span className="text-[9px] font-bold text-neutral-400">g/dL</span></span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Physical</span>
            <span className="text-xs font-black text-neutral-800 tracking-tight block mt-1">Height: {getObservation(['8302-2']).value} cm</span>
            <span className="text-xs font-black text-neutral-800 tracking-tight block">Weight: {getObservation(['29463-7']).value} kg</span>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 col-span-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Calculated BMI</span>
              <span className="text-base font-black text-neutral-900 tracking-tight">{getObservation(['39156-5']).value} <span className="text-[9px] font-bold text-neutral-400">kg/m2</span></span>
            </div>
            {getObservation(['39156-5']).value !== '--' && (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-black uppercase">Active Classification</span>
            )}
          </div>
        </div>
      </div>

      {/* Medical History Section (Conditions & Allergies) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 animate-fade-in">
        <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest border-b pb-2 mb-3 flex items-center gap-1">
          <ShieldAlert size={14} className="text-amber-600 stroke-[2.25]" />
          <span>Patient Medical History</span>
        </h3>
        
        <div className="space-y-3">
          {/* Active conditions */}
          <div>
            <h4 className="text-[10px] text-neutral-400 font-black tracking-wider uppercase mb-1.5">Registered Conditions / Diagnoses</h4>
            {conditions.length === 0 ? (
              <p className="text-xs text-neutral-400 font-medium italic pl-1">No prior diagnosed medical conditions reported.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {conditions.map(cond => (
                  <span key={cond.id} className="inline-flex items-center gap-1 text-[11px] font-bold bg-neutral-100 border border-neutral-200 text-neutral-700 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{cond.disease_name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Active Allergies */}
          <div className="pt-2 border-t border-neutral-100">
            <h4 className="text-[10px] text-neutral-400 font-black tracking-wider uppercase mb-1.5">Severe Allergy Alerts</h4>
            {allergies.length === 0 ? (
              <p className="text-xs text-neutral-400 font-medium italic pl-1">No drug or food allergies reported.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allergies.map(all => (
                  <span key={all.id} className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-danger/5 border border-danger/10 text-danger px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                    <span>{all.substance} ({all.criticality})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex-1 flex flex-col">
        <div className="flex flex-col gap-3 mb-4">
          <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <FileText size={14} className="text-primary stroke-[2.25]" />
            <span>ASHA/Patient Uploaded Reports</span>
          </h3>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition-all disabled:opacity-50"
            >
              {isUploading ? <Activity className="animate-spin" size={16} /> : <Upload size={16} />}
              Upload
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*,.pdf" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[180px]">
          {documents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-xl border border-neutral-100 border-dashed">
              <FileText className="text-neutral-300 mb-2" size={32} />
              <p className="text-sm font-semibold text-neutral-600">{t('clinical.no_documents', 'No previous documents found')}</p>
              <p className="text-xs text-neutral-400 mt-1">{t('clinical.documents_desc', 'Lab reports and past prescriptions will appear here.')}</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center p-6 text-neutral-400 text-sm">No matches found for "{searchQuery}"</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-800 truncate">{doc.file_name}</p>
                    <p className="text-xs text-neutral-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <a 
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/clinical/documents/${doc.id}/download`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Download size={16} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Vitals Modal */}
      {isVitalsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="font-bold text-neutral-900">Update Vitals</h3>
              <button onClick={() => setIsVitalsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleVitalsSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1.5">Temperature (°F)</label>
                <input type="number" step="0.1" value={vitalsData.temp} onChange={e => setVitalsData({...vitalsData, temp: e.target.value})} placeholder="e.g. 98.6" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none text-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1.5">Pulse (BPM)</label>
                <input id="heartRate" type="number" value={vitalsData.pulse} onChange={e => setVitalsData({...vitalsData, pulse: e.target.value})} placeholder="e.g. 72" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none text-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1.5">Blood Pressure (mmHg)</label>
                <input id="bloodPressure" type="text" value={vitalsData.bp} onChange={e => setVitalsData({...vitalsData, bp: e.target.value})} placeholder="e.g. 120/80" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none text-sm transition-all" />
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setIsVitalsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">Cancel</button>
                <button type="submit" disabled={!vitalsData.temp && !vitalsData.pulse && !vitalsData.bp} className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save & Share</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecordsPanel;
