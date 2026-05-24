import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface User {
  name: string;
  role: string;
  email: string;
  hospitalId: string;
}

const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiBase}/api/v1/auth/me`);
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-neutral-900 font-sans">
        <p className="text-lg text-neutral-500 font-bold animate-pulse">{t('profile.loading')}</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex justify-center items-center h-64 text-neutral-900 font-sans">
        <p className="text-lg text-danger font-bold">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-xl border border-neutral-200 text-neutral-900 font-sans">
      <div className="flex items-center mb-8 border-b border-neutral-100 pb-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary text-3xl font-black shadow-inner border border-primary/10">
          {user.name.charAt(0)}
        </div>
        <div className="ml-6">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{user.name}</h2>
          <p className="text-xs font-black text-primary uppercase tracking-widest mt-1">{user.role}</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100 shadow-sm">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t('auth.email')}</h3>
          <p className="mt-1 text-neutral-900 font-bold">{user.email}</p>
        </div>
        <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100 shadow-sm">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t('profile.hospital_id')}</h3>
          <p className="mt-1 text-neutral-900 font-bold">{user.hospitalId}</p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
