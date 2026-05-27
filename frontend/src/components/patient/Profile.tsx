import React, { useState, useEffect } from 'react';
import { Shield, Globe, LogOut, CheckCircle2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../api/services';
import { apiClient } from '../../api/client';

interface ProfileProps {
  onLogout?: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  phone_number?: string;
  default_role?: string;
}

const Profile: React.FC<ProfileProps> = ({ onLogout }) => {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const rawId = localStorage.getItem('active_patient_id');
    const activePatientId = rawId && rawId !== 'undefined' && rawId !== 'null' ? rawId : null;

    const loadProfile = async () => {
      try {
        const userMe = await authService.getMe();

        if (activePatientId) {
          try {
            const patientData = await apiClient(`/patients/${activePatientId}`);
            if (patientData) {
              setProfile({
                id: patientData.id,
                username: userMe.username,
                full_name: patientData.full_name,
                phone_number: patientData.phone || userMe.phone,
                default_role: 'patient'
              });
              return;
            }
          } catch (e) {
            console.error("Failed to load active patient profile:", e);
          }
        }

        // Fallback or if no activePatientId
        setProfile({
          id: userMe.id,
          username: userMe.username,
          full_name: userMe.full_name,
          phone_number: userMe.phone,
          default_role: userMe.default_role
        });
      } catch (err) {
        console.error("Failed to load profile details:", err);
      }
    };

    loadProfile();
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('nav.profile')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('profile.subtitle')}</p>
      </header>

      {/* Profile Info Summary Card */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-neutral-200/60 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
          {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'P'}
        </div>
        <div>
          <h2 className="text-base font-bold text-neutral-900">{profile?.full_name || t('profile.default_name')}</h2>
          <p className="text-xs text-neutral-500 font-semibold mt-0.5">{profile?.phone_number || '+91 XXXXX XXXXX'}</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
            {profile?.default_role ? t(`clinical.${profile.default_role.toLowerCase()}`, profile.default_role) : t('clinical.patient')}
          </span>
        </div>
      </section>

      {/* Beautiful Ayushman Bharat Digital Health Card (ABHA Card) */}
      <section className="bg-gradient-to-br from-teal-800 to-emerald-950 text-white rounded-2xl p-5 shadow-lg border border-teal-700/50 mb-6 relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-teal-500/10 rounded-full blur-xl"></div>
        <div className="absolute -left-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>

        <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-emerald-400 stroke-[2.25]" />
            <span className="text-xs font-black tracking-widest uppercase">{t('profile.abha_card')}</span>
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase text-emerald-400 bg-white/15 px-2 py-0.5 rounded-full">
            {t('profile.verified')}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-[10px] text-teal-300 font-black tracking-wider uppercase">{t('profile.health_id')}</div>
            <div className="text-lg font-mono font-bold tracking-widest mt-0.5">91-2053-8473-1940</div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] text-teal-300 font-black tracking-wider uppercase">{t('profile.name')}</div>
              <div className="text-sm font-bold mt-0.5">{profile?.full_name || t('profile.default_name')}</div>
            </div>

            {/* Simulated QR Code */}
            <div className="bg-white p-1.5 rounded-lg shrink-0 border border-teal-700/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1e2429" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="M14 14h1v1h-1zM18 14h3v3h-3zM14 18h3v3h-3zM20 18h1v1h-1z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Family Profiles / Accounts (Patients Only) */}
      {(!profile?.default_role || profile.default_role === 'patient') && (
        <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-neutral-200/60 mb-6 space-y-4">
          <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Family Accounts</h2>
          
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-primary">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Switch / Manage Members</h3>
                <p className="text-xs text-neutral-500">
                  Active member: <span className="font-bold text-primary">{localStorage.getItem('active_patient_name') || profile?.full_name}</span>
                </p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                localStorage.removeItem('active_patient_id');
                localStorage.removeItem('active_patient_name');
                window.location.href = '/';
              }}
              className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-2 text-xs font-bold text-neutral-700 transition-all active:scale-[0.98]"
            >
              Switch Profile
            </button>
          </div>
        </section>
      )}

      {/* Preferences Section */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-neutral-200/60 mb-6 space-y-4">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">{t('profile.preferences')}</h2>
        
        {/* Language Selector */}
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-600">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">{t('profile.primary_language')}</h3>
              <p className="text-xs text-neutral-500">{t('profile.language_desc')}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <select 
              value={i18n.language}
              onChange={handleLanguageChange}
              className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
            >
              <option value="pa">{t('profile.lang_pa')}</option>
              <option value="hi">{t('profile.lang_hi')}</option>
              <option value="en">{t('profile.lang_en')}</option>
              <option value="bn">{t('profile.lang_bn')}</option>
            </select>

            {isSaved && (
              <span className="text-[10px] text-success font-bold flex items-center gap-1">
                <CheckCircle2 size={10} />
                <span>{t('auth.saved')}</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Logout Action Button */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="w-full py-3.5 bg-danger/10 border border-danger/25 hover:bg-danger/15 active:scale-[0.98] transition-all text-danger font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-sm"
        >
          <LogOut size={16} className="stroke-[2.25]" />
          <span>{t('auth.logout')}</span>
        </button>
      )}
    </div>
  );
};

export default Profile;
