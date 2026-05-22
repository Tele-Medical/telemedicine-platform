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
    expect(screen.getByText(/Complete Your Profile/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Language/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Profile/i })).toBeInTheDocument();
  });

  it('enforces character minimum length on submission', async () => {
    render(<RegisterProfile onComplete={vi.fn()} />);
    
    const input = screen.getByPlaceholderText(/Enter your name/i);
    const button = screen.getByRole('button', { name: /Complete Profile/i });

    // Try a 1 character name (button is disabled if length < 2, but let's test typing and error message)
    fireEvent.change(input, { target: { value: 'A' } });
    expect(button).toBeDisabled();

    // Enable by entering more text, then trim it to a single character and try to submit
    fireEvent.change(input, { target: { value: 'A ' } });
    // Directly submit form
    const form = screen.getByPlaceholderText(/Enter your name/i).closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid full name/i)).toBeInTheDocument();
    });
  });

  it('calls updateProfile and onComplete callback on successful registration', async () => {
    const handleComplete = vi.fn();
    const { authService } = await import('../../api/services');
    
    render(<RegisterProfile onComplete={handleComplete} />);
    
    const input = screen.getByPlaceholderText(/Enter your name/i);
    const button = screen.getByRole('button', { name: /Complete Profile/i });

    fireEvent.change(input, { target: { value: 'Aditya' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(authService.updateProfile).toHaveBeenCalledWith('Aditya', 'pa');
      expect(handleComplete).toHaveBeenCalled();
    });
  });
});
