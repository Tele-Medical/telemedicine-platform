import React, { useState, useEffect } from 'react';
import { Pill, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { pharmacyService, authService } from '../../api/services';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  purpose: string;
  schedule: string;
  timing: string;
  stockLeft: number;
}

const Medicines: React.FC = () => {
  const { t } = useTranslation();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        let patientId = localStorage.getItem('active_patient_id');
        if (!patientId || patientId === 'undefined' || patientId === 'null') {
          const userData = await authService.getMe();
          patientId = userData?.patient_id || null;
        }
        const prescriptions = await pharmacyService.getPrescriptions(patientId || undefined);
        
        const fetchedMedicines: Medicine[] = [];
        prescriptions.forEach((rx: any) => {
          if (rx.status !== 'cancelled' && rx.items) {
            rx.items.forEach((item: any) => {
              fetchedMedicines.push({
                id: item.id,
                name: item.medicine_name || 'Unknown Medicine',
                dosage: item.dosage,
                purpose: rx.notes || t('pharmacy.prescribed_treatment', 'Prescribed Treatment'),
                schedule: 'As directed',
                timing: "Follow doctor's instructions",
                stockLeft: item.duration_days || item.quantity_prescribed || 0
              });
            });
          }
        });
        setMedicines(fetchedMedicines);
      } catch (error) {
        console.error('Failed to fetch prescriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [t]);

  const [refillStatus, setRefillStatus] = useState<Record<string, 'idle' | 'requesting' | 'completed'>>({});

  const handleRequestRefill = (id: string) => {
    setRefillStatus(prev => ({ ...prev, [id]: 'requesting' }));
    
    // Simulate API request
    setTimeout(() => {
      setRefillStatus(prev => ({ ...prev, [id]: 'completed' }));
      
      // Add mock stock
      setMedicines(prevMeds => 
        prevMeds.map(m => m.id === id ? { ...m, stockLeft: m.stockLeft + 30 } : m)
      );

      // Reset completed state after 3 seconds
      setTimeout(() => {
        setRefillStatus(prev => ({ ...prev, [id]: 'idle' }));
      }, 3000);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="animate-fade-in pb-12 flex justify-center items-center h-48">
        <RefreshCw className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('pharmacy.active_meds')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('pharmacy.meds_desc')}</p>
      </header>

      {medicines.length > 0 ? (
        <>
          {/* Pill Compliance Tracker */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 border border-primary/15 mb-6 flex gap-4 items-center">
            <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Clock size={20} className="stroke-[2.25] animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-neutral-900">{t('pharmacy.compliance_streak')}</h3>
              <p className="text-xs text-neutral-600 mt-0.5">{t('pharmacy.compliance_desc')}</p>
            </div>
          </div>

          {/* Active Medicines List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">{t('pharmacy.prescription_schedule')}</h2>
            
            <div className="grid gap-4">
              {medicines.map((med) => (
                <div 
                  key={med.id} 
                  className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] border border-neutral-200/60 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Pill size={20} className="stroke-[2.25]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">{med.name}</h3>
                        <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                          {t('pharmacy.for', 'For')} {med.purpose} • {med.dosage}
                        </p>
                      </div>
                    </div>
                    
                    {/* Stock Level Warning Badge */}
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                        med.stockLeft <= 5 
                          ? 'bg-danger/10 text-danger border border-danger/20' 
                          : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                      }`}>
                        {med.stockLeft} {t('pharmacy.days_left')}
                      </span>
                    </div>
                  </div>

                  {/* Instructions and Schedule */}
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-700 font-bold">
                      <Clock size={12} className="text-primary" />
                      <span>{med.schedule}</span>
                    </div>
                    <div className="text-neutral-500 ml-4.5 font-medium">{med.timing}</div>
                  </div>

                  {/* Refill trigger */}
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-100 mt-1">
                    <span className="text-[11px] text-neutral-500 font-semibold flex items-center gap-1">
                      {med.stockLeft <= 5 && (
                        <>
                          <AlertCircle size={12} className="text-danger" />
                          <span className="text-danger">{t('pharmacy.stock_low')}</span>
                        </>
                      )}
                    </span>
                    
                    <button
                      onClick={() => handleRequestRefill(med.id)}
                      disabled={refillStatus[med.id] === 'requesting'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                        refillStatus[med.id] === 'completed'
                          ? 'bg-success text-white'
                          : refillStatus[med.id] === 'requesting'
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                            : 'bg-primary/10 hover:bg-primary/20 text-primary'
                      }`}
                    >
                      {refillStatus[med.id] === 'requesting' ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>{t('pharmacy.refilling')}</span>
                        </>
                      ) : refillStatus[med.id] === 'completed' ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>{t('pharmacy.refill_ordered')}</span>
                        </>
                      ) : (
                        <span>{t('pharmacy.request_refill')}</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-neutral-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-neutral-50 text-neutral-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill size={32} />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">{t('clinical.no_medical_records', 'No Active Prescriptions')}</h3>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">
            {t('clinical.records_browse_desc', 'You do not have any active medications. Medicines will appear here once prescribed by a doctor.')}
          </p>
        </div>
      )}
    </div>
  );
};

export default Medicines;
