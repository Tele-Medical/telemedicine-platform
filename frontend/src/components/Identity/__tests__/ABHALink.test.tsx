import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ABHALink } from '../ABHALink';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ABHALink', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should render step 1 (Search)', () => {
    render(<ABHALink patientId="p-1" />);
    expect(screen.getByPlaceholderText('Enter ABHA Address')).toBeInTheDocument();
  });

  it('should handle Invalid ABHA Address error (Case B)', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'ABHA Address not found' })
    });

    render(<ABHALink patientId="p-1" />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter ABHA Address'), { target: { value: 'invalid@abdm' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText('ABHA Address not found')).toBeInTheDocument();
    });
  });

  it('should handle Invalid OTP error (Case B)', async () => {
    // Mock Step 1 Search success
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    // Mock Step 1 Init-Auth success
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txnId: 'txn-123' })
    });

    // Mock Step 2 failure (Invalid OTP)
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Invalid OTP entered' })
    });

    render(<ABHALink patientId="p-1" />);
    
    // Step 1
    fireEvent.change(screen.getByPlaceholderText('Enter ABHA Address'), { target: { value: 'valid@abdm' } });
    fireEvent.click(screen.getByText('Search'));

    // Wait for Step 2 UI
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter OTP')).toBeInTheDocument();
    });

    // Step 2
    fireEvent.change(screen.getByPlaceholderText('Enter OTP'), { target: { value: '000000' } });
    fireEvent.click(screen.getByText('Verify'));

    await waitFor(() => {
      expect(screen.getByText('Invalid OTP entered')).toBeInTheDocument();
    });
  });
});
