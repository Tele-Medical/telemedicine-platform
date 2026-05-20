import React from 'react';

const PrescriptionComposer: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-8">
      
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Add Medicine</h3>
        
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Medicine Name</label>
            <input 
              type="text" 
              placeholder="e.g. Paracetamol 500mg" 
              className="w-full bg-background border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Dosage</label>
              <select className="w-full bg-background border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary appearance-none">
                <option>1-0-1 (Morning & Night)</option>
                <option>1-1-1 (Three times)</option>
                <option>1-0-0 (Morning only)</option>
                <option>0-0-1 (Night only)</option>
                <option>SOS (As needed)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Duration</label>
              <div className="flex bg-background rounded-xl items-center pr-4">
                <input 
                  type="number" 
                  placeholder="5" 
                  className="w-full bg-transparent border-none px-4 py-3 focus:outline-none text-text-primary"
                />
                <span className="text-sm text-text-secondary">Days</span>
              </div>
            </div>
          </div>

          <button className="mt-2 w-full py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Another Medicine
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <label className="block text-xs font-semibold text-text-secondary mb-2">Doctor Notes / Instructions</label>
        <textarea 
          rows={3} 
          placeholder="Rest, drink plenty of fluids..." 
          className="w-full bg-background border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary resize-none"
        ></textarea>
      </div>

      <button className="w-full bg-primary hover:bg-primary/90 transition-colors text-white py-4 rounded-xl font-semibold shadow-md shadow-primary/30">
        Save Prescription
      </button>

    </div>
  );
};

export default PrescriptionComposer;
