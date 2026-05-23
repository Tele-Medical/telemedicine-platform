import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AppShell from '../AppShell';
import TopBar from '../TopBar';
import OfflineBadge from '../OfflineBadge';

describe('AppShell Components', () => {
  describe('OfflineBadge', () => {
    it('renders warning when offline', () => {
      render(<OfflineBadge isOffline={true} syncStatus="synced" />);
      expect(screen.getByText('app.offline_notice')).toBeInTheDocument();
    });
  });

  describe('TopBar', () => {
    it('renders the application title', () => {
      render(
        <BrowserRouter>
          <TopBar isOffline={false} syncStatus="synced" />
        </BrowserRouter>
      );
      expect(screen.getByText('app.title')).toBeInTheDocument();
    });
  });

  describe('AppShell', () => {
    it('renders children', () => {
      render(
        <BrowserRouter>
          <AppShell isOffline={false} syncStatus="synced">
            <div data-testid="main-content">Content</div>
          </AppShell>
        </BrowserRouter>
      );
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });
  });
});
