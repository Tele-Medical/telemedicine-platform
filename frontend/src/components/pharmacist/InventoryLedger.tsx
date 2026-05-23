import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, AlertCircle, RefreshCw } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  current_quantity: number;
  unit: string;
  expiry_date: string;
}

const InventoryLedger: React.FC = () => {
  const { t } = useTranslation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch
    setTimeout(() => {
      setInventory([
        { id: '1', name: 'Paracetamol 650mg', current_quantity: 1250, unit: 'Tablets', expiry_date: '2028-12-01' },
        { id: '2', name: 'Amlodipine 5mg', current_quantity: 420, unit: 'Tablets', expiry_date: '2027-06-15' },
        { id: '3', name: 'Novamox 500mg', current_quantity: 45, unit: 'Capsules', expiry_date: '2026-11-20' }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
        <RefreshCw size={24} className="animate-spin mb-2" />
        <p className="text-sm font-medium">{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in text-neutral-900">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">{t('pharmacy.inventory_ledger')}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 font-bold">{t('pharmacy.medicine_name')}</th>
              <th className="px-6 py-4 font-bold">{t('pharmacy.stock_level')}</th>
              <th className="px-6 py-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Pill size={16} className="text-primary" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold">{item.current_quantity}</span>
                  <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                </td>
                <td className="px-6 py-4">
                  {item.current_quantity > 100 ? (
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                      {t('pharmacy.in_stock')}
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-200 shadow-sm animate-pulse flex items-center gap-1 w-fit">
                      <AlertCircle size={10} />
                      {t('pharmacy.low_stock')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryLedger;
