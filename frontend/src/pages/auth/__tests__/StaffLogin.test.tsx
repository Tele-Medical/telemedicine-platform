import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import StaffLogin from '../StaffLogin';
import { authService } from '../../../api/services';

// Mock the authService
vi.mock('../../../api/services', () => ({
  authService: {
    loginStaff: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('StaffLogin Page', () => {
  it('renders the staff login form', () => {
    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );
    expect(screen.getByText(/auth.staff_portal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth.username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth.password/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );
    
    const submitButton = screen.getByRole('button', { name: /auth.login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/auth.username_required/i)).toBeInTheDocument();
      expect(screen.getByText(/auth.password_required/i)).toBeInTheDocument();
    });
  });

  it('successfully logs in a doctor and redirects to root', async () => {
    const mockResponse = { access_token: 'mock-jwt-token', role: 'doctor' };
    (authService.loginStaff as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/auth.username/i), { target: { value: 'doctor1' } });
    fireEvent.change(screen.getByLabelText(/auth.password/i), { target: { value: 'securepass123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /auth.login/i }));

    await waitFor(() => {
      expect(authService.loginStaff).toHaveBeenCalledWith('doctor1', 'securepass123');
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(localStorage.getItem('role')).toBe('doctor');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on login failure', async () => {
    (authService.loginStaff as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

    render(
      <BrowserRouter>
        <StaffLogin />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
