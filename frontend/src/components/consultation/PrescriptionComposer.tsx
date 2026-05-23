import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Medicine {
  name: string;
  dosage: string;
  duration: string;
}

interface PrescriptionComposerProps {
  appointmentId?: string;
}

const PrescriptionComposer: React.FC<PrescriptionComposerProps> = ({ appointmentId }) => {
  const { t } = useTranslation();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [currentDosage, setCurrentDosage] = useState('1-0-1 (Morning & Night)');
  const [currentDuration, setCurrentDuration] = useState('5');
  const [notes, setNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const draftKey = appointmentId ? `prescription_draft_${appointmentId}` : 'prescription_draft';

  // Load existing draft from localStorage on mount or key change
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.medicines) setMedicines(parsed.medicines);
        if (parsed.notes) setNotes(parsed.notes);
      } else {
        setMedicines([]);
        setNotes('');
      }
    } catch (e) {
      console.error('Failed to load prescription draft:', e);
    }
  }, [draftKey]);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName.trim()) {
      setErrorMsg('Please specify a medicine name before adding.');
      return;
    }

    const newMed: Medicine = {
      name: currentName.trim(),
      dosage: currentDosage,
      duration: currentDuration || '1'
    };

    setMedicines([...medicines, newMed]);
    setCurrentName('');
    setCurrentDuration('5');
    setErrorMsg('');
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Compile final list including any ongoing input if filled
    const finalMedicines = [...medicines];
    if (currentName.trim()) {
      finalMedicines.push({
        name: currentName.trim(),
        dosage: currentDosage,
        duration: currentDuration || '1'
      });
      // Clear inputs since it is added
      setCurrentName('');
    }

    const draft = {
      medicines: finalMedicines,
      notes,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setMedicines(finalMedicines);
      setSaveSuccess(true);
    } catch (e) {
      console.error('Failed to save prescription draft:', e);
      setErrorMsg('Failed to save draft local storage.');
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-8 text-neutral-900 font-sans">
      
      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 bg-success/10 border border-success/20 text-success rounded-2xl flex items-center gap-2.5 animate-scale-in">
          <CheckCircle size={18} className="shrink-0" />
          <span className="text-sm font-bold">{t('pharmacy.draft_saved')}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold animate-shake">
          {errorMsg}
        </div>
      )}

      {/* Added Medicines List */}
      {medicines.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">{t('pharmacy.prescription_items')} ({medicines.length})</h3>
          <div className="divide-y divide-neutral-100">
            {medicines.map((med, idx) => (
              <div key={idx} className="py-2.5 flex justify-between items-center gap-3">
                <div className="space-y-0.5">
                  <h4 className="font-semibold text-neutral-800 text-sm">{med.name}</h4>
                  <p className="text-xs text-neutral-500 font-medium">
                    {med.dosage} • {med.duration} {t('pharmacy.days_left').split(' ')[1]}
                  </p>
                </div>
                <button 
                  onClick={() => handleRemoveMedicine(idx)}
                  aria-label={`Remove ${med.name}`}
                  className="p-2 text-neutral-400 hover:text-danger rounded-xl hover:bg-neutral-50 active:scale-95 transition-all outline-none"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form to compose medicine */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">{t('pharmacy.add_medicine')}</h3>
        
        <div className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="medicine-name" className="block text-xs font-bold text-neutral-500 mb-1">{t('pharmacy.medicine_name')}</label>
            <input 
              id="medicine-name"
              type="text" 
              value={currentName}
              onChange={(e) => {
                setCurrentName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. Paracetamol 500mg" 
              className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary rounded-xl px-4 py-3 text-neutral-800 placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="dosage" className="block text-xs font-bold text-neutral-500 mb-1">{t('pharmacy.dosage_schedule')}</label>
              <select 
                id="dosage" 
                value={currentDosage}
                onChange={(e) => setCurrentDosage(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary rounded-xl px-4 py-3 text-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              >
                <option value="1-0-1 (Morning & Night)">1-0-1 (Morning & Night)</option>
                <option value="1-1-1 (Three times)">1-1-1 (Three times)</option>
                <option value="1-0-0 (Morning only)">1-0-0 (Morning only)</option>
                <option value="0-0-1 (Night only)">0-0-1 (Night only)</option>
                <option value="SOS (As needed)">SOS (As needed)</option>
              </select>
            </div>
            <div>
              <label htmlFor="duration" className="block text-xs font-bold text-neutral-500 mb-1">{t('pharmacy.duration_days')}</label>
              <div className="flex bg-neutral-50 border border-neutral-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-xl items-center pr-4 transition-all">
                <input 
                  id="duration"
                  type="number" 
                  min="1"
                  max="180"
                  value={currentDuration}
                  onChange={(e) => setCurrentDuration(e.target.value)}
                  placeholder="5" 
                  className="w-full bg-transparent border-none px-4 py-3 text-neutral-800 text-sm focus:outline-none font-medium"
                />
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">{t('pharmacy.days_left').split(' ')[1]}</span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleAddMedicine}
            className="mt-1 w-full py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 hover:border-primary/50 transition-all active:scale-[0.99] flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <Plus size={16} />
            <span>{t('pharmacy.add_medicine')}</span>
          </button>
        </div>
      </div>

      {/* Doctor Notes */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,.08)] border border-neutral-200/60">
        <label htmlFor="doctor-notes" className="block text-xs font-bold text-neutral-500 mb-2">{t('clinical.summary')}</label>
        <textarea 
          id="doctor-notes"
          rows={3} 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rest, drink plenty of fluids..." 
          className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary rounded-xl px-4 py-3 text-neutral-800 placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all font-medium"
        ></textarea>
      </div>

      {/* Save Button */}
      <button 
        onClick={handleSave}
        className="w-full bg-primary hover:bg-primary/95 text-white py-4 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/30 flex justify-center items-center gap-2"
      >
        <span>{t('pharmacy.save_prescription')}</span>
      </button>

    </div>
  );
};

export default PrescriptionComposer;
