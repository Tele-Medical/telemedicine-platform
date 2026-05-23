import React, { useEffect, useState } from 'react';

interface InventoryItem {
  id: string;
  medicineName: string;
  stockQuantity: number;
  unit: string;
}

const InventoryLedger: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/v1/pharmacies/availability');
        if (response.ok) {
          const data = await response.json();
          setInventory(data);
        }
      } catch (e) {
        console.error('Failed to load inventory', e);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 font-medium">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Inventory Ledger</h3>
          <p className="text-sm text-gray-500 mt-1">Real-time medication availability</p>
        </div>
        <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="text-xs text-gray-500 uppercase bg-white border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold">Medicine Name</th>
              <th className="px-6 py-4 font-bold">Stock Level</th>
              <th className="px-6 py-4 font-bold">Unit</th>
              <th className="px-6 py-4 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-500 font-medium">No inventory records found.</p>
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{item.medicineName}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold text-lg ${item.stockQuantity < 100 ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.stockQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{item.unit}</td>
                  <td className="px-6 py-4 text-right">
                    {item.stockQuantity > 100 ? (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">In Stock</span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-200 shadow-sm animate-pulse">Low Stock</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryLedger;
