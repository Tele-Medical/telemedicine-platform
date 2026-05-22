import React, { useState, useEffect } from 'react';
import { FileText, Search, PlusCircle, X, Check, Calendar } from 'lucide-react';

interface HealthRecord {
  id: string;
  title: string;
  date: string;
  type: 'lab' | 'prescription' | 'other';
  facility?: string;
}

const Records: React.FC = () => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'lab' | 'prescription' | 'other'>('all');
  
  // State for Add Record modal/form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'lab' | 'prescription' | 'other'>('lab');
  const [newFacility, setNewFacility] = useState('');

  // Initial load
  useEffect(() => {
    const cached = localStorage.getItem('patient_records');
    if (cached) {
      setRecords(JSON.parse(cached));
    } else {
      const defaultRecords: HealthRecord[] = [
        { id: '1', title: 'Lab Report - Blood Test', date: '2026-10-12', type: 'lab', facility: 'Primary Health Centre' },
        { id: '2', title: 'Prescription - Dr. Sharma', date: '2026-10-05', type: 'prescription', facility: 'Rampur Tele-Clinic' },
      ];
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
    const matchesFilter = activeFilter === 'all' || record.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Care Records</h1>
          <p className="text-neutral-500 text-sm mt-1">Browse, search, and upload clinical test results or prescriptions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle size={15} />
          <span>Upload Record</span>
        </button>
      </header>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search records by name or facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-600/5 transition-all shadow-sm"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'lab', 'prescription', 'other'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {filter === 'all' ? 'All Records' : filter === 'lab' ? 'Lab Reports' : filter === 'prescription' ? 'Prescriptions' : 'Others'}
            </button>
          ))}
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length > 0 ? (
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
            <h3 className="text-sm font-bold text-neutral-900">No medical records found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              {searchQuery ? 'Try adjusting your search query or filters.' : 'Upload clinical records to keep your doctor informed during consultations.'}
            </p>
          </div>
        </div>
      )}

      {/* Upload Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-neutral-900">Upload Health Record</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 text-neutral-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Record Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Lab Report - Blood Glucose"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Record Type</label>
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
                      {type === 'lab' ? 'Lab Report' : type === 'prescription' ? 'Prescription' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Clinical Facility</label>
                <input 
                  type="text" 
                  placeholder="e.g. Primary Health Centre"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                >
                  <Check size={16} />
                  <span>Save Record</span>
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
