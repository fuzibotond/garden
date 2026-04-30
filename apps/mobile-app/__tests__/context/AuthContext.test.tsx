/**
 * @jest-environment jsdom
 * Tests for AuthContext
 *
 * Covers:
 * - signIn flow (mock API)
 * - token persistence
 * - role extraction
 * - signOut flow
 * - error handling
 */

import { mockLoginResponse, mockProfile } from '@/__mocks__/api-mock';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as ApiService from '@/services/api';
import * as StorageService from '@/services/storage';
import { act, renderHook, waitFor } from '@testing-library/react';

// Mock dependencies
jest.mock('@/services/storage');
jest.mock('@/services/api');

const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no stored token
    mockStorageService.getStoredToken.mockResolvedValue(null);
  });

  describe('Initial state', () => {
    test('initializes with loading state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.token).toBe(null);
      expect(result.current.profile).toBe(null);
    });

    test('loads token from storage if available', async () => {
      mockStorageService.getStoredToken.mockResolvedValue('stored-token');
      mockApiService.getMyProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBe('stored-token');
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.role).toBe('Client');
    });

    test('clears token if profile fetch fails', async () => {
      mockStorageService.getStoredToken.mockResolvedValue('bad-token');
      mockApiService.getMyProfile.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBe(null);
      expect(result.current.profile).toBe(null);
      expect(mockStorageService.removeToken).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    test('signs in user and stores token', async () => {
      mockStorageService.getStoredToken.mockResolvedValue(null);
      mockApiService.login.mockResolvedValue(mockLoginResponse);
      mockApiService.getMyProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Sign in
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockApiService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(mockStorageService.saveToken).toHaveBeenCalledWith(
        mockLoginResponse.accessToken
      );
      expect(result.current.token).toBe(mockLoginResponse.accessToken);
      expect(result.current.profile).toEqual(mockProfile);
    });

    test('extracts role correctly from profile', async () => {
      const gardenerProfile = {
        ...mockProfile,
        role: 'Gardener',
      };

      mockStorageService.getStoredToken.mockResolvedValue(null);
      mockApiService.login.mockResolvedValue(mockLoginResponse);
      mockApiService.getMyProfile.mockResolvedValue(gardenerProfile);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('gardener@example.com', 'password123');
      });

      expect(result.current.role).toBe('Gardener');
    });

    test('handles sign in errors', async () => {
      mockStorageService.getStoredToken.mockResolvedValue(null);
      const error = new Error('Invalid credentials');
      mockApiService.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signIn('wrong@example.com', 'wrongpass');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.token).toBe(null);
    });
  });

  describe('signOut', () => {
    test('clears token and profile on sign out', async () => {
      mockStorageService.getStoredToken.mockResolvedValue('stored-token');
      mockApiService.getMyProfile.mockResolvedValue(mockProfile);
      mockApiService.logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBe('stored-token');

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockApiService.logout).toHaveBeenCalledWith('stored-token');
      expect(mockStorageService.removeToken).toHaveBeenCalled();
      expect(result.current.token).toBe(null);
      expect(result.current.profile).toBe(null);
    });

    test('still clears token if logout API fails', async () => {
      mockStorageService.getStoredToken.mockResolvedValue('stored-token');
      mockApiService.getMyProfile.mockResolvedValue(mockProfile);
      mockApiService.logout.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw, gracefully handles error
      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.token).toBe(null);
      expect(result.current.profile).toBe(null);
      expect(mockStorageService.removeToken).toHaveBeenCalled();
    });

    test('handles sign out when already signed out', async () => {
      mockStorageService.getStoredToken.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw
      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.token).toBe(null);
      expect(mockStorageService.removeToken).toHaveBeenCalled();
    });
  });

  describe('useAuth hook', () => {
    test('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used inside <AuthProvider>');
    });

    test('provides stable context value', async () => {
      mockStorageService.getStoredToken.mockResolvedValue(null);

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstValue = result.current;
      rerender();
      const secondValue = result.current;

      // Methods should be the same reference (memoized)
      expect(firstValue.signIn).toBe(secondValue.signIn);
      expect(firstValue.signOut).toBe(secondValue.signOut);
    });
  });
});
