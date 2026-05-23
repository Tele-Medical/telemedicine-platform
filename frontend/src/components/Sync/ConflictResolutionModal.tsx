import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Conflict } from '../../contexts/SyncContext';

interface Props {
  conflict: Conflict;
  onResolve: (conflictId: string, resolution: 'keep_local' | 'keep_server', mergedData?: Record<string, unknown>) => void;
}

export function ConflictResolutionModal({ conflict, onResolve }: Props) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the modal container on mount for keyboard usability
    modalRef.current?.focus();
  }, []);

  return (
    <div 
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-desc"
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 outline-none z-50 text-neutral-900 font-sans"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-neutral-200 animate-scale-up">
        <h2 id="dialog-title" className="text-xl font-bold mb-4 text-danger">
          Data Conflict Detected
        </h2>
        <p id="dialog-desc" className="text-neutral-500 mb-6 font-medium">
          Another user modified this {conflict.entity_type} while you were offline. Please choose which version to keep.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="border border-primary/20 rounded-2xl p-5 bg-primary/5">
            <h3 className="font-bold text-primary mb-3 uppercase tracking-wider text-xs">{t('sync.local_changes')}</h3>
            <pre className="text-[10px] overflow-auto p-3 bg-white rounded-xl border border-primary/10 h-40 font-mono shadow-inner">
              {JSON.stringify(conflict.local_data, null, 2)}
            </pre>
            <button
              onClick={() => onResolve(conflict.conflict_id, 'keep_local', conflict.local_data)}
              className="mt-4 w-full bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:bg-primary-700 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30 shadow-md shadow-primary/10 active:scale-[0.98]"
              aria-label="Keep your local offline modifications"
            >
              Keep Local
            </button>
          </div>

          <div className="border border-warning/20 rounded-2xl p-5 bg-warning/5">
            <h3 className="font-bold text-warning-700 mb-3 uppercase tracking-wider text-xs">{t('sync.server_data')}</h3>
            <pre className="text-[10px] overflow-auto p-3 bg-white rounded-xl border border-warning/10 h-40 font-mono shadow-inner">
              {JSON.stringify(conflict.server_data, null, 2)}
            </pre>
            <button
              onClick={() => onResolve(conflict.conflict_id, 'keep_server', conflict.server_data)}
              className="mt-4 w-full bg-warning-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-warning-700 transition-all outline-none focus-visible:ring-2 focus-visible:ring-warning/30 shadow-md shadow-warning/10 active:scale-[0.98]"
              aria-label="Overwrite local changes with server data"
            >
              Keep Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
