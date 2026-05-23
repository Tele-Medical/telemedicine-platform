import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OtpLogin from './OtpLogin';
import { authService } from '../../api/services';

vi.mock('../../api/services', () => ({
  authService: {
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
  },
}));

describe('OtpLogin Component', () => {
  it('renders phone input initially', () => {
    render(<OtpLogin onLogin={vi.fn()} />);
    expect(screen.getByText('auth.phone_label')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'auth.request_otp' })).toBeInTheDocument();
  });

  it('moves to OTP step after requesting', async () => {
    (authService.requestOtp as any).mockResolvedValue({});
    render(<OtpLogin onLogin={vi.fn()} />);
    
    fireEvent.change(screen.getByPlaceholderText('auth.phone_placeholder'), { target: { value: '9800000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.request_otp' }));

    await waitFor(() => {
      expect(screen.getByText('auth.enter_otp')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'auth.verify_login' })).toBeInTheDocument();
    });
  });
});
