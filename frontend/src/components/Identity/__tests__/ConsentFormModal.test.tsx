import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsentFormModal } from '../ConsentFormModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ConsentFormModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should not allow submission until checkbox is checked', () => {
    render(<ConsentFormModal patientId="p-1" onComplete={vi.fn()} />);
    
    const submitBtn = screen.getByText('Agree & Continue');
    expect(submitBtn).toBeDisabled();

    const checkbox = screen.getByLabelText(/I consent to the storage/i);
    fireEvent.click(checkbox);
    
    expect(submitBtn).not.toBeDisabled();
  });

  it('should POST consent to API on submit', async () => {
    const onComplete = vi.fn();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' })
    });

    render(<ConsentFormModal patientId="p-1" onComplete={onComplete} />);
    
    fireEvent.click(screen.getByLabelText(/I consent to the storage/i));
    fireEvent.click(screen.getByText('Agree & Continue'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/patients/p-1/consents',
        expect.any(Object)
      );
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
