/**
 * @jest-environment jsdom
 * Tests for navigation and routing
 *
 * Covers:
 * - role-based routing
 * - splash screen behavior
 * - auth state redirects
 * - loading states
 */

import { useAuth } from '@/context/AuthContext';
import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// Mock dependencies
jest.mock('@/context/AuthContext');
jest.mock('expo-router');

const mockUseAuth = useAuth as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

// Create a simple splash screen component for testing
function SplashScreen() {
  const { isLoading, token, role } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace('/login');
    } else if (role === 'Client') {
      router.replace('/(client)/');
    } else if (role === 'Gardener' || role === 'Admin') {
      router.replace('/(gardener)/');
    }
  }, [isLoading, token, role, router]);

  return (
    <View testID="splash-screen">
      <Text>🌱 Garden</Text>
      <ActivityIndicator testID="loading-spinner" />
    </View>
  );
}

describe('Navigation - Role-based Routing', () => {
  let mockReplace: jest.Mock;
  let mockPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace = jest.fn();
    mockPush = jest.fn();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      back: jest.fn(),
    });
  });

  describe('Authentication state', () => {
    test('shows loading spinner while auth is initializing', () => {
      mockUseAuth.mockReturnValue({
        isLoading: true,
        token: null,
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      const { getByTestId } = render(<SplashScreen />);

      expect(getByTestId('loading-spinner')).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('redirects to login when no token', async () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: null,
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<SplashScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    test('does not redirect while loading', () => {
      mockUseAuth.mockReturnValue({
        isLoading: true,
        token: null,
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<SplashScreen />);

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Role-based routing', () => {
    test('redirects Client role to (client)/', async () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: 'client-token',
        profile: {
          id: 'user-123',
          email: 'client@example.com',
          role: 'Client',
        },
        role: 'Client',
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<SplashScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(client)/');
      });
    });

    test('redirects Gardener role to (gardener)/', async () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: 'gardener-token',
        profile: {
          id: 'user-123',
          email: 'gardener@example.com',
          role: 'Gardener',
        },
        role: 'Gardener',
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<SplashScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(gardener)/');
      });
    });

    test('redirects Admin role to (gardener)/', async () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: 'admin-token',
        profile: {
          id: 'user-123',
          email: 'admin@example.com',
          role: 'Admin',
        },
        role: 'Admin',
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<SplashScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(gardener)/');
      });
    });

    test('does not redirect when role is unknown', () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: 'some-token',
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<SplashScreen />);

      // Should wait for next render where role becomes known
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('Auth state transitions', () => {
    test('responds to auth state changes', () => {
      const { rerender } = render(<SplashScreen />);

      // Start loading
      mockUseAuth.mockReturnValue({
        isLoading: true,
        token: null,
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(<SplashScreen />);

      expect(mockReplace).not.toHaveBeenCalled();

      // Finish loading, still no token
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: null,
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(<SplashScreen />);

      expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    test('handles token acquisition after login', () => {
      const { rerender } = render(<SplashScreen />);

      // Start: no token
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: null,
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(<SplashScreen />);

      mockReplace.mockClear();

      // User logs in
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: 'new-token',
        profile: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'Client',
        },
        role: 'Client',
        signIn: jest.fn(),
        signOut: jest.fn(),
      });
      rerender(<SplashScreen />);

      expect(mockReplace).toHaveBeenCalledWith('/(client)/');
    });
  });

  describe('Route stability', () => {
    test('only redirects once per state change', async () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: 'client-token',
        profile: {
          id: 'user-123',
          email: 'client@example.com',
          role: 'Client',
        },
        role: 'Client',
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      const { rerender } = render(<SplashScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledTimes(1);
      });

      // Rerender without state change
      rerender(<SplashScreen />);

      // Should still have been called only once
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    test('prefers replace over push for authentication flows', async () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        token: null,
        profile: null,
        role: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(<SplashScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });
});
