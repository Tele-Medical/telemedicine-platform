import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from './components/layout/AppShell';
import LoginContainer from './components/auth/LoginContainer';
import RegisterProfile from './components/auth/RegisterProfile';
import PatientDashboard from './components/dashboard/PatientDashboard';
import TeleconsultationRoom from './components/consultation/TeleconsultationRoom';
import { authService } from './api/services';
import Records from './components/patient/Records';
import Medicines from './components/patient/Medicines';
import Profile from './components/patient/Profile';

// Role-specific imports
import Queue from './components/practitioner/Queue';
import Consults from './components/practitioner/Consults';
import Patients from './components/practitioner/Patients';
import Prescriptions from './components/practitioner/Prescriptions';
import Assisted from './components/asha/Assisted';
import Sync from './components/asha/Sync';
import Inventory from './components/pharmacist/Inventory';
import Users from './components/admin/Users';
import Clinics from './components/admin/Clinics';

// Phase 3: Staff Auth & Role Workflows
import StaffLogin from './pages/auth/StaffLogin';
import UserProfilePage from './pages/auth/UserProfile';
import AssistedOnboardingWizard from './components/asha/AssistedOnboardingWizard';
import AppointmentScheduler from './components/consultation/AppointmentScheduler';
import PatientQueue from './components/doctor/PatientQueue';
import ClinicalForms from './components/doctor/ClinicalForms';
import EncounterClosureForm from './components/doctor/EncounterClosureForm';
import InventoryLedger from './components/pharmacist/InventoryLedger';
import StockForms from './components/pharmacist/StockForms';
import PrescriptionFulfillmentTable from './components/pharmacist/PrescriptionFulfillmentTable';

interface UserProfile {
  full_name?: string;
  default_role?: string;
}

function App() {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(!!localStorage.getItem('token'));

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setUserRole(null);
    setProfile(null);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      setLoadingProfile(true);
      authService.getMe()
        .then((userProfile) => {
          if (active) {
            setProfile(userProfile);
            const role = userProfile.default_role || 'patient';
            setUserRole(role);
            localStorage.setItem('role', role);
          }
        })
        .catch(() => {
          if (active) {
            handleLogout();
          }
        })
        .finally(() => {
          if (active) {
            setLoadingProfile(false);
          }
        });
    } else {
      setProfile(null);
      setUserRole(null);
      localStorage.removeItem('role');
      setLoadingProfile(false);
    }
    return () => { active = false; };
  }, [isAuthenticated]);

  const handleReloadProfile = async () => {
    try {
      setLoadingProfile(true);
      const userProfile = await authService.getMe();
      setProfile(userProfile);
      const role = userProfile.default_role || 'patient';
      setUserRole(role);
      localStorage.setItem('role', role);
    } catch {
      handleLogout();
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 text-neutral-900 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-neutral-500 font-semibold text-sm animate-pulse">
            {t('app.title')}: {t('app.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        profile && userRole === 'patient' && !profile.full_name ? (
          <RegisterProfile onComplete={handleReloadProfile} />
        ) : (
          <AppShell onLogout={handleLogout}>
            {(() => {
              switch (userRole) {
                case 'doctor':
                case 'practitioner':
                  return (
                    <Routes>
                      <Route path="/" element={<PatientQueue />} />
                      <Route path="/queue-legacy" element={<Queue />} />
                      <Route path="/consults" element={<Consults />} />
                      <Route path="/patients" element={<Patients />} />
                      <Route path="/clinical/:patientId" element={<ClinicalForms />} />
                      <Route path="/encounter/:encounterId" element={<EncounterClosureForm />} />
                      <Route path="/prescriptions" element={<Prescriptions />} />
                      <Route path="/me" element={<UserProfilePage />} />
                      <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
                      <Route path="/consultation" element={<TeleconsultationRoom userRole={userRole || 'patient'} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  );
                case 'asha':
                case 'asha_worker':
                case 'staff':
                  return (
                    <Routes>
                      <Route path="/" element={<Assisted />} />
                      <Route path="/register" element={<AssistedOnboardingWizard />} />
                      <Route path="/schedule" element={<AppointmentScheduler />} />
                      <Route path="/schedule/:patientId" element={<AppointmentScheduler />} />
                      <Route path="/patients" element={<Patients />} />
                      <Route path="/appointments" element={<Queue />} />
                      <Route path="/sync" element={<Sync />} />
                      <Route path="/me" element={<UserProfilePage />} />
                      <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
                      <Route path="/consultation" element={<TeleconsultationRoom userRole={userRole || 'patient'} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  );
                case 'pharmacist':
                  return (
                    <Routes>
                      <Route path="/" element={<PrescriptionFulfillmentTable />} />
                      <Route path="/prescriptions-legacy" element={<Prescriptions />} />
                      <Route path="/inventory" element={<InventoryLedger />} />
                      <Route path="/inventory-legacy" element={<Inventory />} />
                      <Route path="/stock" element={<StockForms />} />
                      <Route path="/search" element={<Patients />} />
                      <Route path="/me" element={<UserProfilePage />} />
                      <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  );
                case 'admin':
                  return (
                    <Routes>
                      <Route path="/" element={<Queue />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/clinics" element={<Clinics />} />
                      <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  );
                case 'patient':
                default:
                  return (
                    <Routes>
                      <Route path="/" element={<PatientDashboard />} />
                      <Route path="/records" element={<Records />} />
                      <Route path="/medicines" element={<Medicines />} />
                      <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
                      <Route path="/consultation" element={<TeleconsultationRoom userRole={userRole || 'patient'} />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  );
              }
            })()}
          </AppShell>
        )
      ) : (
        <Routes>
          <Route path="/login" element={<LoginContainer onLogin={handleLogin} />} />
          <Route path="/staff-login" element={<StaffLogin onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
