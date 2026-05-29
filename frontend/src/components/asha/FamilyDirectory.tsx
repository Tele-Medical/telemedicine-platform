import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  ArrowLeft, 
  ChevronRight, 
  Heart,
  Loader2
} from 'lucide-react';
import { db } from '../../db/db';
import { apiClient } from '../../api/client';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface PatientRecord {
  id: string;
  full_name: string;
  phone?: string;
  guardian_name?: string;
  guardian_phone?: string;
  has_phone?: boolean;
  gender?: string;
  date_of_birth?: string;
  created_at?: string;
}

const FamilyDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [searchParams] = useSearchParams();
  const phoneQuery = searchParams.get('phone') || '';

  const [familyMembers, setFamilyMembers] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFamilyCohort = async () => {
      if (!phoneQuery) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 1. Query Dexie Local DB
        const localMatches = await db.patients
          .where('phone')
          .equals(phoneQuery)
          .toArray();

        // Map raw Dexie records to structured PatientRecord
        const formattedLocal: PatientRecord[] = localMatches.map(p => ({
          id: String(p.id || ''),
          full_name: String(p.full_name || ''),
          phone: p.phone ? String(p.phone) : undefined,
          guardian_name: p.guardian_name ? String(p.guardian_name) : undefined,
          guardian_phone: p.guardian_phone ? String(p.guardian_phone) : undefined,
          has_phone: Boolean(p.has_phone),
          gender: p.gender ? String(p.gender) : 'unknown',
          date_of_birth: p.date_of_birth ? String(p.date_of_birth) : undefined
        }));

        // 2. Query Central Server if Online
        let onlineMatches: PatientRecord[] = [];
        if (isOnline) {
          try {
            const res = await apiClient(`/patients/?q=${phoneQuery}`);
            if (res && Array.isArray(res)) {
              onlineMatches = res.filter(p => p.phone === phoneQuery);
            }
          } catch (apiErr) {
            console.warn('Sync lookup failed, falling back to local database profiles', apiErr);
          }
        }

        // 3. De-duplicate patient profiles using Map by ID
        const unifiedCohortMap = new Map<string, PatientRecord>();
        formattedLocal.forEach(p => unifiedCohortMap.set(p.id, p));
        onlineMatches.forEach(p => unifiedCohortMap.set(p.id, p));

        setFamilyMembers(Array.from(unifiedCohortMap.values()));
      } catch (err) {
        console.error('Failed to load family members', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFamilyCohort();
  }, [phoneQuery, isOnline]);

  const handleStartConsult = (patientId: string) => {
    navigate(`/consultation-flow/${patientId}`);
  };

  const handleAddFamilyMember = () => {
    navigate(`/register?phone=${phoneQuery}`);
  };

  // Helper for name initials avatar
  const getInitials = (name: string) => {
    if (!name) return 'PT';
    return name
      .trim()
      .split(/\s+/)
      .filter(n => n.length > 0)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  };

  // Harmonized visual colors by gender representation
  const getAvatarStyles = (genderVal?: string) => {
    switch (genderVal?.toLowerCase()) {
      case 'male':
        return 'bg-teal-500/10 text-teal-700 border-teal-200/50';
      case 'female':
        return 'bg-indigo-500/10 text-indigo-700 border-indigo-200/50';
      default:
        return 'bg-neutral-500/10 text-neutral-600 border-neutral-200/50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-900 font-sans">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
        <p className="text-sm font-semibold text-neutral-500 animate-pulse">Loading Family Hub...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-neutral-900 font-sans animate-fade-in">
      {/* Navigation Header */}
      <button 
        onClick={() => navigate('/consult-patient')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors mb-6 outline-none"
      >
        <ArrowLeft size={14} className="stroke-[2.5]" />
        <span>Back to Lookup</span>
      </button>

      <header className="mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs font-extrabold text-primary mb-3">
          <Users size={12} className="stroke-[2.5]" />
          <span>Cohort Group</span>
        </div>
        <h1 className="text-2xl font-black text-neutral-950 tracking-tight">Family Directory</h1>
        <p className="text-sm text-neutral-500 mt-1 font-medium">
          Sharing mobile number: <strong className="text-neutral-800 font-bold">+91 {phoneQuery}</strong>
        </p>
      </header>

      {/* Directory Grid */}
      <div className="space-y-4">
        {familyMembers.map((member) => (
          <div 
            key={member.id} 
            className="bg-white rounded-2xl border border-neutral-200/60 p-4.5 shadow-soft hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${getAvatarStyles(member.gender)}`}>
                {getInitials(member.full_name)}
              </div>
              <div>
                <h3 className="text-sm font-black text-neutral-900 group-hover:text-primary transition-colors flex items-center gap-2">
                  {member.full_name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">
                  <span className="capitalize">{member.gender || 'Unknown'}</span>
                  {member.date_of_birth && (
                    <>
                      <span>•</span>
                      <span>DOB: {new Date(member.date_of_birth).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleStartConsult(member.id)}
              className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/25 hover:bg-primary hover:text-white transition-all text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary/25 shrink-0"
            >
              <Heart size={14} className="stroke-[2.25] text-primary/70 group-hover:text-white transition-colors" />
              <span>Consult Patient</span>
              <ChevronRight size={12} className="stroke-[2.5]" />
            </button>
          </div>
        ))}

        {/* Add Family Member Card */}
        <button
          onClick={handleAddFamilyMember}
          className="w-full bg-neutral-50 hover:bg-neutral-100 border-2 border-dashed border-neutral-200 hover:border-primary/40 rounded-2xl p-5 transition-all duration-300 flex flex-col items-center justify-center gap-2 text-center group active:scale-[0.98] outline-none"
        >
          <div className="w-10 h-10 rounded-full bg-white text-neutral-400 group-hover:text-primary border border-neutral-200 group-hover:border-primary/20 flex items-center justify-center shrink-0 shadow-sm transition-all duration-300">
            <UserPlus size={16} className="stroke-[2.25]" />
          </div>
          <div>
            <span className="text-sm font-bold text-neutral-600 group-hover:text-primary transition-colors block">
              Add a New Family Member
            </span>
            <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
              Register another household member under +91 {phoneQuery}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default FamilyDirectory;
