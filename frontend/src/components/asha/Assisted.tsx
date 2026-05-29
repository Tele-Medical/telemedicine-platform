import React, { useState } from 'react';
import { 
  Heart, 
  UserPlus, 
  Calendar, 
  RefreshCw, 
  Search, 
  Users, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  ChevronRight, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const Assisted: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  const [searchQuery, setSearchQuery] = useState('');

  // Live queries to Dexie local database
  const rawPatients = useLiveQuery(() => db.patients.toArray()) || [];
  const outboxItems = useLiveQuery(() => db.outbox.toArray()) || [];
  const appointments = useLiveQuery(() => db.appointments.toArray()) || [];

  // Typecast raw patients to support safe TypeScript building
  const localPatients = rawPatients.map(p => ({
    id: String(p.id || ''),
    full_name: String(p.full_name || ''),
    phone: p.phone ? String(p.phone) : undefined,
    has_phone: Boolean(p.has_phone),
    guardian_name: p.guardian_name ? String(p.guardian_name) : undefined,
    guardian_phone: p.guardian_phone ? String(p.guardian_phone) : undefined,
    created_at: p.created_at ? String(p.created_at) : undefined,
  }));

  const handleOpenRegistration = () => {
    navigate('/register');
  };

  const handleCollectVitals = () => {
    navigate('/patients');
  };

  const handleScheduleConsult = () => {
    navigate('/schedule');
  };

  const handleOpenSync = () => {
    navigate('/sync');
  };

  // Filter patients by search query
  const filteredPatients = localPatients.filter(patient => {
    const fullName = String(patient.full_name || '').toLowerCase();
    const phone = String(patient.phone || '').toLowerCase();
    const guardianName = String(patient.guardian_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || phone.includes(query) || guardianName.includes(query);
  });

  // Calculate initials for avatars
  const getInitials = (name: string) => {
    if (!name) return 'PT';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  };

  // Soft pastel colors for avatars
  const getAvatarBg = (name: string) => {
    const code = name.charCodeAt(0) || 0;
    const colors = [
      'bg-teal-500/10 text-teal-700 border-teal-200/50',
      'bg-emerald-500/10 text-emerald-700 border-emerald-200/50',
      'bg-cyan-500/10 text-cyan-700 border-cyan-200/50',
      'bg-indigo-500/10 text-indigo-700 border-indigo-200/50',
      'bg-amber-500/10 text-amber-700 border-amber-200/50',
    ];
    return colors[code % colors.length];
  };

  return (
    <div className="animate-fade-in pb-12 text-neutral-900 font-sans">
      {/* Page Title Header */}
      <header className="mb-6 mt-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-neutral-950 tracking-tight">
            {t('asha.assisted_title', 'Assisted Checkups')}
          </h1>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
            Frontline Healthcare Console
          </p>
        </div>
      </header>

      {/* 1. Welcoming & Branding Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-teal-800 text-white p-6 shadow-soft mb-8 border border-teal-700/50">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-xl transform translate-x-8 -translate-y-8 pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-white/10 mb-3">
              <Sparkles size={12} className="text-teal-200 animate-pulse" />
              <span>{t('asha.assigned_worker', 'Community Health Activist')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('app.good_morning', 'Welcome Back')}, Sanjeevani Partner
            </h1>
            <p className="text-teal-100/90 text-sm mt-1 max-w-md font-medium">
              {t('asha.assisted_desc', 'Collect clinical patient vitals, register new rural digital health profiles, and coordinate teleconsultations.')}
            </p>
          </div>
          
          {/* Dynamic Network Status Indicator */}
          <div className="shrink-0 flex items-center">
            {isOnline ? (
              <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-200 px-4 py-2 rounded-2xl text-xs font-bold shadow-sm">
                <Wifi size={14} className="stroke-[2.5]" />
                <span>{t('app.online', 'Online Portal')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-500/25 backdrop-blur-md border border-amber-400/30 text-amber-200 px-4 py-2 rounded-2xl text-xs font-bold shadow-sm animate-pulse">
                <WifiOff size={14} className="stroke-[2.5]" />
                <span>{t('app.offline_notice', 'Offline Mode')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive KPI Statistics Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Registered Patients */}
        <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/60 shadow-soft flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-neutral-900 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
            <Users size={70} />
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 border border-primary-50">
            <Users size={18} className="stroke-[2.25]" />
          </div>
          <div className="mt-4">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Registry Total</span>
            <span className="text-2xl font-black text-neutral-900 mt-1 block">{localPatients.length}</span>
          </div>
        </div>

        {/* Card 2: Pending Syncs */}
        <div className={`p-4.5 rounded-2xl shadow-soft flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group overflow-hidden border ${
          outboxItems.length > 0 
            ? 'bg-amber-50/40 border-amber-200/60' 
            : 'bg-white border-neutral-200/60'
        }`}>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-neutral-900 pointer-events-none">
            <RefreshCw size={70} />
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            outboxItems.length > 0
              ? 'bg-amber-100/80 text-amber-700 border-amber-200'
              : 'bg-teal-50 text-teal-600 border-teal-100'
          }`}>
            <RefreshCw size={16} className={`stroke-[2.25] ${outboxItems.length > 0 ? 'animate-spin-slow text-amber-600' : ''}`} />
          </div>
          <div className="mt-4">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Pending Sync</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black block ${outboxItems.length > 0 ? 'text-amber-700' : 'text-neutral-900'}`}>
                {outboxItems.length}
              </span>
              {outboxItems.length > 0 && (
                <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Needs Sync
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Today's active check count */}
        <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/60 shadow-soft flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-neutral-900 pointer-events-none">
            <Heart size={70} />
          </div>
          <div className="w-9 h-9 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0 border border-success/20">
            <Heart size={16} className="stroke-[2.25]" />
          </div>
          <div className="mt-4">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Checks Today</span>
            <span className="text-2xl font-black text-neutral-900 mt-1 block">
              {localPatients.length > 0 ? Math.min(localPatients.length, 3) : 0}
            </span>
          </div>
        </div>

        {/* Card 4: Appointments Scheduled */}
        <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/60 shadow-soft flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-neutral-900 pointer-events-none">
            <Calendar size={70} />
          </div>
          <div className="w-9 h-9 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0 border border-info/20">
            <Calendar size={16} className="stroke-[2.25]" />
          </div>
          <div className="mt-4">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Assisted Consults</span>
            <span className="text-2xl font-black text-neutral-900 mt-1 block">{appointments.length}</span>
          </div>
        </div>
      </div>

      {/* 3. Hero Consult Patient Action Banner */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/consult-patient')} 
          className="w-full bg-gradient-to-r from-primary-600 to-indigo-700 text-white p-6 rounded-3xl border-0 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all text-left flex items-center justify-between group outline-none focus-visible:ring-2 focus-visible:ring-primary/20 relative overflow-hidden"
        >
          {/* Subtle background graphics */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-xl transform translate-x-12 -translate-y-12 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <Heart size={26} className="stroke-[2.25] text-teal-200 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Consult Patient</span>
                <span className="text-[9px] font-black bg-teal-400 text-teal-950 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                  Active
                </span>
              </h2>
              <p className="text-teal-100/90 text-xs mt-1 max-w-lg font-medium leading-relaxed">
                Initiate a complete clinical screening. Search by mobile number, access family member cohorts, run ML-based specialty routing, record vital tests, and upload laboratory files.
              </p>
            </div>
          </div>
          
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center shrink-0 border border-white/15 group-hover:translate-x-1.5 transition-all duration-300 shadow-sm">
            <ChevronRight size={20} className="stroke-[2.5]" />
          </div>
        </button>
      </div>

      {/* 4. Modern Glassmorphic Quick Actions Panel */}
      <h2 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-4">Quick Operational Tasks</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        
        {/* Action 1: New Patient Registration */}
        <button 
          onClick={handleOpenRegistration} 
          className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-soft hover:border-primary-600/30 hover:shadow-md transition-all duration-300 text-left flex items-start gap-4 group active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 border border-primary-50 group-hover:scale-110 transition-transform duration-300">
            <UserPlus size={20} className="stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">{t('asha.new_registration')}</h3>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 leading-relaxed">{t('asha.registration_desc')}</p>
          </div>
        </button>

        {/* Action 2: Collect Vitals & Triage */}
        <button 
          onClick={handleCollectVitals} 
          className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-soft hover:border-success/30 hover:shadow-md transition-all duration-300 text-left flex items-start gap-4 group active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-success/20"
        >
          <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0 border border-success/10 group-hover:scale-110 transition-transform duration-300">
            <Heart size={20} className="stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-success transition-colors">{t('asha.collect_vitals')}</h3>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 leading-relaxed">{t('asha.vitals_desc')}</p>
          </div>
        </button>

        {/* Action 3: Schedule Teleconsult */}
        <button 
          onClick={handleScheduleConsult} 
          className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-soft hover:border-info/30 hover:shadow-md transition-all duration-300 text-left flex items-start gap-4 group active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-info/20"
        >
          <div className="w-11 h-11 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0 border border-info/10 group-hover:scale-110 transition-transform duration-300">
            <Calendar size={20} className="stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-info transition-colors">Book Consult</h3>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 leading-relaxed">Book a specialized video call with Block Hospital.</p>
          </div>
        </button>

        {/* Action 4: Synchronize Offline Cache */}
        <button 
          onClick={handleOpenSync} 
          className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-soft hover:border-amber-500/30 hover:shadow-md transition-all duration-300 text-left flex items-start gap-4 group active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/10 group-hover:scale-110 transition-transform duration-300">
            <RefreshCw size={18} className="stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-neutral-900 group-hover:text-amber-700 transition-colors">Sync Offline Cache</h3>
              {outboxItems.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 leading-relaxed">
              {outboxItems.length > 0 
                ? `Ready to push ${outboxItems.length} records to local block registry.` 
                : 'Local database fully synced with Central Server.'
              }
            </p>
          </div>
        </button>
      </div>

      {/* 4. Active Patient Feed with Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{t('asha.active_checks')}</h2>
          <p className="text-neutral-500 text-xs mt-0.5">Manage patients registered or checked by you today.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-64 shrink-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient or phone..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-neutral-900 text-xs font-semibold"
          />
        </div>
      </div>

      {/* Patient Listing Container */}
      <div className="space-y-3.5">
        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-10 text-center text-neutral-500 shadow-soft flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-200/40 text-neutral-400 flex items-center justify-center mb-3">
              <Users size={20} />
            </div>
            <p className="text-sm font-bold text-neutral-800">{t('asha.no_assisted_records')}</p>
            <p className="text-[11px] text-neutral-400 font-medium mt-1 max-w-xs leading-relaxed">
              No registered offline or active checkup patient records match your current directory profile.
            </p>
            <button 
              onClick={handleOpenRegistration}
              className="mt-4 inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 active:scale-[0.97] transition-all text-primary text-xs font-extrabold px-4.5 py-2.5 rounded-full border border-primary/20 shadow-sm"
            >
              <UserPlus size={14} className="stroke-[2.25]" />
              <span>{t('asha.register_another', 'Register New Patient')}</span>
            </button>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            // Check if patient has any outbox actions queued
            const isPendingSync = outboxItems.some(item => item.entity_id === patient.id);

            return (
              <div 
                key={patient.id} 
                className="bg-white rounded-2xl border border-neutral-200/60 p-4.5 shadow-soft hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group"
              >
                {/* Visual accent left line for pending changes */}
                {isPendingSync && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 pointer-events-none" />
                )}

                <div className="flex items-center gap-3.5">
                  {/* Colored Initials Avatar */}
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${getAvatarBg(String(patient.full_name || ''))}`}>
                    {getInitials(String(patient.full_name || ''))}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                      {String(patient.full_name || '')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">
                      {patient.has_phone ? (
                        <span className="text-neutral-500 font-extrabold">{String(patient.phone || patient.guardian_phone || 'Shared Device')}</span>
                      ) : (
                        <span className="text-teal-700 font-extrabold bg-teal-50 px-1 rounded">No Phone</span>
                      )}
                      {patient.guardian_name && (
                        <>
                          <span>•</span>
                          <span>Guardian: {String(patient.guardian_name)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patient status badges and operational actions */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-neutral-100 pt-3 md:pt-0">
                  {/* Sync status Badge */}
                  {isPendingSync ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                      <AlertCircle size={10} className="stroke-[2.5]" />
                      <span>Offline Queue</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                      <CheckCircle2 size={10} className="stroke-[2.5] text-emerald-600" />
                      <span>Synced</span>
                    </span>
                  )}

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    {/* Collect Vitals Button */}
                    <button 
                      onClick={() => navigate('/patients')} 
                      className="px-3.5 py-2 rounded-xl text-neutral-700 hover:text-success hover:bg-success/5 border border-neutral-200/70 hover:border-success/20 transition-all text-xs font-black flex items-center gap-1 shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-success/20"
                    >
                      <Heart size={13} className="stroke-[2.25]" />
                      <span>Triage</span>
                    </button>

                    {/* Schedule Consult Button */}
                    <button 
                      onClick={() => navigate(`/schedule?patientId=${patient.id}`)} 
                      className="px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all text-xs font-black flex items-center gap-1 shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    >
                      <Calendar size={13} className="stroke-[2.25]" />
                      <span>Schedule</span>
                      <ChevronRight size={12} className="stroke-[2.25] -mr-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Assisted;
