import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, PackageCheck, Plus, Check, Edit2, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import { pharmacyService } from '../../api/services';

interface DemandItem {
  medicine_id: string;
  medicine_name: string;
  total_local_demand: number;
  current_stock: number;
}

const PrescriptionFulfillmentTable: React.FC = () => {
  const [data, setData] = useState<DemandItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Medicine State
  const [newMedName, setNewMedName] = useState('');
  const [addingMed, setAddingMed] = useState(false);

  // Edit Stock State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const result = await apiClient('/pharmacy/demand-forecast');
      setData(result || []);
    } catch (_err) {
      console.error('Failed to load supply/demand data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    setAddingMed(true);
    try {
      await pharmacyService.addToCatalog(newMedName.trim());
      setNewMedName('');
      await fetchData();
    } catch (_err) {
      alert("Failed to add medicine");
    } finally {
      setAddingMed(false);
    }
  };

  const handleSaveStock = async (medicine_id: string) => {
    const qty = parseInt(editValue, 10);
    if (isNaN(qty) || qty < 0) {
      alert("Please enter a valid quantity");
      return;
    }
    
    setSavingId(medicine_id);
    try {
      await pharmacyService.updateInventoryStock(medicine_id, qty);
      setData(prev => prev.map(item => item.medicine_id === medicine_id ? { ...item, current_stock: qty } : item));
      setEditingId(null);
    } catch (_err) {
      alert("Failed to update stock");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto mt-6">
      
      {/* Add New Medicine Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Plus className="text-indigo-600" /> Expand Formulary
          </h2>
          <p className="text-sm text-neutral-500">Add a new medicine to your tracking list</p>
        </div>
        <form onSubmit={handleAddMedicine} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="e.g. Ibuprofen 400mg" 
            value={newMedName}
            onChange={e => setNewMedName(e.target.value)}
            className="flex-1 md:w-64 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
            required
          />
          <button 
            type="submit" 
            disabled={addingMed}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {addingMed ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
        </form>
      </div>

      {/* Supply & Demand Hub */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" />
              Dynamic Supply Hub
            </h2>
            <p className="text-sm text-neutral-600 mt-1">Directly manage your inventory and monitor real-time patient demand.</p>
          </div>
          <button onClick={() => { setLoading(true); fetchData(); }} className="text-sm font-bold px-4 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors">
            Refresh Data
          </button>
        </div>

        {loading ? (
           <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-3">
             <Loader2 size={32} className="animate-spin text-indigo-500" />
             Aggregating local supply chain data...
           </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <PackageCheck size={48} className="mb-3 text-neutral-300" />
            <p className="text-lg font-medium text-neutral-600">No medicines in tracking list.</p>
            <p className="text-sm">Use the panel above to add medicines.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4">Medicine (Formulary)</th>
                  <th className="px-6 py-4 text-center">Local Demand</th>
                  <th className="px-6 py-4 text-center">Current Stock</th>
                  <th className="px-6 py-4 text-center">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((item) => {
                  const isShortage = item.total_local_demand > item.current_stock && item.total_local_demand > 0;
                  const isEditing = editingId === item.medicine_id;
                  
                  return (
                    <tr key={item.medicine_id} className={`transition-colors ${isShortage ? 'bg-red-50/30' : 'hover:bg-neutral-50'}`}>
                      <td className="px-6 py-4 font-bold text-neutral-900">{item.medicine_name}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-indigo-600">
                        {item.total_local_demand > 0 ? (
                          <span className="bg-indigo-100 px-2 py-1 rounded-md text-indigo-800">{item.total_local_demand} units</span>
                        ) : (
                          <span className="text-neutral-400">0 units</span>
                        )}
                      </td>
                      
                      {/* Editable Stock Cell */}
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 px-2 py-1 text-center font-mono font-bold border-2 border-indigo-500 rounded-md focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveStock(item.medicine_id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button 
                              onClick={() => handleSaveStock(item.medicine_id)}
                              disabled={savingId === item.medicine_id}
                              className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition-colors"
                            >
                              {savingId === item.medicine_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3 group">
                            <span className="font-mono font-bold text-neutral-700 text-lg">
                              {item.current_stock}
                            </span>
                            <button 
                              onClick={() => { setEditingId(item.medicine_id); setEditValue(item.current_stock.toString()); }}
                              className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                              title="Update Stock"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        {isShortage ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold animate-pulse shadow-sm">
                            <AlertTriangle size={14} /> Restock Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold shadow-sm">
                            <PackageCheck size={14} /> Stock Optimal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionFulfillmentTable;
