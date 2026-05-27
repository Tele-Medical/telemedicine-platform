import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, User, Loader2 } from 'lucide-react';

interface PatientProfile {
  id: string;
  full_name: string;
  phone?: string;
  gender: string;
}

export function ProfileSelection() {
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:8000/api/v1/patients/me/family', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch family profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const selectProfile = (profile: PatientProfile) => {
    // Set the active patient context
    localStorage.setItem('active_patient_id', profile.id);
    localStorage.setItem('active_patient_name', profile.full_name);
    
    // Check role and navigate accordingly
    const role = localStorage.getItem('user_role');
    if (role === 'asha_worker') {
      navigate('/dashboard/asha');
    } else {
      navigate('/dashboard/patient');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Who is this appointment for?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Select a family member to continue
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => selectProfile(profile)}
              className="flex flex-col items-center group transition-transform hover:scale-105"
            >
              <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-4 border-transparent group-hover:border-blue-500 transition-colors shadow-lg overflow-hidden relative">
                <User className="w-16 h-16 text-blue-500 dark:text-blue-400" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="mt-4 text-xl font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {profile.full_name}
              </span>
            </button>
          ))}

          <button
            onClick={() => navigate('/dashboard/asha?register=true')}
            className="flex flex-col items-center group transition-transform hover:scale-105"
          >
            <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-4 border-transparent group-hover:border-green-500 transition-colors shadow-lg overflow-hidden relative">
              <PlusCircle className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="mt-4 text-xl font-medium text-gray-600 dark:text-gray-400 group-hover:text-green-600 transition-colors">
              Add New
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
