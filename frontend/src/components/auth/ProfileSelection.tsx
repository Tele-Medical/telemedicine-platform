import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, User, Loader2, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PatientProfile {
  id: string;
  full_name: string;
  phone?: string;
  gender: string;
}

export function ProfileSelection() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Add member form states
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('male');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  
  const navigate = useNavigate();

  const fetchProfiles = async () => {
    try {
      // FIX & COMPATIBILITY: Look for both 'token' (used by app) and 'access_token' (used by tests)
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
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
    
    // FIX & COMPATIBILITY: Resolve role key for both app and tests, then route
    const role = localStorage.getItem('role') || localStorage.getItem('user_role') || 'patient';
    if (role === 'asha_worker' || role === 'asha') {
      navigate('/dashboard/asha');
    } else {
      navigate('/dashboard/patient');
    }
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setModalError('Please enter a valid full name (minimum 2 characters).');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:8000/api/v1/patients/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: trimmedName,
          gender: gender,
          preferred_language: 'pa',
          date_of_birth: dob || null,
          phone: phone || null
        })
      });

      if (response.ok) {
        const newPatient = await response.json();
        
        // Auto-select the newly created profile and navigate to dashboard
        selectProfile(newPatient);
      } else {
        const errorData = await response.json();
        setModalError(errorData.detail || 'Failed to create family profile. Please try again.');
      }
    } catch (error) {
      console.error("Failed to create family profile:", error);
      setModalError('Failed to connect to the server. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  // Helper to extract initials for premium profile avatars
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0] ? parts[0][0].toUpperCase() : '?';
  };

  // Helper for assigning premium, cohesive colors to profile cards based on gender
  const getGenderStyles = (genderVal: string) => {
    switch (genderVal?.toLowerCase()) {
      case 'male':
        return {
          bg: 'bg-teal-50 hover:bg-teal-100/80',
          text: 'text-teal-700',
          border: 'border-teal-100 group-hover:border-teal-500'
        };
      case 'female':
        return {
          bg: 'bg-indigo-50 hover:bg-indigo-100/80',
          text: 'text-indigo-700',
          border: 'border-indigo-100 group-hover:border-indigo-500'
        };
      default:
        return {
          bg: 'bg-neutral-50 hover:bg-neutral-100/80',
          text: 'text-neutral-600',
          border: 'border-neutral-200 group-hover:border-neutral-400'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 text-neutral-900 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-neutral-500 font-semibold text-sm animate-pulse">
            {t('app.title', 'Sanjeevani')}: {t('app.loading', 'Loading profiles...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
      <div className="max-w-3xl w-full mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-3">
            Who is this appointment for?
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-md mx-auto">
            Select a family member's health card to continue or add a new member.
          </p>
        </div>

        {/* Profile Card Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center max-w-2xl mx-auto">
          {profiles.map((profile) => {
            const styles = getGenderStyles(profile.gender);
            return (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile)}
                className="flex flex-col items-center group bg-surface border border-neutral-200/60 rounded-2xl p-6 shadow-soft hover:shadow-md transition-all duration-300 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <div className={`w-20 h-20 rounded-full ${styles.bg} ${styles.text} flex items-center justify-center border-2 ${styles.border} transition-all duration-300 shadow-inner mb-4`}>
                  <span className="text-2xl font-bold tracking-wider">
                    {getInitials(profile.full_name)}
                  </span>
                </div>
                <span className="text-lg font-bold text-neutral-900 group-hover:text-primary transition-colors text-center line-clamp-1 w-full">
                  {profile.full_name}
                </span>
                <span className="text-xs text-text-secondary capitalize mt-1">
                  {profile.gender || 'Unknown'}
                </span>
              </button>
            );
          })}

          {/* Add New Button Card */}
          <button
            onClick={() => {
              setFullName('');
              setDob('');
              setPhone('');
              setGender('male');
              setModalError('');
              setShowAddModal(true);
            }}
            className="flex flex-col items-center group bg-surface border-2 border-dashed border-neutral-200 hover:border-primary rounded-2xl p-6 transition-all duration-300 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="w-20 h-20 rounded-full bg-neutral-50 group-hover:bg-primary-50 flex items-center justify-center border-2 border-transparent transition-all duration-300 mb-4 shadow-sm">
              <PlusCircle className="w-10 h-10 text-neutral-400 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-lg font-bold text-neutral-500 group-hover:text-primary transition-colors">
              Add Member
            </span>
            <span className="text-xs text-text-secondary mt-1">
              Register family profile
            </span>
          </button>
        </div>
      </div>

      {/* Inline Registration Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md border border-neutral-100 overflow-hidden transform transition-all duration-300 animate-fade-in flex flex-col my-8">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Add Family Member</h3>
                <p className="text-xs text-text-secondary mt-0.5">Create a clinical profile for appointment scheduling.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 p-1.5 rounded-full transition-colors outline-none"
                disabled={modalLoading}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleAddProfile} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label htmlFor="modal-fullname" className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="modal-fullname"
                  type="text"
                  required
                  disabled={modalLoading}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400 text-sm"
                  maxLength={50}
                />
              </div>

              {/* Gender Segmented Selection */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Gender <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 bg-neutral-100/70 p-1 rounded-xl border border-neutral-200/50">
                  {['male', 'female', 'other'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={modalLoading}
                      onClick={() => setGender(opt)}
                      className={`py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                        gender === opt
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="modal-dob" className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Date of Birth <span className="text-neutral-400 font-normal text-xs">(Optional)</span>
                </label>
                <input
                  id="modal-dob"
                  type="date"
                  disabled={modalLoading}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-sm cursor-pointer"
                />
              </div>

              {/* Phone (Optional) */}
              <div>
                <label htmlFor="modal-phone" className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Phone Number <span className="text-neutral-400 font-normal text-xs">(Optional)</span>
                </label>
                <input
                  id="modal-phone"
                  type="tel"
                  disabled={modalLoading}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                  placeholder="e.g. +919876543210"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 placeholder-neutral-400 text-sm"
                  maxLength={15}
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t border-neutral-100 mt-6">
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] text-neutral-700 rounded-xl font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || fullName.trim().length < 2}
                  className="w-full py-3 bg-primary hover:bg-primary-700 active:scale-[0.98] text-white rounded-xl font-semibold text-sm shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-2"
                >
                  {modalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save & Select</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
