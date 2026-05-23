/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { db } from '../db/db';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export interface Conflict {
  conflict_id: string;
  entity_type: string;
  local_data: Record<string, unknown>;
  server_data: Record<string, unknown>;
}

interface SyncContextType {
  isSyncing: boolean;
  conflicts: Conflict[];
  resolveConflict: (conflictId: string, resolution: 'keep_local' | 'keep_server', mergedData?: Record<string, unknown>) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLock = useRef(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const processOutbox = useCallback(async () => {
    if (syncLock.current) return;
    syncLock.current = true;
    setIsSyncing(true);

    try {
      const operations = await db.outbox.toArray();
      if (operations.length === 0) {
        setIsSyncing(false);
        syncLock.current = false;
        return;
      }

      for (const op of operations) {
        const response = await fetch('/api/v1/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations: [op] })
        });

        if (response.ok) {
          await db.outbox.delete(op.id!);
        } else if (response.status === 409) {
          const errorData = await response.json();
          const { server_data, local_payload, base_data } = errorData;
          
          // Smart Auto-Resolution Logic (3-way merge)
          let hasOverlappingChanges = true;
          
          if (base_data) {
            hasOverlappingChanges = Object.keys(local_payload).some(key => {
              const serverChangedIt = server_data[key] !== base_data[key];
              const localChangedIt = local_payload[key] !== base_data[key];
              return serverChangedIt && localChangedIt; // True conflict
            });
          }

          if (!hasOverlappingChanges) {
            // Auto merge: Apply local changes on top of server data
            const merged_payload = { ...server_data, ...local_payload };
            
            await fetch(`/api/v1/sync/conflicts/${op.operation_id}/resolve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ strategy: 'auto_merge', merged_payload })
            });
            await db.outbox.delete(op.id!);
          } else {
            // Surface real conflict
            setConflicts(prev => [...prev, {
              conflict_id: op.operation_id,
              entity_type: op.entity_type,
              local_data: local_payload,
              server_data: server_data
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setIsSyncing(false);
      syncLock.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      processOutbox();
    }
  }, [isOnline, processOutbox]);

  const resolveConflict = async (conflictId: string, resolution: 'keep_local' | 'keep_server', mergedData?: Record<string, unknown>) => {
    await fetch(`/api/v1/sync/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: resolution, merged_payload: mergedData })
    });
    
    setConflicts(prev => prev.filter(c => c.conflict_id !== conflictId));
    // Remove from outbox
    const ops = await db.outbox.where('operation_id').equals(conflictId).toArray();
    for (const op of ops) {
      await db.outbox.delete(op.id!);
    }
  };

  return (
    <SyncContext.Provider value={{ isSyncing, conflicts, resolveConflict }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
