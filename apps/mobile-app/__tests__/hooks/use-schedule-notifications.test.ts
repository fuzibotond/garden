/**
 * @jest-environment jsdom
 * Tests for useScheduleNotifications hook
 *
 * Covers:
 * - polling behavior (starts and stops)
 * - deduplication logic (seenKeys)
 * - notification triggering on status changes
 * - client-specific behavior
 * - gardener-specific behavior
 * - AppState handling (foreground/background)
 * - error handling
 */

import { mockTaskSchedule } from '@/__mocks__/api-mock';
import useScheduleNotifications from '@/hooks/use-schedule-notifications';
import * as Api from '@/services/api';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

jest.mock('@/services/api');
jest.mock('expo-notifications');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, any>) => obj.ios || obj.default,
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

const mockApi = Api as jest.Mocked<typeof Api>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockAppState = AppState as jest.Mocked<typeof AppState>;

describe('useScheduleNotifications', () => {
  let scheduleNotificationSpy: jest.Mock;
  let intervalIds: (string | number | NodeJS.Timeout)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    intervalIds = [];

    scheduleNotificationSpy = jest.fn();
    mockNotifications.scheduleNotificationAsync = scheduleNotificationSpy;

    // Track AppState listeners
    mockAppState.addEventListener.mockReturnValue({
      remove: jest.fn(),
    } as any);

    // Clear seenKeys (module state) - we do this by forcing re-initialization
    jest.resetModules();
  });

  afterEach(() => {
    jest.useRealTimers();
    intervalIds.forEach((id) => {
      if (typeof id === 'number') {
        clearInterval(id as unknown as NodeJS.Timeout);
      }
    });
    intervalIds = [];
    jest.restoreAllMocks();
  });

  describe('Client role', () => {
    test('polls for client calendar on mount', async () => {
      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      // Wait for initial seed
      await waitFor(() => {
        expect(mockApi.getClientCalendar).toHaveBeenCalled();
      });

      unmount();
    });

    test('sends notification for new pending appointment', async () => {
      const newPendingTask = {
        ...mockTaskSchedule,
        status: 'Pending' as const,
        gardenerName: 'John Gardener',
        taskName: 'Plant flowers',
      };

      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [newPendingTask],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      // Wait for initial load and notification
      await waitFor(() => {
        expect(scheduleNotificationSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              title: 'New appointment request 📅',
              body: expect.stringContaining('John Gardener'),
            }),
          })
        );
      });

      unmount();
    });

    test('deduplicates notifications (does not send twice)', async () => {
      const task = {
        ...mockTaskSchedule,
        status: 'Pending' as const,
      };

      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [task],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      // Wait for initial notification
      await waitFor(() => {
        expect(scheduleNotificationSpy).toHaveBeenCalledTimes(1);
      });

      // Simulate polling again with same task
      jest.advanceTimersByTime(30_000);

      await waitFor(() => {
        // Should still be called only once (deduplication)
        expect(scheduleNotificationSpy).toHaveBeenCalledTimes(1);
      });

      unmount();
    });
  });

  describe('Gardener role', () => {
    test('polls for gardener calendar on mount', async () => {
      mockApi.getGardenerCalendar.mockResolvedValue({
        scheduledTasks: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Gardener')
      );

      await waitFor(() => {
        expect(mockApi.getGardenerCalendar).toHaveBeenCalled();
      });

      unmount();
    });

    test('sends notification for approved appointment', async () => {
      const approvedTask = {
        ...mockTaskSchedule,
        status: 'Approved' as const,
        clientName: 'Jane Client',
        taskName: 'Plant flowers',
      };

      mockApi.getGardenerCalendar.mockResolvedValue({
        scheduledTasks: [approvedTask],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Gardener')
      );

      await waitFor(() => {
        expect(scheduleNotificationSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              title: 'Appointment confirmed ✅',
              body: expect.stringContaining('Jane Client'),
            }),
          })
        );
      });

      unmount();
    });

    test('sends notification for proposed alternative', async () => {
      const proposedTask = {
        ...mockTaskSchedule,
        status: 'ProposedAlternative' as const,
        clientName: 'Jane Client',
        taskName: 'Plant flowers',
      };

      mockApi.getGardenerCalendar.mockResolvedValue({
        scheduledTasks: [proposedTask],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Gardener')
      );

      await waitFor(() => {
        expect(scheduleNotificationSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              title: 'Client proposed a new time 🗓️',
            }),
          })
        );
      });

      unmount();
    });

    test('sends notification for declined appointment', async () => {
      const declinedTask = {
        ...mockTaskSchedule,
        status: 'Declined' as const,
        clientName: 'Jane Client',
      };

      mockApi.getGardenerCalendar.mockResolvedValue({
        scheduledTasks: [declinedTask],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Gardener')
      );

      await waitFor(() => {
        expect(scheduleNotificationSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              title: 'Appointment declined ❌',
            }),
          })
        );
      });

      unmount();
    });
  });

  describe('Polling behavior', () => {
    test('sets up interval for polling', async () => {
      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      await waitFor(() => {
        expect(jest.spyOn(global, 'setInterval')).toHaveBeenCalled();
      });

      unmount();
    });

    test('clears interval on unmount', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      await waitFor(() => {
        expect(jest.spyOn(global, 'setInterval')).toHaveBeenCalled();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('does not start polling without token', () => {
      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      });

      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      renderHook(() => useScheduleNotifications(null, 'Client'));

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    test('does not start polling without role', () => {
      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      });

      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      renderHook(() => useScheduleNotifications('test-token', null));

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    test('does not start polling for Admin role', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      renderHook(() => useScheduleNotifications('test-token', 'Admin'));

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('AppState handling', () => {
    test('re-seeds seen keys on foreground resume', async () => {
      const task = {
        ...mockTaskSchedule,
        status: 'Approved' as const,
        clientName: 'Jane',
      };

      mockApi.getGardenerCalendar.mockResolvedValue({
        scheduledTasks: [task],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      });

      const removeListenerMock = jest.fn();
      mockAppState.addEventListener.mockReturnValue({
        remove: removeListenerMock,
      } as any);

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Gardener')
      );

      await waitFor(() => {
        expect(mockApi.getGardenerCalendar).toHaveBeenCalled();
      });

      // Get the listener callback that was registered
      const addEventListenerCall = mockAppState.addEventListener.mock.calls[0];
      const listenerCallback = addEventListenerCall[1];

      // Simulate app coming to foreground
      act(() => {
        listenerCallback('active');
      });

      // Verify it re-seeded (called getGardenerCalendar again)
      await waitFor(() => {
        expect(mockApi.getGardenerCalendar).toHaveBeenCalledTimes(2);
      });

      unmount();
      expect(removeListenerMock).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('silently handles calendar fetch errors', async () => {
      mockApi.getClientCalendar.mockRejectedValue(new Error('Network error'));

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      // Should not throw
      await waitFor(() => {
        expect(mockApi.getClientCalendar).toHaveBeenCalled();
      });

      unmount();
    });

    test('silently handles notification sending errors', async () => {
      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [
          {
            ...mockTaskSchedule,
            status: 'Pending' as const,
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      });

      scheduleNotificationSpy.mockRejectedValue(
        new Error('Notification error')
      );

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      // Should not throw, component should still mount
      await waitFor(() => {
        expect(scheduleNotificationSpy).toHaveBeenCalled();
      });

      unmount();
    });
  });

  describe('Performance', () => {
    test('handles large number of scheduled tasks', async () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        ...mockTaskSchedule,
        scheduleRequestId: `schedule-${i}`,
        status: 'Pending' as const,
      }));

      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: manyTasks,
        totalCount: 100,
        page: 1,
        pageSize: 100,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Client')
      );

      await waitFor(() => {
        // All new tasks should trigger notifications
        expect(scheduleNotificationSpy).toHaveBeenCalledTimes(100);
      });

      unmount();
    });

    test('deduplication scales efficiently with many items', async () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        ...mockTaskSchedule,
        scheduleRequestId: `schedule-${i}`,
        status: 'Approved' as const,
      }));

      mockApi.getGardenerCalendar.mockResolvedValue({
        scheduledTasks: manyTasks,
        totalCount: 100,
        page: 1,
        pageSize: 100,
      });

      const { unmount } = renderHook(() =>
        useScheduleNotifications('test-token', 'Gardener')
      );

      await waitFor(() => {
        expect(scheduleNotificationSpy).toHaveBeenCalledTimes(100);
      });

      // Reset mock
      scheduleNotificationSpy.mockClear();

      // On next poll, should send zero notifications (all deduplicated)
      jest.advanceTimersByTime(30_000);

      await waitFor(() => {
        expect(scheduleNotificationSpy).not.toHaveBeenCalled();
      });

      unmount();
    });
  });
});
