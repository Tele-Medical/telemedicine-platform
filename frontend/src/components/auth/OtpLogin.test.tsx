
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OtpLogin from './OtpLogin';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/services', () => ({
  authService: {
    requestOtp: vi.fn().mockResolvedValue({}),
    verifyOtp: vi.fn().mockResolvedValue({ access_token: 'fake_token' }),
  }
}));

describe('OtpLogin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    global.localStorage = localStorageMock as any;
  });
  it('renders phone input view initially', () => {
    render(<OtpLogin onLogin={vi.fn()} />);
    expect(screen.getByText(/Welcome to Telemedicine/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your mobile number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request OTP/i })).toBeInTheDocument();
  });

  it('transitions to OTP input view after requesting OTP', async () => {
    render(<OtpLogin onLogin={vi.fn()} />);
    
    const input = screen.getByPlaceholderText(/Enter your mobile number/i);
    const button = screen.getByRole('button', { name: /Request OTP/i });

    // Enter a valid phone number
    fireEvent.change(input, { target: { value: '9876543210' } });
    fireEvent.click(button);

    // Should now show OTP input view
    await waitFor(() => {
      expect(screen.getByText(/Enter OTP/i)).toBeInTheDocument();
    });
    
    // There should be 6 inputs for a 6-digit OTP
    const otpInputs = screen.getAllByRole('textbox');
    expect(otpInputs).toHaveLength(6);
    expect(screen.getByRole('button', { name: /Verify & Login/i })).toBeInTheDocument();
  });

  it('calls onLogin with the entered OTP', async () => {
    const handleLogin = vi.fn();
    render(<OtpLogin onLogin={handleLogin} />);
    
    // Go to OTP step
    fireEvent.change(screen.getByPlaceholderText(/Enter your mobile number/i), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: /Request OTP/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enter OTP/i)).toBeInTheDocument();
    });

    // Enter OTP
    const otpInputs = screen.getAllByRole('textbox');
    fireEvent.change(otpInputs[0], { target: { value: '1' } });
    fireEvent.change(otpInputs[1], { target: { value: '2' } });
    fireEvent.change(otpInputs[2], { target: { value: '3' } });
    fireEvent.change(otpInputs[3], { target: { value: '4' } });
    fireEvent.change(otpInputs[4], { target: { value: '5' } });
    fireEvent.change(otpInputs[5], { target: { value: '6' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Verify & Login/i }));

    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledWith('123456');
    });
  });
});
