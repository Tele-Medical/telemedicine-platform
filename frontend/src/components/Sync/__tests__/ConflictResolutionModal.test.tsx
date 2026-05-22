import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictResolutionModal } from '../ConflictResolutionModal';
import { vi, describe, it, expect } from 'vitest';

describe('ConflictResolutionModal', () => {
  const mockConflict = {
    conflict_id: 'c-1',
    entity_type: 'patients',
    local_data: { phone: '9999999999' },
    server_data: { phone: '1111111111' }
  };

  it('should render side-by-side data', () => {
    render(<ConflictResolutionModal conflict={mockConflict} onResolve={vi.fn()} />);
    
    expect(screen.getByText(/9999999999/)).toBeInTheDocument(); // Local
    expect(screen.getByText(/1111111111/)).toBeInTheDocument(); // Server
  });

  it('should call onResolve with keep_local when Keep Local is clicked', () => {
    const onResolve = vi.fn();
    render(<ConflictResolutionModal conflict={mockConflict} onResolve={onResolve} />);
    
    fireEvent.click(screen.getByText('Keep Local'));
    expect(onResolve).toHaveBeenCalledWith('c-1', 'keep_local', mockConflict.local_data);
  });
});
