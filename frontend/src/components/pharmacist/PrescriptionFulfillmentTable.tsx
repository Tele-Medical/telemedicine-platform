import React, { useEffect, useState } from 'react';

interface Prescription {
  id: string;
  patientName: string;
  status: string;
  medications: string[];
}

const PrescriptionFulfillmentTable: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const response = await fetch('/api/v1/fulfillments/prescriptions');
        if (response.ok) {
          const data = await response.json();
          setPrescriptions(data);
        }
      } catch (e) {
        console.error('Failed to load prescriptions', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPrescriptions();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await fetch(`/api/v1/fulfillments/prescription/${id}/accept`, {
        method: 'POST'
      });
      setPrescriptions(prescriptions.map(p => 
        p.id === id ? { ...p, status: 'fulfilled' } : p
      ));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-white rounded-lg border border-gray-200 mt-6">
        <p className="text-gray-500 font-medium">Loading pending prescriptions...</p>
      </div>
    );
  }

  const pendingCount = prescriptions.filter(p => p.status === 'pending').length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Pending Prescriptions</h3>
          <p className="text-sm text-gray-500 mt-1">Prescriptions awaiting pharmacist review</p>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${pendingCount > 0 ? 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
          {pendingCount} Action Required
        </span>
      </div>
      
      {prescriptions.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white">
          <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium text-gray-600">You're all caught up!</p>
          <p className="text-sm mt-1">No prescriptions currently need fulfillment.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 bg-white">
          {prescriptions.map(p => (
            <div key={p.id} className="p-6 hover:bg-blue-50/30 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="font-bold text-gray-900 text-xl mr-3">{p.patientName}</h4>
                    {p.status === 'pending' && <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wide">New</span>}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-4 bg-gray-100 inline-block px-2 py-1 rounded">ID: {p.id}</p>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm max-w-xl">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 mb-3">Medications Requested</h5>
                    <ul className="space-y-2">
                      {p.medications.map((med, idx) => (
                        <li key={idx} className="text-sm font-bold text-gray-800 flex items-center">
                          <svg className="h-4 w-4 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                          {med}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="flex flex-col items-end ml-4">
                  {p.status === 'pending' ? (
                    <button 
                      onClick={() => handleAccept(p.id)}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-transform hover:scale-105 shadow-md shadow-green-600/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Accept & Dispense
                    </button>
                  ) : (
                    <div className="bg-green-50 text-green-800 text-sm font-bold px-5 py-3 rounded-lg border border-green-200 flex items-center shadow-sm">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                      Fulfilled
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrescriptionFulfillmentTable;
