import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Activity, 
  FileText, 
  Calendar, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  TrendingUp,
  FileCheck,
  Loader2
} from 'lucide-react';
import { db } from '../../db/db';
import { apiClient } from '../../api/client';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
}

interface Practitioner {
  id: string;
  full_name?: string;
  name?: string;
  specialty?: string;
  specialization?: string;
}

const ASHAClinicalConsultation: React.FC = () => {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const { isOnline } = useNetworkStatus();

  // Active Tab: 'symptoms' | 'vitals' | 'reports' | 'booking'
  const [activeTab, setActiveTab] = useState<'symptoms' | 'vitals' | 'reports' | 'booking'>('symptoms');
  
  // Patient details state
  const [patient, setPatient] = useState<Patient | null>(null);

  // Form states - Symptoms
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [workerNotes, setWorkerNotes] = useState('');

  // Form states - Vitals
  const [vitals, setVitals] = useState({
    temp: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    spo2: '',
    glucose: '',
    glucoseType: 'random', // 'fasting' | 'random'
    hemoglobin: '',
    height: '',
    weight: '',
  });

  // Calculated BMI State
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiClass, setBmiClass] = useState<'Underweight' | 'Normal' | 'Overweight' | 'Obese' | null>(null);

  // Form states - Reports
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; offline?: boolean }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states - Booking
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [mlRecommendation, setMlRecommendation] = useState<{ specialty: string; priority: string; docId?: string } | null>(null);
  const [isMlLoading, setIsMlLoading] = useState(false);

  // Global Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch Patient & Doctor data
  useEffect(() => {
    const loadData = async () => {
      if (!patientId) return;
      try {
        // Fetch patient details locally from Dexie
        const localPatient = await db.patients.get(patientId);
        if (localPatient) {
          setPatient({
            id: String(localPatient.id),
            full_name: String(localPatient.full_name),
            phone: localPatient.phone ? String(localPatient.phone) : undefined,
            gender: localPatient.gender ? String(localPatient.gender) : 'unknown',
            date_of_birth: localPatient.date_of_birth ? String(localPatient.date_of_birth) : undefined
          });
        }

        // Fetch doctors/practitioners list
        const docs = await apiClient('/practitioners/');
        setPractitioners(docs || []);
      } catch (err) {
        console.error('Failed to load consultation contexts', err);
      }
    };
    loadData();
  }, [patientId]);

  // Recalculate BMI dynamically when height or weight changes
  useEffect(() => {
    const h = parseFloat(vitals.height);
    const w = parseFloat(vitals.weight);

    if (h > 0 && w > 0) {
      const hMeters = h / 100;
      const calculatedBmi = w / (hMeters * hMeters);
      const roundedBmi = parseFloat(calculatedBmi.toFixed(2));
      setBmi(roundedBmi);

      // Classify BMI
      if (roundedBmi < 18.5) setBmiClass('Underweight');
      else if (roundedBmi >= 18.5 && roundedBmi < 25) setBmiClass('Normal');
      else if (roundedBmi >= 25 && roundedBmi < 30) setBmiClass('Overweight');
      else setBmiClass('Obese');
    } else {
      setBmi(null);
      setBmiClass(null);
    }
  }, [vitals.height, vitals.weight]);

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    setIsUploading(true);

    if (isOnline) {
      // 1. Online: Direct multipart POST upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', patientId);
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
          setUploadedFiles(prev => [...prev, { name: file.name, type: file.type }]);
        }
      } catch (err) {
        console.error('Online file upload failed', err);
      } finally {
        setIsUploading(false);
      }
    } else {
      // 2. Offline: Base64 Serialization into Dexie Version 3 documents table
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const docId = crypto.randomUUID();

        try {
          await db.documents.put({
            id: docId,
            patient_id: patientId,
            file_name: file.name,
            content_type: file.type,
            base64_data: base64Data,
            document_type: 'report',
            created_at: new Date().toISOString()
          });

          // Queue creation in outbox
          await db.outbox.add({
            operation_id: crypto.randomUUID(),
            entity_type: 'document_reference',
            entity_id: docId,
            action: 'CREATE',
            payload: {
              id: docId,
              patient_id: patientId,
              file_name: file.name,
              content_type: file.type,
              document_type: 'report',
              created_at: new Date().toISOString()
            },
            created_at: new Date().toISOString()
          });

          setUploadedFiles(prev => [...prev, { name: file.name, type: file.type, offline: true }]);
        } catch (dbErr) {
          console.error('Failed to write local document buffer', dbErr);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerMlTriage = async () => {
    setIsMlLoading(true);
    try {
      // Simulated or backend-fetched ML classification
      const symptomsPayload = {
        symptoms: selectedSymptoms,
        raw_text: workerNotes,
        severity: parseFloat(vitals.spo2) < 94 || selectedSymptoms.includes('Shortness of breath') ? 'Severe' : 'Standard'
      };

      if (isOnline) {
        // Request evaluate_symptoms_and_route centrally
        const res = await apiClient('/appointments/', {
          method: 'POST',
          body: JSON.stringify({
            patient_id: patientId,
            channel: 'assisted',
            chief_complaint: workerNotes || selectedSymptoms.join(', '),
            triage_priority: symptomsPayload.severity === 'Severe' ? 'Critical' : 'Standard',
            symptom_intake: symptomsPayload,
            scheduled_for: new Date(Date.now() + 3600000).toISOString() // default 1 hour from now
          })
        });

        if (res) {
          const matchedDoc = practitioners.find(d => d.id === res.practitioner_id);
          setMlRecommendation({
            specialty: matchedDoc?.specialty || matchedDoc?.specialization || 'Generalist',
            priority: res.triage_priority,
            docId: res.practitioner_id
          });
          setSelectedDoctor(res.practitioner_id || '');
        }
      } else {
        // Local keyword match rules fallback (simulating model output)
        let recommendedSpecialty = 'General Medicine';
        let priority = 'Standard';

        const rawTextLower = workerNotes.toLowerCase();
        const symptomsLower = selectedSymptoms.map(s => s.toLowerCase());

        const matchedInAny = (keywords: string[]) => {
          return keywords.some(k => rawTextLower.includes(k) || symptomsLower.includes(k));
        };

        if (matchedInAny(['chest pain', 'palpitations', 'heart', 'cardiac'])) {
          recommendedSpecialty = 'Cardiology';
          priority = symptomsPayload.severity === 'Severe' ? 'Critical' : 'Urgent';
        } else if (matchedInAny(['headache', 'dizzy', 'numbness', 'seizure', 'fainting'])) {
          recommendedSpecialty = 'Neurology';
          priority = 'Urgent';
        } else if (matchedInAny(['child', 'baby', 'pediatric', 'infant', 'toddler'])) {
          recommendedSpecialty = 'Pediatrics';
        } else if (matchedInAny(['rash', 'skin', 'itch', 'pimple', 'redness'])) {
          recommendedSpecialty = 'Dermatology';
        } else if (matchedInAny(['joint', 'bone', 'fracture', 'knee', 'back pain'])) {
          recommendedSpecialty = 'Orthopedics';
        }

        const matches = practitioners.filter(p => (p.specialty || p.specialization) === recommendedSpecialty);
        const assignedDocId = matches[0]?.id || practitioners[0]?.id || '';

        setMlRecommendation({
          specialty: recommendedSpecialty,
          priority: priority,
          docId: assignedDocId
        });
        setSelectedDoctor(assignedDocId);
      }
    } catch (err) {
      console.error('ML Routing failed', err);
    } finally {
      setIsMlLoading(false);
    }
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    setIsSubmitting(true);
    try {
      const recordsToSave = [];

      // Helper to compile vital observations
      const appendObservation = (code: string, value: string, unit: string) => {
        if (value.trim()) {
          recordsToSave.push({
            id: crypto.randomUUID(),
            patient_id: patientId,
            encounter_id: null,
            code,
            value_string: value,
            unit,
            created_at: new Date().toISOString()
          });
        }
      };

      appendObservation('8310-5', vitals.temp, 'F'); // Temp
      appendObservation('8867-4', vitals.heartRate, 'bpm'); // Pulse
      appendObservation('85354-9', vitals.systolic && vitals.diastolic ? `${vitals.systolic}/${vitals.diastolic}` : '', 'mmHg'); // BP
      appendObservation('59408-5', vitals.spo2, '%'); // SpO2
      appendObservation('15074-8', vitals.glucose, vitals.glucoseType === 'fasting' ? 'mg/dL (Fasting)' : 'mg/dL (Random)'); // Sugar
      appendObservation('718-7', vitals.hemoglobin, 'g/dL'); // Hemoglobin
      appendObservation('8302-2', vitals.height, 'cm'); // Height
      appendObservation('29463-7', vitals.weight, 'kg'); // Weight
      if (bmi) appendObservation('39156-5', String(bmi), 'kg/m2'); // BMI

      // 1. Write Observations to Dexie Local DB immediately
      for (const obs of recordsToSave) {
        await db.observations.put(obs);

        // Queue in Outbox
        await db.outbox.add({
          operation_id: crypto.randomUUID(),
          entity_type: 'observation',
          entity_id: obs.id,
          action: 'CREATE',
          payload: obs,
          created_at: new Date().toISOString()
        });

        // Online sync post
        if (isOnline) {
          try {
            await apiClient('/clinical/observations', {
              method: 'POST',
              body: JSON.stringify({
                patient_id: obs.patient_id,
                encounter_id: obs.encounter_id,
                code: obs.code,
                value_string: obs.value_string,
                unit: obs.unit
              })
            });
          } catch (apiErr) {
            console.warn('Observations REST post deferred to background outbox sync', apiErr);
          }
        }
      }

      // 2. Write Symptoms to Dexie Local DB Version 3 table
      const symptomIntakeId = crypto.randomUUID();
      const localIntake = {
        id: symptomIntakeId,
        patient_id: patientId,
        appointment_id: '',
        symptoms: selectedSymptoms,
        raw_text: workerNotes,
        duration: '1-3 days',
        severity: parseFloat(vitals.spo2) < 94 || selectedSymptoms.includes('Shortness of breath') ? 'Severe' : 'Standard',
        created_at: new Date().toISOString()
      };

      await db.symptoms.put(localIntake);

      await db.outbox.add({
        operation_id: crypto.randomUUID(),
        entity_type: 'symptom_intake',
        entity_id: symptomIntakeId,
        action: 'CREATE',
        payload: localIntake,
        created_at: new Date().toISOString()
      });

      // 3. Create Appointment if booked
      if (selectedDoctor && apptDate) {
        const apptId = crypto.randomUUID();
        const localAppt = {
          id: apptId,
          patient_id: patientId,
          practitioner_id: selectedDoctor,
          scheduled_for: apptDate,
          channel: 'assisted',
          chief_complaint: workerNotes || selectedSymptoms.join(', '),
          triage_priority: localIntake.severity === 'Severe' ? 'Critical' : 'Standard',
          status: 'pending',
          created_at: new Date().toISOString()
        };

        await db.appointments.put(localAppt);

        await db.outbox.add({
          operation_id: crypto.randomUUID(),
          entity_type: 'appointment',
          entity_id: apptId,
          action: 'CREATE',
          payload: localAppt,
          created_at: new Date().toISOString()
        });

        if (isOnline) {
          try {
            await apiClient('/appointments/', {
              method: 'POST',
              body: JSON.stringify({
                patient_id: localAppt.patient_id,
                practitioner_id: localAppt.practitioner_id,
                scheduled_for: localAppt.scheduled_for,
                channel: localAppt.channel,
                chief_complaint: localAppt.chief_complaint,
                triage_priority: localAppt.triage_priority,
                symptom_intake: {
                  raw_text: workerNotes,
                  symptoms: selectedSymptoms,
                  severity: localIntake.severity,
                  duration: '1-3 days'
                }
              })
            });
          } catch (apptErr) {
            console.warn('Appointment scheduling deferred to background outbox sync', apptErr);
          }
        }
      }

      setSubmitSuccess(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      console.error('Failed to submit ASHA consult', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Avatar initial helpers
  const getInitials = (name: string) => {
    if (!name) return 'PT';
    return name.trim().split(' ').slice(0, 2).map(n => n[0].toUpperCase()).join('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-neutral-900 font-sans animate-fade-in pb-16">
      
      {/* 1. Header context */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs shrink-0 shadow-inner">
            {patient ? getInitials(patient.full_name) : 'PT'}
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-neutral-950">{patient ? patient.full_name : 'Loading Profile...'}</h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
              Phone: {patient?.phone || 'No direct phone'} • Gender: {patient?.gender || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          {isOnline ? (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Online Console</span>
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Offline Cache</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Success Banner */}
      {submitSuccess && (
        <div className="mb-6 bg-emerald-500 border border-emerald-600/30 p-5 rounded-3xl text-white shadow-lg animate-fade-in flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-wide">Consultation Saved successfully!</h3>
            <p className="text-xs text-teal-50 font-medium mt-0.5">
              IndexedDB cache synced. Redirecting you back to operational dashboard...
            </p>
          </div>
        </div>
      )}

      {/* 3. Wizard Tab Controllers */}
      <div className="flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200/50 mb-6 gap-1 shadow-inner">
        {([
          { id: 'symptoms', label: 'Symptoms', icon: Activity },
          { id: 'vitals', label: 'Vitals', icon: TrendingUp },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'booking', label: 'Booking', icon: Calendar }
        ] as const).map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                isSelected 
                  ? 'bg-white text-primary shadow-md border-0' 
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/50 border-0'
              }`}
            >
              <Icon size={14} className={isSelected ? 'text-primary stroke-[2.25]' : 'text-neutral-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents Form */}
      <form onSubmit={handleSaveConsultation} className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-soft">
        
        {/* Tab 1: Symptoms Checklist */}
        {activeTab === 'symptoms' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest border-b pb-2 mb-4">Symptom Checklist</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  'Fever / Chills',
                  'Cough / Cold',
                  'Sore Throat',
                  'Shortness of breath',
                  'Muscle / Body Aches',
                  'Severe Headache',
                  'Diarrhea / Vomiting',
                  'Weakness / Dizziness'
                ].map(symptom => {
                  const isChecked = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => handleSymptomToggle(symptom)}
                      className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between group active:scale-[0.98] ${
                        isChecked 
                          ? 'bg-primary/5 text-primary border-primary/30 shadow-inner' 
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200/60 hover:bg-neutral-100/50'
                      }`}
                    >
                      <span>{symptom}</span>
                      <Heart 
                        size={12} 
                        className={`transition-colors shrink-0 ${
                          isChecked ? 'fill-primary text-primary stroke-[2.25]' : 'text-neutral-300 group-hover:text-neutral-400'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="workerNotes" className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
                Assessment / ASHA Worker Remarks
              </label>
              <textarea
                id="workerNotes"
                rows={4}
                value={workerNotes}
                onChange={e => setWorkerNotes(e.target.value)}
                placeholder="Describe patient symptoms, duration, pain scale, or notes..."
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-neutral-400"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Vitals Form */}
        {activeTab === 'vitals' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest border-b pb-2 mb-4">Physiological Vitals Input</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Temperature */}
              <div>
                <label htmlFor="temp" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Temperature (°F)</label>
                <input 
                  id="temp" 
                  type="number" 
                  step="0.1" 
                  value={vitals.temp} 
                  onChange={e => setVitals({...vitals, temp: e.target.value})} 
                  placeholder="e.g. 98.6" 
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                />
                {parseFloat(vitals.temp) > 99.5 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/50 mt-1.5">
                    <AlertTriangle size={10} className="stroke-[2.5]" />
                    <span>Fever warning</span>
                  </span>
                )}
              </div>

              {/* Blood Pressure (Double inputs) */}
              <div>
                <label className="block text-xs font-extrabold text-neutral-700 mb-1.5">Blood Pressure (mmHg)</label>
                <div className="flex items-center gap-2">
                  <input 
                    id="systolic"
                    aria-label="Systolic BP" 
                    type="number" 
                    value={vitals.systolic} 
                    onChange={e => setVitals({...vitals, systolic: e.target.value})} 
                    placeholder="Sys (120)" 
                    className="w-1/2 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                  />
                  <span className="text-neutral-400 font-bold">/</span>
                  <input 
                    id="diastolic"
                    aria-label="Diastolic BP" 
                    type="number" 
                    value={vitals.diastolic} 
                    onChange={e => setVitals({...vitals, diastolic: e.target.value})} 
                    placeholder="Dia (80)" 
                    className="w-1/2 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                  />
                </div>
                {(parseFloat(vitals.systolic) > 140 || parseFloat(vitals.diastolic) > 90) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-danger bg-danger/5 px-2 py-0.5 rounded-lg border border-danger/10 mt-1.5">
                    <AlertTriangle size={10} className="stroke-[2.5]" />
                    <span>Hypertension alert</span>
                  </span>
                )}
              </div>

              {/* Heart / Pulse Rate */}
              <div>
                <label htmlFor="heartRate" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Pulse Rate (bpm)</label>
                <input 
                  id="heartRate" 
                  type="number" 
                  value={vitals.heartRate} 
                  onChange={e => setVitals({...vitals, heartRate: e.target.value})} 
                  placeholder="e.g. 72" 
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                />
              </div>

              {/* Oxygen Saturation SpO2 */}
              <div>
                <label htmlFor="spo2" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Oxygen Saturation ($SpO_2$ %)</label>
                <input 
                  id="spo2" 
                  type="number" 
                  value={vitals.spo2} 
                  onChange={e => setVitals({...vitals, spo2: e.target.value})} 
                  placeholder="e.g. 98" 
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                />
                {vitals.spo2 && parseFloat(vitals.spo2) < 94 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-danger bg-danger/5 px-2.5 py-1.5 rounded-xl border border-danger/10 mt-2.5 animate-pulse shadow-sm">
                    <AlertTriangle size={11} className="stroke-[3] text-danger" />
                    <span>Hypoxic Alert</span>
                  </span>
                )}
              </div>

              {/* Blood Sugar (Glucose) */}
              <div>
                <label htmlFor="glucose" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Blood Glucose (mg/dL)</label>
                <div className="flex gap-2">
                  <input 
                    id="glucose" 
                    type="number" 
                    value={vitals.glucose} 
                    onChange={e => setVitals({...vitals, glucose: e.target.value})} 
                    placeholder="e.g. 110" 
                    className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                  />
                  <select 
                    aria-label="Glucose test state" 
                    value={vitals.glucoseType} 
                    onChange={e => setVitals({...vitals, glucoseType: e.target.value})} 
                    className="w-28 px-2 py-2.5 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold"
                  >
                    <option value="random">Random</option>
                    <option value="fasting">Fasting</option>
                  </select>
                </div>
                {parseFloat(vitals.glucose) > 200 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-danger bg-danger/5 px-2.5 py-1.5 rounded-xl border border-danger/10 mt-2.5 animate-pulse shadow-sm">
                    <AlertTriangle size={11} className="stroke-[3]" />
                    <span>Hyperglycemia Alert</span>
                  </span>
                )}
              </div>

              {/* Hemoglobin */}
              <div>
                <label htmlFor="hemoglobin" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Hemoglobin (g/dL)</label>
                <input 
                  id="hemoglobin" 
                  type="number" 
                  step="0.1" 
                  value={vitals.hemoglobin} 
                  onChange={e => setVitals({...vitals, hemoglobin: e.target.value})} 
                  placeholder="e.g. 13.5" 
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                />
                {vitals.hemoglobin && parseFloat(vitals.hemoglobin) < 11 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/50 mt-1.5">
                    <AlertTriangle size={10} className="stroke-[2.5]" />
                    <span>Anemia warning</span>
                  </span>
                )}
              </div>

              {/* Physical Parameters - Height / Weight */}
              <div>
                <label htmlFor="height" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Height (cm)</label>
                <input 
                  id="height" 
                  type="number" 
                  value={vitals.height} 
                  onChange={e => setVitals({...vitals, height: e.target.value})} 
                  placeholder="e.g. 175" 
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                />
              </div>

              <div>
                <label htmlFor="weight" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Weight (kg)</label>
                <input 
                  id="weight" 
                  type="number" 
                  value={vitals.weight} 
                  onChange={e => setVitals({...vitals, weight: e.target.value})} 
                  placeholder="e.g. 70" 
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs font-bold" 
                />
              </div>

            </div>

            {/* Dynamic Calculated BMI Panel */}
            {bmi !== null && (
              <div className="bg-neutral-50 rounded-2xl border border-neutral-200/60 p-4 mt-4 flex items-center justify-between animate-fade-in shadow-inner">
                <div>
                  <span className="text-[10px] text-neutral-400 font-black tracking-widest uppercase block">Auto Calculated BMI</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-neutral-900 tracking-tight">{bmi}</span>
                    <span className="text-xs text-neutral-400 font-semibold">$kg/m^2$</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-400 font-black tracking-widest uppercase block text-right">Diagnosis Classification</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mt-1 border shadow-sm ${
                    bmiClass === 'Normal' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : bmiClass === 'Overweight' 
                      ? 'bg-orange-50 text-orange-700 border-orange-200' 
                      : bmiClass === 'Obese'
                      ? 'bg-danger/5 text-danger border-danger/10'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <span>{bmiClass}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Uploader */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest border-b pb-2 mb-4">Patient Medical Reports</h3>
            
            {/* Drag & Drop uploader zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 hover:border-primary/40 bg-neutral-50 hover:bg-neutral-100/50 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative group"
            >
              <div className="w-12 h-12 rounded-full bg-white text-neutral-400 group-hover:text-primary flex items-center justify-center border border-neutral-200 group-hover:border-primary/20 shadow-sm transition-all duration-300">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload size={20} className="stroke-[2.25]" />}
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-700 group-hover:text-primary transition-colors block">
                  Drag and drop lab reports here or browse
                </span>
                <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                  Acceptable formats: PDF, PNG, JPG, JPEG (Max size: 5MB)
                </span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                data-testid="reports-uploader-input" 
                className="hidden" 
                onChange={handleFileUpload} 
                accept="image/*,.pdf" 
              />
            </div>

            {/* List of uploaded documents */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] text-neutral-400 font-black tracking-widest uppercase block">Recently Uploaded Files</h4>
                <div className="flex flex-col gap-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 shadow-sm">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                        <FileCheck size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-800 truncate">{file.name}</p>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">{file.type}</p>
                      </div>
                      {file.offline ? (
                        <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200/40 shrink-0">Offline Buffered</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200/40 shrink-0">Uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Booking Tab */}
        {activeTab === 'booking' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest">Escalate to Doctor Video Queue</h3>
              
              <button 
                type="button"
                onClick={handleTriggerMlTriage}
                disabled={isMlLoading}
                className="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 active:scale-[0.98] transition-all text-primary text-xs font-black px-4.5 py-2 rounded-xl border border-primary/20 shadow-sm outline-none shrink-0"
              >
                {isMlLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Sparkles size={13} className="stroke-[2.25] text-primary" />}
                <span>Smart Triage Auto-Route</span>
              </button>
            </div>

            {/* ML Recommended Banner */}
            {mlRecommendation && (
              <div className="bg-indigo-50/50 border border-indigo-200/50 p-4.5 rounded-2xl animate-fade-in shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200/30 shadow-sm">
                    <Sparkles size={16} className="stroke-[2.25] text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-indigo-900 tracking-wide">Recommended Specialty: {mlRecommendation.specialty}</h4>
                    <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-widest mt-0.5">Priority Level: {mlRecommendation.priority}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Selector Dropdown */}
            <div className="space-y-4">
              <div>
                <label htmlFor="doctor-select" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Select Doctor</label>
                <select
                  id="doctor-select"
                  value={selectedDoctor}
                  onChange={e => setSelectedDoctor(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white text-neutral-800 text-xs font-bold"
                >
                  <option value="">-- Manual Select (or Auto-Routed by ML) --</option>
                  {practitioners.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name || doc.name || 'Unknown Doctor'} - {doc.specialty || doc.specialization || 'Generalist'}
                    </option>
                  ))}
                </select>
              </div>

              {/* DateTime Selection */}
              <div>
                <label htmlFor="appt-date" className="block text-xs font-extrabold text-neutral-700 mb-1.5">Appointment Date & Time</label>
                <input
                  id="appt-date"
                  type="datetime-local"
                  value={apptDate}
                  onChange={e => setApptDate(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-neutral-50 text-neutral-800 text-xs font-bold cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Global form submit actions */}
        <div className="flex justify-end gap-3 pt-5 border-t border-neutral-100 mt-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || selectedSymptoms.length === 0}
            className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary-700 transition-all shadow-md shadow-primary/10 hover:shadow-lg active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Intake...</span>
              </span>
            ) : (
              <span>Save & Submit Consultation</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ASHAClinicalConsultation;
