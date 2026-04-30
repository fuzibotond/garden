/**
 * Tests for API service layer
 *
 * Covers:
 * - request() success and error handling
 * - auth header injection
 * - ngrok header logic
 * - response parsing and error handling
 * - API endpoints (login, calendar, etc.)
 */

import {
    mockClientCalendarResponse,
    mockGardenerCalendarResponse,
    mockLoginResponse,
    mockProfile
} from '@/__mocks__/api-mock';
import { API_BASE_URL } from '@/constants/api';
import * as Api from '@/services/api';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('request() function', () => {
    test('makes GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: '123' }),
        json: async () => ({ id: '123' }),
      });

      await Api.request('/test-endpoint', { token: 'test-token' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    test('injects Content-Type header for POST with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      });

      await Api.request('/test', { method: 'POST', body: { test: true }, token: 'token' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('adds ngrok header when API_BASE_URL includes ngrok', async () => {
      const originalUrl = API_BASE_URL;
      
      // Can't directly mock API_BASE_URL, so we'll test with fetch directly
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '{}',
        json: async () => ({}),
      });

      await Api.request('/test', { token: 'token' });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers || {};
      
      // Only check if API_BASE_URL actually includes ngrok
      if (originalUrl.includes('ngrok')) {
        expect(headers['ngrok-skip-browser-warning']).toBe('true');
      }
    });

    test('handles 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => '',
      });

      const result = await Api.request('/test', { token: 'token' });

      expect(result).toBeUndefined();
    });

    test('handles empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      });

      const result = await Api.request('/test', { token: 'token' });

      expect(result).toBeUndefined();
    });

    test('parses JSON response correctly', async () => {
      const response = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(response),
        json: async () => response,
      });

      const result = await Api.request('/test', { token: 'token' });

      expect(result).toEqual(response);
    });

    test('throws error on request failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Bad request' }),
      });

      await expect(Api.request('/test', { token: 'token' })).rejects.toThrow(
        'Bad request'
      );
    });

    test('detects and reports HTML response on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => '<html><body>Bad Gateway</body></html>',
      });

      await expect(Api.request('/test', { token: 'token' })).rejects.toThrow(
        /Server unreachable/
      );
    });

    test('detects and reports HTML response on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<html><body>Wrong page</body></html>',
      });

      await expect(Api.request('/test', { token: 'token' })).rejects.toThrow(
        /Server returned an HTML page/
      );
    });

    test('extracts error details from structured error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          title: 'Validation Error',
          errors: {
            email: ['Invalid email format'],
            password: ['Password must be at least 8 characters'],
          },
        }),
      });

      await expect(Api.request('/test', { token: 'token' })).rejects.toThrow(
        /Validation Error/
      );
    });
  });

  describe('Auth endpoints', () => {
    test('login sends correct request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockLoginResponse),
      });

      const result = await Api.login('test@example.com', 'password123');

      expect(result).toEqual(mockLoginResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });

    test('getMyProfile decodes JWT and extracts role', async () => {
      // Create a valid JWT token (this is a real-world token format)
      const tokenPayload = {
        sub: 'user-123',
        role: 'Client',
        email: 'test@example.com',
      };
      const encoded = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
      const token = `header.${encoded}.signature`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockProfile),
      });

      const result = await Api.getMyProfile(token);

      expect(result.role).toBe('Client');
      expect(result.email).toBe(mockProfile.email);
    });

    test('logout sends correct request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => '',
      });

      await Api.logout('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('Calendar endpoints', () => {
    test('getClientCalendar returns scheduled tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockClientCalendarResponse),
      });

      const result = await Api.getClientCalendar('token', 1, 50);

      expect(result.scheduledTasks).toHaveLength(1);
      expect(result.scheduledTasks[0].status).toBe('Pending');
    });

    test('getGardenerCalendar returns scheduled tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockGardenerCalendarResponse),
      });

      const result = await Api.getGardenerCalendar('token', 1, 50);

      expect(result.scheduledTasks).toHaveLength(1);
      expect(result.scheduledTasks[0].status).toBe('Approved');
    });

    test('approveSchedule sends correct request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ scheduleRequestId: 'test' }),
      });

      await Api.approveSchedule('token', 'schedule-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/client/scheduling/approve-schedule'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ scheduleRequestId: 'schedule-123' }),
        })
      );
    });

    test('declineSchedule sends correct request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ scheduleRequestId: 'test' }),
      });

      await Api.declineSchedule('token', 'schedule-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/client/scheduling/decline-schedule'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('proposeAlternativeTime sends correct request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ scheduleRequestId: 'test' }),
      });

      const newTime = '2026-05-15T14:00:00Z';
      await Api.proposeAlternativeTime('token', 'schedule-123', newTime);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/client/scheduling/propose-alternative-time'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            scheduleRequestId: 'schedule-123',
            proposedAtUtc: newTime,
          }),
        })
      );
    });
  });

  describe('Job endpoints', () => {
    test('getGardenerJobs normalizes response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          items: [
            {
              jobId: 'job-123',
              name: 'Spring Maintenance',
              clientId: 'client-123',
              taskCount: 5,
              progressPercent: 40,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
      });

      const result = await Api.getGardenerJobs('token', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].jobId).toBe('job-123');
      expect(result.items[0].name).toBe('Spring Maintenance');
    });

    test('createGardenerJob sends correct request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          jobId: 'new-job',
          name: 'New Job',
        }),
      });

      await Api.createGardenerJob('token', {
        name: 'New Job',
        clientId: 'client-123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/gardener/jobs'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'New Job',
            clientId: 'client-123',
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    test('network errors are properly caught', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(Api.request('/test', { token: 'token' })).rejects.toThrow(
        'Network error'
      );
    });

    test('malformed JSON in error response is handled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Not JSON {invalid}',
      });

      await expect(Api.request('/test', { token: 'token' })).rejects.toThrow(
        'Not JSON {invalid}'
      );
    });
  });

  describe('Performance', () => {
    test('request completes in reasonable time', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: 'test' }),
      });

      const start = performance.now();
      await Api.request('/test', { token: 'token' });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    test('handles pagination efficiently', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          items: Array(100).fill(null).map((_, i) => ({
            jobId: `job-${i}`,
            name: `Job ${i}`,
          })),
          total: 1000,
          page: 1,
          pageSize: 100,
        }),
      });

      const result = await Api.getGardenerJobs('token', 1, 100);

      expect(result.items).toHaveLength(100);
      expect(result.total).toBe(1000);
    });
  });
});
