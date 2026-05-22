import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoginContainer from './components/auth/LoginContainer';
import PatientDashboard from './components/dashboard/PatientDashboard';
import TeleconsultationRoom from './components/consultation/TeleconsultationRoom';
import { authService } from './api/services';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(!!localStorage.getItem('token'));

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
        .then((profile) => {
          if (active) {
            setUserRole(profile.default_role || 'patient');
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
      setUserRole(null);
      setLoadingProfile(false);
    }
    return () => { active = false; };
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#6B8E7B]/30 border-t-[#6B8E7B] rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm animate-pulse">Loading secure portal...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <AppShell onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<PatientDashboard />} />
            <Route path="/consultation" element={<TeleconsultationRoom userRole={userRole || 'patient'} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginContainer onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
