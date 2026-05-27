import React, { useState } from 'react';
import { Loader2, AlertCircle, Activity } from 'lucide-react';

interface SymptomIntakeWizardProps {
  onComplete: (intakeData: { raw_text: string, symptoms: string[], severity: string, duration: string }) => void;
  onCancel: () => void;
}

export function SymptomIntakeWizard({ onComplete, onCancel }: SymptomIntakeWizardProps) {
  const [step, setStep] = useState(1);
  const [complaint, setComplaint] = useState('');
  const [severity, setSeverity] = useState('moderate');
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Symptom Checker
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Tell us how you're feeling and our intelligent system will route you to the right specialist.
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What are your main symptoms? Please be descriptive.
                </label>
                <textarea
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="e.g. I have had a severe headache and dizziness since yesterday morning..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                />
              </div>
              <button
                disabled={complaint.length < 5}
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-3 font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How severe are your symptoms?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['Mild', 'Moderate', 'Severe'].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`py-2 px-3 rounded-lg border font-medium text-sm transition-all
                        ${severity === sev 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20' 
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How long have you felt this way?
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option>Less than 24 hours</option>
                  <option>1-3 days</option>
                  <option>1 week</option>
                  <option>More than a week</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAnalyzeAndSubmit}
                  disabled={isAnalyzing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Symptoms...
                    </>
                  ) : (
                    'Find Specialist'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
            <AlertCircle className="w-4 h-4" />
            <span>If this is a medical emergency, call emergency services immediately.</span>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
