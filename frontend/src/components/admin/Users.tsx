import React from 'react';
import { Users as UsersIcon, PlusCircle } from 'lucide-react';

const Users: React.FC = () => {
  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">User Account Credentials</h1>
          <p className="text-neutral-500 text-sm mt-1">Audit security roles, practitioner registrations, and administrative portal keys.</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <UsersIcon size={30} className="stroke-[2.25]" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">User Management Console</h2>
        <p className="text-neutral-500 text-sm mt-1 max-w-sm">Manage, authorize, and audit credential layers for clinicians, pharmacists, and health assistants.</p>
        
        <button className="mt-6 flex items-center gap-2 bg-primary hover:bg-primary-700 active:scale-[0.98] transition-all text-white font-bold text-sm px-6 py-3 rounded-full shadow-md shadow-primary/10">
          <PlusCircle size={14} />
          <span>Register New Portal User</span>
        </button>
      </div>
    </div>
  );
};

export default Users;
