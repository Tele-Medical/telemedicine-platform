import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterProfile from './RegisterProfile';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/services', () => ({
  authService: {
    updateProfile: vi.fn().mockResolvedValue({}),
  }
}));

describe('RegisterProfile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name input, language selector, and submit button', () => {
    render(<RegisterProfile onComplete={vi.fn()} />);
    expect(screen.getByText('auth.register_title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('auth.full_name')).toBeInTheDocument();
    expect(screen.getByLabelText('profile.primary_language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'auth.save_profile' })).toBeInTheDocument();
  });

  it('enforces character minimum length on submission', async () => {
    render(<RegisterProfile onComplete={vi.fn()} />);
    
    const input = screen.getByPlaceholderText('auth.full_name');
    const button = screen.getByRole('button', { name: 'auth.save_profile' });

    // Try a 1 character name (button is disabled if length < 2)
    fireEvent.change(input, { target: { value: 'A' } });
    expect(button).toBeDisabled();
  });

  it('calls updateProfile and onComplete callback on successful registration', async () => {
    const handleComplete = vi.fn();
    const { authService } = await import('../../api/services');
    
    render(<RegisterProfile onComplete={handleComplete} />);
    
    const input = screen.getByPlaceholderText('auth.full_name');
    const button = screen.getByRole('button', { name: 'auth.save_profile' });

    fireEvent.change(input, { target: { value: 'Aditya' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(authService.updateProfile).toHaveBeenCalledWith('Aditya', 'pa');
      expect(handleComplete).toHaveBeenCalled();
    });
  });
});
