import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Reset navigator.onLine to true before each test
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initially return navigator.onLine', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('should update status when offline event fires', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    act(() => {
      vi.stubGlobal('navigator', { onLine: false });
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOnline).toBe(false);
  });

  it('should update status when online event fires', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { result } = renderHook(() => useNetworkStatus());
    
    act(() => {
      vi.stubGlobal('navigator', { onLine: true });
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current.isOnline).toBe(true);
  });
});
