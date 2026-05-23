import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StaffLogin from './StaffLogin';
import { authService } from '../../api/services';

// Mock the authService
vi.mock('../../api/services', () => ({
  authService: {
    loginStaff: vi.fn(),
  },
}));

describe('StaffLogin Component', () => {
  it('renders username and password inputs initially', () => {
    render(<StaffLogin onLogin={vi.fn()} />);
    expect(screen.getByText('auth.staff_portal')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.username')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
  });

  it('shows validation errors when fields are invalid', async () => {
    render(<StaffLogin onLogin={vi.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: 'auth.login' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('auth.username_required')).toBeInTheDocument();
      expect(screen.getByText('auth.password_required')).toBeInTheDocument();
    });
  });

  it('calls authService.loginStaff on successful submit', async () => {
    const handleLogin = vi.fn();
    const mockResponse = { access_token: 'mock-token' };
    (authService.loginStaff as any).mockResolvedValue(mockResponse);

    render(<StaffLogin onLogin={handleLogin} />);

    fireEvent.change(screen.getByLabelText('auth.username'), { target: { value: 'doctor1' } });
    fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'auth.login' }));

    await waitFor(() => {
      expect(authService.loginStaff).toHaveBeenCalledWith('doctor1', 'password123');
      expect(handleLogin).toHaveBeenCalled();
    });
  });
});
