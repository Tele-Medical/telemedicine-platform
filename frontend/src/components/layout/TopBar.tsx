import React from 'react';
import OfflineBadge from './OfflineBadge';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/Sanjeevani.png';

interface TopBarProps {
  isOffline: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
  onLogout?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ isOffline, syncStatus, onLogout }) => {
  const { i18n, t } = useTranslation();

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  // Extract base language code (e.g., 'en-US' -> 'en')
  const currentLanguage = i18n.language ? i18n.language.split('-')[0] : 'en';

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-neutral-200 px-4 py-3 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2">
        <img src={logo} alt={`${t('app.title')} Logo`} className="w-8 h-8 object-contain" />
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{t('app.title')}</h1>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={currentLanguage}
          onChange={handleLangChange}
          className="px-3 py-1.5 border border-neutral-200 rounded-xl text-sm font-bold bg-neutral-50 hover:bg-neutral-100 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Select Language"
        >
          <option value="pa">{t('profile.lang_pa')}</option>
          <option value="hi">{t('profile.lang_hi')}</option>
          <option value="en">{t('profile.lang_en')}</option>
        </select>

        <OfflineBadge isOffline={isOffline} syncStatus={syncStatus} />
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 min-h-[40px] border border-danger-200 text-danger-600 rounded-xl text-sm font-semibold bg-danger-50/50 hover:bg-danger-50 hover:border-danger-300 transition-all duration-200 shadow-sm active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-danger-600/30"
          >
            {t('auth.logout')}
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;

