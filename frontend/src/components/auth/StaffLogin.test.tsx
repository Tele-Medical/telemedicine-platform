import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffLogin from './StaffLogin';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../api/services';

vi.mock('../../api/services', () => ({
  authService: {
    loginStaff: vi.fn(),
  }
}));

describe('StaffLogin Component', () => {
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
    global.localStorage = localStorageMock as unknown as Storage;
  });

  it('renders username and password inputs initially', () => {
    render(<StaffLogin onLogin={vi.fn()} />);
    expect(screen.getByText(/Staff Portal/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('shows validation errors when fields are invalid and submit is clicked', async () => {
    render(<StaffLogin onLogin={vi.fn()} />);
    const submitButton = screen.getByRole('button', { name: /Login/i });

    // Click submit with empty fields
    fireEvent.click(submitButton);

    expect(screen.getByText(/Username must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('calls authService.loginStaff and onLogin callback on successful submit', async () => {
    const handleLogin = vi.fn();
    const mockToken = 'mock_jwt_token';
    vi.mocked(authService.loginStaff).mockResolvedValueOnce({
      access_token: mockToken,
      refresh_token: 'mock_refresh_token',
      token_type: 'bearer'
    });

    render(<StaffLogin onLogin={handleLogin} />);

    const usernameInput = screen.getByPlaceholderText(/Enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const submitButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'dr_sharma' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.loginStaff).toHaveBeenCalledWith('dr_sharma', 'password123');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', mockToken);
      expect(handleLogin).toHaveBeenCalled();
    });
  });

  it('displays API error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    vi.mocked(authService.loginStaff).mockRejectedValueOnce(new Error(errorMessage));

    render(<StaffLogin onLogin={vi.fn()} />);

    const usernameInput = screen.getByPlaceholderText(/Enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const submitButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'invalid_user' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
