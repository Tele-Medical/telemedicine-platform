
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppShell from './AppShell';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import OfflineBadge from './OfflineBadge';
import { describe, it, expect, vi } from 'vitest';

describe('AppShell Components', () => {

  describe('OfflineBadge', () => {
    it('renders null when online and synced', () => {
      const { container } = render(<OfflineBadge isOffline={false} syncStatus="synced" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders offline warning when offline', () => {
      render(<OfflineBadge isOffline={true} syncStatus="synced" />);
      expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();
    });

    it('renders syncing indicator when pending', () => {
      render(<OfflineBadge isOffline={false} syncStatus="pending" />);
      expect(screen.getByText(/Syncing/i)).toBeInTheDocument();
    });
  });

  describe('TopBar', () => {
    it('renders the application title', () => {
      render(
        <BrowserRouter>
          <TopBar isOffline={false} syncStatus="synced" />
        </BrowserRouter>
      );
      expect(screen.getByText(/Telemedicine/i)).toBeInTheDocument();
    });

    it('renders the OfflineBadge within TopBar', () => {
      render(
        <BrowserRouter>
          <TopBar isOffline={true} syncStatus="synced" />
        </BrowserRouter>
      );
      expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();
    });

    it('renders logout button and triggers callback on click', () => {
      const handleLogout = vi.fn();
      render(
        <BrowserRouter>
          <TopBar isOffline={false} syncStatus="synced" onLogout={handleLogout} />
        </BrowserRouter>
      );
      
      const logoutButton = screen.getByRole('button', { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
      fireEvent.click(logoutButton);
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('BottomNav', () => {
    it('renders navigation links', () => {
      render(
        <BrowserRouter>
          <BottomNav />
        </BrowserRouter>
      );
      expect(screen.getByText(/Home/i)).toBeInTheDocument();
      expect(screen.getByText(/Records/i)).toBeInTheDocument();
      expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    });
  });

  describe('AppShell', () => {
    it('renders TopBar, BottomNav and children', () => {
      render(
        <BrowserRouter>
          <AppShell isOffline={false} syncStatus="synced">
            <div data-testid="main-content">Content</div>
          </AppShell>
        </BrowserRouter>
      );
      expect(screen.getByText(/Telemedicine/i)).toBeInTheDocument(); // TopBar
      expect(screen.getByText(/Home/i)).toBeInTheDocument(); // BottomNav
      expect(screen.getByTestId('main-content')).toBeInTheDocument(); // Children
    });

    it('propagates onLogout to TopBar', () => {
      const handleLogout = vi.fn();
      render(
        <BrowserRouter>
          <AppShell isOffline={false} syncStatus="synced" onLogout={handleLogout}>
            <div>Content</div>
          </AppShell>
        </BrowserRouter>
      );
      const logoutButton = screen.getByRole('button', { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
      fireEvent.click(logoutButton);
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });
});
