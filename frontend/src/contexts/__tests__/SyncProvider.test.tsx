import 'fake-indexeddb/auto';
import { render, screen, act } from '@testing-library/react';
import { SyncProvider, useSync } from '../SyncContext';
import { db } from '../../db/db';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock component to consume context
function TestComponent() {
  const { isSyncing, conflicts } = useSync();
  return (
    <div>
      <div data-testid="sync-status">{isSyncing ? 'Syncing' : 'Idle'}</div>
      <div data-testid="conflict-count">{conflicts.length}</div>
    </div>
  );
}

describe('SyncProvider', () => {
  beforeEach(async () => {
    await db.outbox.clear();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should push outbox items when online', async () => {
    // Add item to outbox
    await db.outbox.add({
      operation_id: '123',
      entity_type: 'patients',
      entity_id: 'p-1',
      action: 'CREATE',
      payload: { name: 'Test' },
      created_at: new Date().toISOString()
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ processed_count: 1 })
    });

    render(
      <SyncProvider>
        <TestComponent />
      </SyncProvider>
    );

    // Wait for sync to complete (it should run on mount since we are online)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // allow async effects
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/sync/push', expect.any(Object));
    
    // Outbox should be cleared
    const outboxCount = await db.outbox.count();
    expect(outboxCount).toBe(0);
  });

  it('should handle 409 conflict with smart auto-resolution (surface when real conflict)', async () => {
    await db.outbox.add({
      operation_id: '456',
      entity_type: 'patients',
      entity_id: 'p-1',
      action: 'UPDATE',
      payload: { phone: '9999999999' },
      created_at: new Date().toISOString()
    });

    // Mock 409 Conflict
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Conflict',
        server_data: { phone: '1111111111', allergies: 'Peanuts' },
        local_payload: { phone: '9999999999' },
        base_data: { phone: 'original-phone', allergies: 'Peanuts' } // Server changed phone! Local changed phone! OVERLAP!
      })
    });

    render(
      <SyncProvider>
        <TestComponent />
      </SyncProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Since the user tried to change the phone, and the server's phone is DIFFERENT from the base (it's a real conflict on the same field)
    // The conflict should be surfaced.
    expect(screen.getByTestId('conflict-count').textContent).toBe('1');
  });

  it('should auto-resolve if non-overlapping fields were changed', async () => {
    await db.outbox.add({
      operation_id: '789',
      entity_type: 'patients',
      entity_id: 'p-1',
      action: 'UPDATE',
      payload: { phone: '9999999999' },
      created_at: new Date().toISOString()
    });

    // Mock 409 Conflict where server ONLY changed allergies, not phone
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Conflict',
        server_data: { phone: 'original-phone', allergies: 'Peanuts' }, 
        local_payload: { phone: '9999999999' },
        base_data: { phone: 'original-phone', allergies: 'None' } // Server changed allergies. Local changed phone. NO OVERLAP!
      })
    });

    // Mock successful push after auto-resolution
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Resolved successfully' })
    });

    render(
      <SyncProvider>
        <TestComponent />
      </SyncProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Conflict should be 0 because it auto-resolved
    expect(screen.getByTestId('conflict-count').textContent).toBe('0');
    // Should have called the resolve endpoint
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/resolve'), expect.any(Object));
  });
});
