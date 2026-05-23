import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';

const StockForms: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'intake' | 'adjustment'>('intake');
  const [formData, setFormData] = useState({ medicineName: '', quantity: '' });
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineName || !formData.quantity) return;

    setStatus('saving');
    const endpoint = activeTab === 'intake' 
      ? '/inventory/stock-intake' 
      : '/inventory/stock-adjustment';

    try {
      await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setFormData({ medicineName: '', quantity: '' });
      }, 2000);
    } catch {
      console.error('Failed to update stock');
      setStatus('idle');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6 max-w-2xl text-neutral-900 font-sans">
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('intake')}
          className={`flex-1 py-4 px-4 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'intake' 
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-[0_-2px_0_0_rgba(37,99,235,1)] z-10' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-t-2 border-transparent'
          }`}
        >
          {t('pharmacy.intake')}
        </button>
        <button
          onClick={() => setActiveTab('adjustment')}
          className={`flex-1 py-4 px-4 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'adjustment' 
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-[0_-2px_0_0_rgba(37,99,235,1)] z-10' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-t-2 border-transparent'
          }`}
        >
          {t('pharmacy.adjustment')}
        </button>
      </div>

      <div className="p-8">
        {status === 'success' ? (
          <div className="py-8 text-center text-green-600 bg-green-50 rounded-lg border border-green-200 animate-fadeIn shadow-sm">
            <svg className="mx-auto h-12 w-12 text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-bold text-lg text-green-900">{t('pharmacy.stock_updated')}</p>
            <p className="text-sm text-green-700 mt-1">{t('pharmacy.ledger_refreshed')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
              <p className="text-sm text-blue-800 font-medium">
                {activeTab === 'intake' 
                  ? t('pharmacy.intake_desc') 
                  : t('pharmacy.adjustment_desc')}
              </p>
            </div>
            
            <div>
              <label htmlFor="medicineName" className="block text-sm font-bold text-gray-700 mb-2">{t('pharmacy.medicine_name')}</label>
              <input
                id="medicineName"
                type="text"
                value={formData.medicineName}
                onChange={e => setFormData(prev => ({...prev, medicineName: e.target.value}))}
                className="block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                placeholder={t('pharmacy.medicine_name')}
                disabled={status === 'saving'}
              />
            </div>
            
            <div>
              <label htmlFor="quantity" className="block text-sm font-bold text-gray-700 mb-2">
                {activeTab === 'intake' ? t('pharmacy.qty_received') : t('pharmacy.adj_amount')}
              </label>
              <input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={e => setFormData(prev => ({...prev, quantity: e.target.value}))}
                className="block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                placeholder={activeTab === 'intake' ? "500" : "-10"}
                disabled={status === 'saving'}
              />
              {activeTab === 'adjustment' && <p className="text-xs text-gray-500 mt-2 font-medium bg-gray-50 inline-block px-2 py-1 rounded">{t('pharmacy.negative_hint')}</p>}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={status === 'saving' || !formData.medicineName || !formData.quantity}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-300 shadow-sm flex justify-center items-center"
              >
                {status === 'saving' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('auth.sending')}
                  </>
                ) : t('nav.save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StockForms;
