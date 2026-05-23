import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MedicineStock {
  id: string;
  name: string;
  category: string;
  stock: number;
  minRequired: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

const Inventory: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [items] = useState<MedicineStock[]>([
    { id: 'M001', name: 'Paracetamol 650mg', category: 'Analgesic / Antipyretic', stock: 1200, minRequired: 500, status: 'In Stock' },
    { id: 'M002', name: 'Metronidazole 400mg', category: 'Antibiotic', stock: 140, minRequired: 300, status: 'Low Stock' },
    { id: 'M003', name: 'Amlodipine 5mg', category: 'Antihypertensive', stock: 850, minRequired: 200, status: 'In Stock' },
    { id: 'M004', name: 'Salbutamol Inhaler 100mcg', category: 'Bronchodilator', stock: 0, minRequired: 50, status: 'Out of Stock' },
  ]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in pb-12 text-neutral-900">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('nav.inventory')}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t('pharmacy.meds_desc')}</p>
      </header>

      {/* Search Bar */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('nav.search')}
          aria-label="Search inventory items"
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-neutral-900 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">{t('pharmacy.inventory_ledger')}</h2>
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 text-center shadow-sm">
            <p className="text-neutral-500 text-sm font-semibold">No items found matching "{searchQuery}"</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">{item.name}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    item.status === 'In Stock' 
                      ? 'bg-success/10 text-success border-success/20' 
                      : item.status === 'Low Stock' 
                        ? 'bg-warning/10 text-warning border-warning/20' 
                        : 'bg-danger/10 text-danger border-danger/20'
                  }`}>
                    {item.status === 'In Stock' ? t('pharmacy.in_stock') : item.status === 'Low Stock' ? t('pharmacy.low_stock') : t('pharmacy.out_of_stock', 'Out of Stock')}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 font-semibold">{item.category} • SKU: {item.id}</p>
              </div>

              <div className="flex items-center gap-6 border-t sm:border-t-0 border-neutral-100 pt-3.5 sm:pt-0 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">{t('pharmacy.stock_level')}</span>
                  <span className="text-sm font-bold text-neutral-800">{item.stock} Units</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 font-black tracking-wider uppercase block">{t('pharmacy.min_required')}</span>
                  <span className="text-sm font-bold text-neutral-500">{item.minRequired} Units</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Inventory;
