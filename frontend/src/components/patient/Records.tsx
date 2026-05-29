import React, { useState, useEffect } from 'react';
import { FileText, Search, PlusCircle, X, Check, Calendar, Activity, Clipboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { encounterService, authService } from '../../api/services';

interface HealthRecord {
  id: string;
  title: string;
  date: string;
  type: 'lab' | 'prescription' | 'other';
  facility?: string;
}

const Records: React.FC = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'lab' | 'prescription' | 'other' | 'history'>('all');
  
  // State for Add Record modal/form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'lab' | 'prescription' | 'other'>('lab');
  const [newFacility, setNewFacility] = useState('');

  const [encounters, setEncounters] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        let patientId = localStorage.getItem('active_patient_id');
        if (!patientId || patientId === 'undefined' || patientId === 'null') {
          const userData = await authService.getMe();
          patientId = userData?.patient_id || null;
        }
        if (patientId) {
          const data = await encounterService.getEncounters(patientId);
          const completedEncounters = (data || []).filter((e: any) => e.status === 'completed');
          setEncounters(completedEncounters);
        }
      } catch (err) {
        console.error("Failed to fetch encounters history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  // Initial load
  useEffect(() => {
    const defaultRecords: HealthRecord[] = [
      { id: '1', title: 'Lab Report - Blood Test', date: '2026-10-12', type: 'lab', facility: 'Primary Health Centre' },
      { id: '2', title: 'Prescription - Dr. Sharma', date: '2026-10-05', type: 'prescription', facility: 'Rampur Tele-Clinic' },
    ];
    const cached = localStorage.getItem('patient_records');
    if (!cached) {
      setRecords(defaultRecords);
      localStorage.setItem('patient_records', JSON.stringify(defaultRecords));
      return;
    }
    try {
      const parsed = JSON.parse(cached) as HealthRecord[];
      setRecords(Array.isArray(parsed) ? parsed : defaultRecords);
    } catch {
      setRecords(defaultRecords);
      localStorage.setItem('patient_records', JSON.stringify(defaultRecords));
    }
  }, []);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const record: HealthRecord = {
      id: `rec-${Date.now()}`,
      title: newTitle,
      date: new Date().toISOString().split('T')[0],
      type: newType,
      facility: newFacility || 'Self Uploaded',
    };

    const updated = [record, ...records];
    setRecords(updated);
    localStorage.setItem('patient_records', JSON.stringify(updated));

    // Reset Form
    setNewTitle('');
    setNewType('lab');
    setNewFacility('');
    setIsModalOpen(false);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('patient_records', JSON.stringify(updated));
  };

  // Filter & Search Logic
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (record.facility && record.facility.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === 'all' || (activeFilter !== 'history' && record.type === activeFilter);
    return matchesSearch && matchesFilter;
  });

  const filteredEncounters = encounters.filter(enc => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (enc.practitioner_name && enc.practitioner_name.toLowerCase().includes(query)) ||
      (enc.practitioner_role && enc.practitioner_role.toLowerCase().includes(query)) ||
      (enc.clinical_summary && enc.clinical_summary.toLowerCase().includes(query)) ||
      (enc.outcome && enc.outcome.toLowerCase().includes(query));
    return matchesSearch;
  });

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('clinical.care_records')}</h1>
          <p className="text-neutral-500 text-sm mt-1">{t('clinical.records_browse_desc')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle size={15} />
          <span>{t('clinical.upload_record')}</span>
        </button>
      </header>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder={t('clinical.search_records_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-600/5 transition-all shadow-sm"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'lab', 'prescription', 'other', 'history'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {filter === 'all' 
                ? t('nav.all_records') 
                : filter === 'lab' 
                  ? t('nav.lab_reports') 
                  : filter === 'prescription' 
                    ? t('nav.prescriptions') 
                    : filter === 'history'
                      ? t('nav.history', 'Consultation History')
                      : t('nav.others')}
            </button>
          ))}
        </div>
      </div>

      {/* Records List */}
      {activeFilter === 'history' ? (
        loadingHistory ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredEncounters.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {filteredEncounters.map((enc) => {
              const formattedDate = new Date(enc.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
              
              const outcomeBadgeClass = enc.outcome === 'completed'
                ? 'bg-success/15 border border-success/30 text-success'
                : enc.outcome === 'follow_up'
                  ? 'bg-warning/15 border border-warning/30 text-warning'
                  : enc.outcome === 'referred'
                    ? 'bg-primary/15 border border-primary/30 text-primary'
                    : 'bg-neutral-100 border border-neutral-200 text-neutral-600';

              const outcomeText = enc.outcome === 'completed'
                ? 'Cured & Discharged'
                : enc.outcome === 'follow_up'
                  ? 'Follow-up Scheduled'
                  : enc.outcome === 'referred'
                    ? 'Referred'
                    : 'Consultation Completed';

              return (
                <li 
                  key={enc.id} 
                  className="bg-white rounded-3xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] border border-neutral-200/60 flex flex-col gap-4.5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Activity size={20} className="stroke-[2.25]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                          Consultation with {enc.practitioner_name || 'Practitioner'}
                        </h3>
                        <p className="text-xs text-neutral-500 font-semibold mt-1 flex items-center gap-1.5">
                          <span>{enc.practitioner_role || 'Healthcare Provider'}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                          <span>{formattedDate}</span>
                        </p>
                      </div>
                    </div>
                    
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shrink-0 ${outcomeBadgeClass}`}>
                      {outcomeText}
                    </span>
                  </div>

                  <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100/80 text-xs">
                    <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest mb-1.5">Doctor's Clinical Notes</p>
                    <p className="text-neutral-700 font-medium italic leading-relaxed">
                      "{enc.clinical_summary || 'No clinical summary recorded.'}"
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="bg-white border border-neutral-200/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
              <Clipboard size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">No Consultation History</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                No past video consultations were found for your account.
              </p>
            </div>
          </div>
        )
      ) : filteredRecords.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filteredRecords.map((record) => (
            <li 
              key={record.id} 
              className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] border border-neutral-200/60 flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  record.type === 'lab' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                    : record.type === 'prescription'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-purple-50 text-purple-600 border border-purple-100'
                }`}>
                  <FileText size={20} className="stroke-[2.25]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 leading-tight">{record.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{record.date}</span>
                    </span>
                    {record.facility && (
                      <span className="list-item list-inside leading-none marker:text-neutral-400">
                        {record.facility}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteRecord(record.id)}
                aria-label="Delete record"
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-danger-50 hover:text-danger flex items-center justify-center transition-colors text-neutral-400 focus:outline-none"
                title="Delete record"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-white border border-neutral-200/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">{t('clinical.no_medical_records')}</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              {searchQuery ? t('clinical.adjust_search') : t('clinical.upload_clinical_desc')}
            </p>
          </div>
        </div>
      )}

      {/* Upload Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-neutral-900">{t('clinical.upload_health_record')}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                aria-label="Close upload dialog"
                className="w-8 h-8 rounded-full hover:bg-neutral-100 text-neutral-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">{t('clinical.record_name_label')}</label>
                <input 
                  type="text" 
                  required
                  placeholder={t('clinical.record_name_placeholder')}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">{t('clinical.record_type')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['lab', 'prescription', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewType(type)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        newType === type
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {type === 'lab' ? t('clinical.lab_report') : type === 'prescription' ? t('clinical.prescription') : t('nav.others')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">{t('clinical.clinical_facility')}</label>
                <input 
                  type="text" 
                  placeholder={t('clinical.facility_placeholder')}
                  value={newFacility}
                  onChange={(e) => setNewFacility(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-sm transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                >
                  <Check size={16} />
                  <span>{t('clinical.save_record')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Records;
