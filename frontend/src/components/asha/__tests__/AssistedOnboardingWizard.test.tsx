import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssistedOnboardingWizard from '../AssistedOnboardingWizard';

vi.mock('../../../repositories/PatientRepository', () => ({
  PatientRepository: {
    save: vi.fn().mockResolvedValue({}),
  },
}));

import { PatientRepository } from '../../../repositories/PatientRepository';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AssistedOnboardingWizard Component', () => {
  it('renders the first step of the onboarding form', () => {
    render(<AssistedOnboardingWizard />);
    expect(screen.getByText(/patient registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('shows guardian details when "patient has no phone" is selected', async () => {
    render(<AssistedOnboardingWizard />);
    
    const noPhoneCheckbox = screen.getByLabelText(/patient does not have a personal phone/i);
    fireEvent.click(noPhoneCheckbox);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/guardian name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/guardian phone number/i)).toBeInTheDocument();
    });
  });

  it('validates required fields before moving to next step', async () => {
    render(<AssistedOnboardingWizard />);
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    });
  });

  it('calls PatientRepository.save on successful submission', async () => {
    render(<AssistedOnboardingWizard />);
    
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test Patient' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(PatientRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Test Patient',
          has_phone: true,
        })
      );
    });
  });
});
