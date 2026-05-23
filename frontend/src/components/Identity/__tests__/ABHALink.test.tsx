import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ABHALink } from '../ABHALink';

global.fetch = vi.fn();

describe('ABHALink', () => {
  it('should render step 1', () => {
    render(<ABHALink patientId="p-1" />);
    expect(screen.getByPlaceholderText('profile.abha_placeholder')).toBeInTheDocument();
  });

  it('moves to Step 2 after search', async () => {
    (global as any).mockFetchJson({ txnId: '123' });
    render(<ABHALink patientId="p-1" />);
    fireEvent.change(screen.getByPlaceholderText('profile.abha_placeholder'), { target: { value: 'test@sbx' } });
    fireEvent.click(screen.getByRole('button', { name: 'nav.search' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('auth.enter_otp')).toBeInTheDocument();
    });
  });
});
