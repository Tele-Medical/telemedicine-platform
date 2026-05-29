import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, ArrowRight, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../../db/db';
import { apiClient } from '../../api/client';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const ConsultPatientSearch: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  const [phoneQuery, setPhoneQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasNoResults, setHasNoResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneQuery.trim().replace(/[^0-9]/g, '');
    
    // Indian standard 10 digit validation
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit mobile number starting with 6-9.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setHasNoResults(false);

    try {
      // 1. Local Search (Dexie)
      const localMatches = await db.patients
        .where('phone')
        .equals(cleanPhone)
        .toArray();

      // 2. Online Search (API)
      let onlineMatches: any[] = [];
      if (isOnline) {
        try {
          const res = await apiClient(`/patients/?q=${cleanPhone}`);
          if (res && Array.isArray(res)) {
            onlineMatches = res.filter(p => p.phone === cleanPhone);
          }
        } catch (apiErr) {
          console.warn('API lookup failed, relying on offline database matches', apiErr);
        }
      }

      // 3. De-duplicate matches
      const combinedMatchesMap = new Map<string, any>();
      localMatches.forEach(p => combinedMatchesMap.set(String(p.id), p));
      onlineMatches.forEach(p => combinedMatchesMap.set(String(p.id), p));
      
      const uniqueMatches = Array.from(combinedMatchesMap.values());

      if (uniqueMatches.length > 0) {
        // Navigate to family member selection directory
        navigate(`/consult-patient/family?phone=${cleanPhone}`);
      } else {
        setHasNoResults(true);
      }
    } catch (err) {
      console.error('Search failed', err);
      setErrorMsg('An error occurred during lookup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterNew = () => {
    const cleanPhone = phoneQuery.trim().replace(/[^0-9]/g, '');
    navigate(`/register?phone=${cleanPhone}`);
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4 text-neutral-900 font-sans animate-fade-in">
      <header className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center mx-auto shadow-md mb-4 transform hover:scale-105 transition-transform duration-300">
          <Phone className="w-7 h-7 stroke-[2.25]" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-950">Patient Lookup</h1>
        <p className="text-sm text-neutral-500 mt-1.5 font-medium">
          Enter the patient's registered mobile number to open their clinical console or family group.
        </p>
      </header>

      <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-soft hover:shadow-md transition-shadow duration-300">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="phone-search" className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
                <Search size={18} className="stroke-[2.25]" />
              </span>
              <input
                id="phone-search"
                type="tel"
                disabled={isLoading}
                value={phoneQuery}
                onChange={(e) => {
                  setPhoneQuery(e.target.value.replace(/[^0-9]/g, ''));
                  setErrorMsg('');
                  setHasNoResults(false);
                }}
                maxLength={10}
                placeholder="e.g. 9876543210"
                className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold tracking-wide placeholder-neutral-400"
              />
            </div>
            {errorMsg && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-danger">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || phoneQuery.trim().length !== 10}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-primary/10 hover:shadow-lg active:scale-[0.98] outline-none transition-all flex items-center justify-center gap-2 disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching Database...</span>
              </>
            ) : (
              <>
                <span>Search Profile</span>
                <ArrowRight size={16} className="stroke-[2.25]" />
              </>
            )}
          </button>
        </form>

        {/* Pathway B: Unregistered Number Prompt */}
        {hasNoResults && !isLoading && (
          <div className="mt-6 border-t border-neutral-100 pt-6 animate-fade-in text-center">
            <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl text-left flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/30">
                <AlertCircle size={18} className="stroke-[2.25]" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-extrabold text-amber-900">Number Not Registered</h3>
                <p className="text-[11px] text-amber-700/90 font-medium mt-1 leading-relaxed">
                  No active health profile matches <strong>+91 {phoneQuery}</strong>. You can establish a new digital health card with this number prefilled.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRegisterNew}
                className="w-full mt-1.5 inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.97] transition-all text-white text-xs font-black px-4.5 py-2.5 rounded-xl border border-amber-500/20 shadow-sm"
              >
                <UserPlus size={14} className="stroke-[2.5]" />
                <span>Register New Patient</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultPatientSearch;
