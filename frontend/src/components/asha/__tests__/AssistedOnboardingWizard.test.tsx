import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssistedOnboardingWizard from '../AssistedOnboardingWizard';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

global.fetch = vi.fn();

describe('AssistedOnboardingWizard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (global as any).mockFetchJson({ id: 'new-p-1' });
  });

  it('renders the initial registration form', () => {
    render(<AssistedOnboardingWizard />);
    expect(screen.getByText('asha.patient_registration')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.full_name')).toBeInTheDocument();
  });

  it('shows guardian details when selected', async () => {
    render(<AssistedOnboardingWizard />);
    
    const noPhoneCheckbox = screen.getByLabelText('asha.no_phone_notice');
    fireEvent.click(noPhoneCheckbox);
    
    expect(screen.getByText('asha.guardian_required')).toBeInTheDocument();
    expect(screen.getByLabelText('asha.guardian_name')).toBeInTheDocument();
  });

  it('prefills and disables the phone field when passed in query params', async () => {
    // Populate query param mock phone
    mockSearchParams = new URLSearchParams('phone=9876543210');

    render(<AssistedOnboardingWizard />);

    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput.value).toBe('9876543210');
    expect(phoneInput).toBeDisabled();

    const noPhoneCheckbox = screen.getByLabelText('asha.no_phone_notice') as HTMLInputElement;
    expect(noPhoneCheckbox).toBeDisabled();
  });
});
