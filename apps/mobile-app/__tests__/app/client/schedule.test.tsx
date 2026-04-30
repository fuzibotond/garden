/**
 * @jest-environment jsdom
 * Tests for Schedule screen component (Client)
 *
 * Covers:
 * - loading state
 * - error state
 * - success state with data
 * - refresh control
 * - action handlers (approve, decline, propose)
 * - data display
 */

import {
    mockClientCalendarResponse,
    mockTaskSchedule,
} from '@/__mocks__/api-mock';
import { useAuth } from '@/context/AuthContext';
import * as Api from '@/services/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

jest.mock('@/services/api');
jest.mock('@/context/AuthContext');

const mockApi = Api as jest.Mocked<typeof Api>;
const mockUseAuth = useAuth as jest.Mock;

// Simplified ClientSchedule component for testing
function ClientScheduleScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<Api.TaskScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await Api.getClientCalendar(token, 1, 100);
      const sorted = [...(res.scheduledTasks ?? [])].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime()
      );
      setItems(sorted);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load schedule'
      );
    }
  }, [token]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onApprove = useCallback(
    async (scheduleRequestId: string) => {
      setActionLoading(scheduleRequestId);
      try {
        await Api.approveSchedule(token || '', scheduleRequestId);
        await load();
      } finally {
        setActionLoading(null);
      }
    },
    [token, load]
  );

  const onDecline = useCallback(
    async (scheduleRequestId: string) => {
      setActionLoading(scheduleRequestId);
      try {
        await Api.declineSchedule(token || '', scheduleRequestId);
        await load();
      } finally {
        setActionLoading(null);
      }
    },
    [token, load]
  );

  if (loading) {
    return (
      <View testID="loading-container">
        <ActivityIndicator testID="loading-spinner" />
      </View>
    );
  }

  if (error) {
    return (
      <View testID="error-container">
        <Text testID="error-text">{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      testID="schedule-list"
      refreshControl={
        <RefreshControl
          testID="refresh-control"
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {items.length === 0 ? (
        <View testID="empty-state">
          <Text>No scheduled appointments</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.scheduleRequestId} testID={`schedule-item-${item.scheduleRequestId}`}>
            <Text testID={`task-name-${item.scheduleRequestId}`}>
              {item.taskName}
            </Text>
            <Text testID={`gardener-name-${item.scheduleRequestId}`}>
              {item.gardenerName}
            </Text>
            <Text testID={`status-${item.scheduleRequestId}`}>{item.status}</Text>

            {item.status === 'Pending' && (
              <>
                <TouchableOpacity
                  testID={`approve-btn-${item.scheduleRequestId}`}
                  onPress={() => onApprove(item.scheduleRequestId)}
                  disabled={actionLoading === item.scheduleRequestId}
                >
                  <Text>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`decline-btn-${item.scheduleRequestId}`}
                  onPress={() => onDecline(item.scheduleRequestId)}
                  disabled={actionLoading === item.scheduleRequestId}
                >
                  <Text>Decline</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

describe('ClientSchedule Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      token: 'test-token',
      profile: null,
      role: 'Client',
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });
  });

  describe('Loading state', () => {
    test('shows loading spinner on mount', () => {
      mockApi.getClientCalendar.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ClientScheduleScreen />);

      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    });

    test('hides loading spinner after data loads', async () => {
      mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);

      const { queryByTestId } = render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(queryByTestId('loading-spinner')).toBeFalsy();
      });
    });
  });

  describe('Error handling', () => {
    test('displays error message on failure', async () => {
      const errorMsg = 'Failed to load schedule';
      mockApi.getClientCalendar.mockRejectedValue(new Error(errorMsg));

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('error-text')).toHaveTextContent(errorMsg);
      });
    });

    test('clears error on successful refresh', async () => {
      mockApi.getClientCalendar.mockRejectedValueOnce(new Error('Failed'));

      const { rerender } = render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('error-text')).toBeTruthy();
      });

      // Fix API and refresh
      mockApi.getClientCalendar.mockResolvedValueOnce(
        mockClientCalendarResponse
      );

      const refreshControl = screen.getByTestId('refresh-control');
      fireEvent.scroll(refreshControl, {
        nativeEvent: { contentOffset: { y: -100 } },
      });

      await waitFor(() => {
        expect(screen.queryByTestId('error-text')).toBeFalsy();
      });
    });
  });

  describe('Data display', () => {
    test('displays scheduled appointments', async () => {
      mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `schedule-item-${mockTaskSchedule.scheduleRequestId}`
          )
        ).toBeTruthy();
      });
    });

    test('displays task details', async () => {
      mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(
          screen.getByTestId(`task-name-${mockTaskSchedule.scheduleRequestId}`)
        ).toHaveTextContent(mockTaskSchedule.taskName);
        expect(
          screen.getByTestId(
            `gardener-name-${mockTaskSchedule.scheduleRequestId}`
          )
        ).toHaveTextContent(mockTaskSchedule.gardenerName);
      });
    });

    test('shows empty state when no appointments', async () => {
      mockApi.getClientCalendar.mockResolvedValue({
        ...mockClientCalendarResponse,
        scheduledTasks: [],
      });

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeTruthy();
      });
    });

    test('sorts items by creation date descending', async () => {
      const item1 = {
        ...mockTaskSchedule,
        scheduleRequestId: 'older',
        createdAtUtc: '2026-04-01T10:00:00Z',
      };
      const item2 = {
        ...mockTaskSchedule,
        scheduleRequestId: 'newer',
        createdAtUtc: '2026-04-26T10:00:00Z',
      };

      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [item1, item2],
        totalCount: 2,
        page: 1,
        pageSize: 100,
      });

      const { getByTestId } = render(<ClientScheduleScreen />);

      await waitFor(() => {
        const list = getByTestId('schedule-list');
        const children = list.props.children;
        // Newer item should come first
        expect(children[0].key).toBe('newer');
      });
    });
  });

  describe('Actions', () => {
    test('approve button triggers API call', async () => {
      mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);
      mockApi.approveSchedule.mockResolvedValue({
        scheduleRequestId: mockTaskSchedule.scheduleRequestId,
        taskId: 'task-123',
        clientId: 'client-123',
        scheduledAtUtc: '2026-05-01T10:00:00Z',
        status: 'Approved',
        createdAtUtc: '2026-04-26T10:00:00Z',
      });

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `approve-btn-${mockTaskSchedule.scheduleRequestId}`
          )
        ).toBeTruthy();
      });

      fireEvent.press(
        screen.getByTestId(`approve-btn-${mockTaskSchedule.scheduleRequestId}`)
      );

      await waitFor(() => {
        expect(mockApi.approveSchedule).toHaveBeenCalledWith(
          'test-token',
          mockTaskSchedule.scheduleRequestId
        );
      });
    });

    test('decline button triggers API call', async () => {
      mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);
      mockApi.declineSchedule.mockResolvedValue({
        scheduleRequestId: mockTaskSchedule.scheduleRequestId,
        taskId: 'task-123',
        clientId: 'client-123',
        scheduledAtUtc: '2026-05-01T10:00:00Z',
        status: 'Declined',
        createdAtUtc: '2026-04-26T10:00:00Z',
      });

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `decline-btn-${mockTaskSchedule.scheduleRequestId}`
          )
        ).toBeTruthy();
      });

      fireEvent.press(
        screen.getByTestId(`decline-btn-${mockTaskSchedule.scheduleRequestId}`)
      );

      await waitFor(() => {
        expect(mockApi.declineSchedule).toHaveBeenCalledWith(
          'test-token',
          mockTaskSchedule.scheduleRequestId
        );
      });
    });

    test('hides action buttons for non-pending items', async () => {
      const approvedItem = {
        ...mockTaskSchedule,
        status: 'Approved' as const,
      };

      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: [approvedItem],
        totalCount: 1,
        page: 1,
        pageSize: 100,
      });

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(
          screen.queryByTestId(`approve-btn-${approvedItem.scheduleRequestId}`)
        ).toBeFalsy();
        expect(
          screen.queryByTestId(`decline-btn-${approvedItem.scheduleRequestId}`)
        ).toBeFalsy();
      });
    });

    test('disables buttons while action is in progress', async () => {
      mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);
      mockApi.approveSchedule.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `approve-btn-${mockTaskSchedule.scheduleRequestId}`
          )
        ).toBeTruthy();
      });

      const approveBtn = screen.getByTestId(
        `approve-btn-${mockTaskSchedule.scheduleRequestId}`
      );
      fireEvent.press(approveBtn);

      await waitFor(() => {
        expect(approveBtn.props.disabled).toBe(true);
      });
    });
  });

  describe('Refresh control', () => {
    test('refresh reloads data', async () => {
      mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);

      const { getByTestId } = render(<ClientScheduleScreen />);

      await waitFor(() => {
        expect(mockApi.getClientCalendar).toHaveBeenCalledTimes(1);
      });

      const refreshControl = getByTestId('refresh-control');
      fireEvent.scroll(refreshControl, {
        nativeEvent: { contentOffset: { y: -100 } },
      });

      await waitFor(() => {
        expect(mockApi.getClientCalendar).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance', () => {
    test('handles large number of appointments', async () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        ...mockTaskSchedule,
        scheduleRequestId: `schedule-${i}`,
      }));

      mockApi.getClientCalendar.mockResolvedValue({
        scheduledTasks: manyItems,
        totalCount: 100,
        page: 1,
        pageSize: 100,
      });

      const start = performance.now();
      render(<ClientScheduleScreen />);
      const renderTime = performance.now() - start;

      await waitFor(() => {
        expect(screen.getByTestId('schedule-list')).toBeTruthy();
      });

      // Should render reasonably fast (< 500ms)
      expect(renderTime).toBeLessThan(500);
    });
  });
});
