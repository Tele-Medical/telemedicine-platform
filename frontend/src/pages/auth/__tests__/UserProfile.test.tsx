import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserProfile from '../UserProfile';

global.fetch = vi.fn();

describe('UserProfile Component', () => {
  it('displays a loading state initially', () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    
    render(<UserProfile />);
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it('renders user details when fetched successfully', async () => {
    const mockUser = {
      name: 'Dr. Jane Smith',
      role: 'doctor',
      email: 'jane.smith@telemed.org',
      hospitalId: 'HOSP-101',
    };
    
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });
    
    render(<UserProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('doctor')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@telemed.org')).toBeInTheDocument();
    });
  });

  it('handles error states if fetching fails', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });
    
    render(<UserProfile />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
    });
  });
});
