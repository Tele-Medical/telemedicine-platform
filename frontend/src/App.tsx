import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import OtpLogin from './components/auth/OtpLogin';
import PatientDashboard from './components/dashboard/PatientDashboard';
import TeleconsultationRoom from './components/consultation/TeleconsultationRoom';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = (otp: string) => {
    console.log('Logged in with OTP:', otp);
    setIsAuthenticated(true);
  };

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <AppShell>
          <Routes>
            <Route path="/" element={<PatientDashboard />} />
            <Route path="/consultation" element={<TeleconsultationRoom />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      ) : (
        <Routes>
          <Route path="/login" element={<OtpLogin onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
