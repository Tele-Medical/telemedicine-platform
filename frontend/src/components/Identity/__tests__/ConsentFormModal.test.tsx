import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConsentFormModal } from '../ConsentFormModal';

global.fetch = vi.fn();

describe('ConsentFormModal', () => {
  it('disables the submit button until agreed', () => {
    render(<ConsentFormModal patientId="p-1" onComplete={vi.fn()} />);
    
    const submitBtn = screen.getByRole('button', { name: 'nav.next' });
    expect(submitBtn).toBeDisabled();

    const checkbox = screen.getByLabelText('clinical.consent_agree');
    fireEvent.click(checkbox);
    
    expect(submitBtn).not.toBeDisabled();
  });

  it('should POST consent to API on submit', async () => {
    const onComplete = vi.fn();
    (global as any).mockFetchJson({ status: 'success' });

    render(<ConsentFormModal patientId="p-1" onComplete={onComplete} />);
    
    fireEvent.click(screen.getByLabelText('clinical.consent_agree'));
    fireEvent.click(screen.getByRole('button', { name: 'nav.next' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
