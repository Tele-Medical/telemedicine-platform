import { useState } from 'react';
import { Loader2, AlertCircle, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SymptomIntakeWizardProps {
  onComplete: (intakeData: { raw_text: string, symptoms: string[], severity: string, duration: string }) => void;
  onCancel: () => void;
}

export function SymptomIntakeWizard({ onComplete, onCancel }: SymptomIntakeWizardProps) {
  const { t } = useTranslation();
  const [complaint, setComplaint] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [duration, setDuration] = useState('1-3 days');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeAndSubmit = async () => {
    setIsAnalyzing(true);
    
    // Simulate ML extraction delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock ML extraction logic based on keywords
    const keywords = complaint.toLowerCase();
    const symptoms: string[] = [];
    
    if (keywords.includes('head') || keywords.includes('dizzy')) symptoms.push('headache', 'dizziness');
    if (keywords.includes('stomach') || keywords.includes('pain') || keywords.includes('nausea')) symptoms.push('abdominal pain', 'nausea');
    if (keywords.includes('fever') || keywords.includes('hot')) symptoms.push('fever');
    if (keywords.includes('cough') || keywords.includes('cold')) symptoms.push('cough', 'congestion');
    if (keywords.includes('heart') || keywords.includes('chest')) symptoms.push('chest pain', 'palpitations');
    if (keywords.includes('child') || keywords.includes('baby')) symptoms.push('pediatric concern');
    
    if (symptoms.length === 0) {
      symptoms.push('general discomfort');
    }

    setIsAnalyzing(false);
    
    onComplete({
      raw_text: complaint,
      symptoms: symptoms,
      severity: severity,
      duration: duration
    });
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-neutral-100 overflow-hidden flex flex-col transform transition-all duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">
                {t('clinical.intake_title')}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                {t('clinical.intake_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Main Symptoms */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('clinical.main_symptoms')} <span className="text-danger">*</span>
            </label>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder={t('clinical.symptoms_placeholder')}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400 text-sm min-h-[100px] resize-y"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('clinical.severity_q')} <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 bg-neutral-100/70 p-1 rounded-xl border border-neutral-200/50">
              {['Mild', 'Moderate', 'Severe'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverity(sev)}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${
                    severity === sev 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/50'
                  }`}
                >
                  {t(`clinical.${sev.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              {t('clinical.duration_q')} <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-sm appearance-none font-medium cursor-pointer"
              >
                <option value="Less than 24 hours">{t('clinical.dur_24h')}</option>
                <option value="1-3 days">{t('clinical.dur_3d')}</option>
                <option value="1 week">{t('clinical.dur_1w')}</option>
                <option value="More than a week">{t('clinical.dur_more_1w')}</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex pt-2">
            <button
              onClick={handleAnalyzeAndSubmit}
              disabled={isAnalyzing || complaint.length < 5}
              className="w-full bg-primary hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full py-3.5 font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('clinical.analyzing')}</span>
                </>
              ) : (
                <span>{t('clinical.find_specialist')}</span>
              )}
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-danger">
            <AlertCircle className="w-4 h-4" />
            <span>{t('clinical.emergency_warning')}</span>
          </div>
          <button 
            onClick={onCancel} 
            disabled={isAnalyzing}
            className="text-neutral-500 hover:text-neutral-800 disabled:opacity-50 text-sm font-bold transition-colors px-2 py-1"
          >
            {t('nav.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
