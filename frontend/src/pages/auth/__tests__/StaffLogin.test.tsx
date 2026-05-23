import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffLogin from '../StaffLogin';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api/services', () => ({
  authService: {
    loginStaff: vi.fn(),
  },
}));

import { authService } from '../../../api/services';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('StaffLogin Component', () => {
  it('renders username and password input fields', () => {
    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty fields on submit', async () => {
    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits valid data, stores JWT, and redirects on success', async () => {
    (authService.loginStaff as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      access_token: 'mock-jwt-token',
      role: 'doctor',
    });

    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'doctor1' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepass123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(authService.loginStaff).toHaveBeenCalledWith('doctor1', 'securepass123');
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(localStorage.getItem('role')).toBe('doctor');
      expect(mockNavigate).toHaveBeenCalledWith('/doctor/dashboard');
    });
  });

  it('shows error message on login failure', async () => {
    (authService.loginStaff as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'baduser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'badpass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
