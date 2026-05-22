import { render, screen, fireEvent } from '@testing-library/react';
import LoginContainer from './LoginContainer';
import { describe, it, expect, vi } from 'vitest';

// Mock sub-components so we test LoginContainer's toggle state in isolation
vi.mock('./OtpLogin', () => ({
  default: ({ onLogin }: { onLogin: () => void }) => (
    <div data-testid="otp-login">
      OtpLogin Component
      <button onClick={() => onLogin()}>Trigger Otp Login</button>
    </div>
  )
}));

vi.mock('./StaffLogin', () => ({
  default: ({ onLogin }: { onLogin: () => void }) => (
    <div data-testid="staff-login">
      StaffLogin Component
      <button onClick={onLogin}>Trigger Staff Login</button>
    </div>
  )
}));

describe('LoginContainer Component', () => {
  it('renders tab switcher and defaults to Patient Login', () => {
    render(<LoginContainer onLogin={vi.fn()} />);

    expect(screen.getByRole('tab', { name: /Patient Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Staff Portal/i })).toBeInTheDocument();
    expect(screen.getByTestId('otp-login')).toBeInTheDocument();
    expect(screen.queryByTestId('staff-login')).not.toBeInTheDocument();
  });

  it('switches to Staff Login when tab is clicked and back to Patient Login', () => {
    render(<LoginContainer onLogin={vi.fn()} />);

    const patientTab = screen.getByRole('tab', { name: /Patient Portal/i });
    const staffTab = screen.getByRole('tab', { name: /Staff Portal/i });

    // Switch to Staff
    fireEvent.click(staffTab);
    expect(screen.getByTestId('staff-login')).toBeInTheDocument();
    expect(screen.queryByTestId('otp-login')).not.toBeInTheDocument();

    // Switch back to Patient
    fireEvent.click(patientTab);
    expect(screen.getByTestId('otp-login')).toBeInTheDocument();
    expect(screen.queryByTestId('staff-login')).not.toBeInTheDocument();
  });

  it('passes onLogin callback correctly to sub-components', () => {
    const handleLogin = vi.fn();
    render(<LoginContainer onLogin={handleLogin} />);

    // Trigger on Patient
    fireEvent.click(screen.getByRole('button', { name: /Trigger Otp Login/i }));
    expect(handleLogin).toHaveBeenCalledTimes(1);

    // Switch to Staff and trigger
    fireEvent.click(screen.getByRole('tab', { name: /Staff Portal/i }));
    fireEvent.click(screen.getByRole('button', { name: /Trigger Staff Login/i }));
    expect(handleLogin).toHaveBeenCalledTimes(2);
  });
});
