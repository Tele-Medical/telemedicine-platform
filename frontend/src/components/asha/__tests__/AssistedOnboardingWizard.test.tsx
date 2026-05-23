import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssistedOnboardingWizard from '../AssistedOnboardingWizard';

global.fetch = vi.fn();

describe('AssistedOnboardingWizard Component', () => {
  it('renders the initial registration form', () => {
    render(<AssistedOnboardingWizard />);
    expect(screen.getByText('asha.patient_registration')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.full_name')).toBeInTheDocument();
  });

  it('shows guardian details when selected', () => {
    render(<AssistedOnboardingWizard />);
    
    const noPhoneCheckbox = screen.getByLabelText('asha.no_phone_notice');
    fireEvent.click(noPhoneCheckbox);
    
    expect(screen.getByText('asha.guardian_required')).toBeInTheDocument();
    expect(screen.getByLabelText('asha.guardian_name')).toBeInTheDocument();
  });

  it('submits registration successfully', async () => {
    (global as any).mockFetchJson({ id: 'new-p-1' });

    render(<AssistedOnboardingWizard />);
    
    fireEvent.change(screen.getByLabelText('auth.full_name'), { target: { value: 'John Smith' } });
    fireEvent.click(screen.getByRole('button', { name: 'nav.next' }));

    await waitFor(() => {
      expect(screen.getByText('asha.reg_complete')).toBeInTheDocument();
    });
  });
});
