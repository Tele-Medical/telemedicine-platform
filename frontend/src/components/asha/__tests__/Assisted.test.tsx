import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Assisted from '../Assisted';

describe('Assisted Component (ASHA Worker Dashboard)', () => {
  it('renders dashboard with correct layout and title keys', () => {
    render(
      <MemoryRouter>
        <Assisted />
      </MemoryRouter>
    );

    // Verify branding and welcome titles
    expect(screen.getByText(/Sanjeevani Partner/i)).toBeInTheDocument();
    
    // Verify critical elements and quick actions are rendered
    expect(screen.getByText('asha.assigned_worker')).toBeInTheDocument();
    expect(screen.getByText('asha.assisted_desc')).toBeInTheDocument();
    expect(screen.getByText('asha.new_registration')).toBeInTheDocument();
    expect(screen.getByText('asha.collect_vitals')).toBeInTheDocument();
    expect(screen.getByText('asha.active_checks')).toBeInTheDocument();
  });
});
