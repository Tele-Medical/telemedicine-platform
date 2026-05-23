import React, { useEffect, useState } from 'react';

interface User {
  name: string;
  role: string;
  email: string;
  hospitalId: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/v1/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-red-500">Failed to load profile. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-lg shadow-md border border-gray-100">
      <div className="flex items-center mb-8 border-b pb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-sm">
          {user.name.charAt(0)}
        </div>
        <div className="ml-6">
          <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
          <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mt-1">{user.role}</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Address</h3>
          <p className="mt-1 text-gray-900 font-medium">{user.email}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hospital ID</h3>
          <p className="mt-1 text-gray-900 font-medium">{user.hospitalId}</p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
