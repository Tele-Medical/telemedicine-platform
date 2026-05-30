import React, { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, PackageCheck, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/client';

interface DemandItem {
  medicine_id: string;
  medicine_name: string;
  total_local_demand: number;
}

export const DemandForecast: React.FC = () => {
  const [demand, setDemand] = useState<DemandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDemand = async () => {
      try {
        const data = await apiClient('/pharmacy/demand-forecast');
        setDemand(data);
      } catch (_err) {
        setError('Failed to load demand forecast.');
      } finally {
        setLoading(false);
      }
    };
    fetchDemand();
  }, []);

  if (loading) return <div className="p-8 text-center animate-pulse text-neutral-500">Aggregating local demand...</div>;
  if (error) return <div className="p-4 bg-danger/10 text-danger rounded-xl flex items-center gap-2"><AlertCircle size={18} /> {error}</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mt-6 animate-fade-in">
      <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" />
            Local Demand Forecast
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time aggregation of pending prescriptions in your area. Completely anonymized.
          </p>
        </div>
        <div className="text-xs font-bold px-3 py-1 bg-white text-indigo-700 border border-indigo-200 rounded-full shadow-sm">
          Live Updates
        </div>
      </div>
      
      {demand.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 flex flex-col items-center">
          <PackageCheck size={32} className="mb-2 opacity-50" />
          <p>No active prescription demand in your area right now.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-3">Medicine (Formulary)</th>
                <th className="px-6 py-3 text-right">Total Pending Demand</th>
                <th className="px-6 py-3 text-center">Status Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {demand.map((item) => (
                <tr key={item.medicine_id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-neutral-900">{item.medicine_name}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-neutral-100 text-neutral-800 rounded-lg font-black font-mono">
                      {item.total_local_demand} units
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.total_local_demand > 50 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                        <AlertTriangle size={14} /> High Demand
                      </span>
                    ) : item.total_local_demand > 20 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                        Moderate
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                        <PackageCheck size={14} /> Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
