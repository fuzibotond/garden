import { getClientCalendar, getGardenerCalendar, registerPushToken } from '@/services/api';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

// How often to poll for new schedule items (ms)
const POLL_INTERVAL_MS = 30_000;

// Track seen composite keys (scheduleRequestId:status) so status transitions
// each fire exactly one notification per session.
const seenKeys = new Set<string>();

function key(id: string, status: string) {
  return `${id}:${status}`;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) {
    // Simulators can show local notifications, but push tokens won't work —
    // local notifications are fine for our use-case
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Gets the Expo push token for this device and registers it with the backend.
 * Must be called after the user has logged in (requires auth token).
 * Safe to call multiple times — silently no-ops if the device doesn't support it.
 */
export async function registerExpoPushToken(authToken: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await registerPushToken(authToken, tokenData.data);
  } catch (e) {
    // Non-fatal — polling still works as fallback
    if (__DEV__) console.warn('[PushToken] registration failed:', e);
  }
}

async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // fire immediately
  });
}

function useScheduleNotifications(
  token: string | null,
  role: 'Gardener' | 'Client' | 'Admin' | null,
) {
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!token || !role) return;

    try {
      if (role === 'Client') {
        const res = await getClientCalendar(token, 1, 100);
        const items = res.scheduledTasks ?? [];

        const newPending = items.filter(
          (i) => i.status === 'Pending' && !seenKeys.has(key(i.scheduleRequestId, i.status)),
        );

        for (const item of newPending) {
          seenKeys.add(key(item.scheduleRequestId, item.status));
          await sendLocalNotification(
            'New appointment request 📅',
            `${item.gardenerName} wants to schedule "${item.taskName}".`,
          );
        }
      } else if (role === 'Gardener') {
        const res = await getGardenerCalendar(token, 1, 100);
        const items = res.scheduledTasks ?? [];

        for (const item of items) {
          const k = key(item.scheduleRequestId, item.status);
          if (seenKeys.has(k)) continue;
          seenKeys.add(k);

          if (item.status === 'ProposedAlternative') {
            await sendLocalNotification(
              'Client proposed a new time 🗓️',
              `${item.clientName} suggested a different time for "${item.taskName}".`,
            );
          } else if (item.status === 'Approved') {
            await sendLocalNotification(
              'Appointment confirmed ✅',
              `${item.clientName} approved the appointment for "${item.taskName}".`,
            );
          } else if (item.status === 'Declined') {
            await sendLocalNotification(
              'Appointment declined ❌',
              `${item.clientName} declined the appointment for "${item.taskName}".`,
            );
          }
        }
      }
    } catch {
      // Silently ignore poll errors — the schedule screen handles its own errors
    }
  }, [token, role]);

  const seedCurrentStatuses = useCallback(async () => {
    if (!token || !role || role === 'Admin') return;
    try {
      if (role === 'Client') {
        const res = await getClientCalendar(token, 1, 100);
        (res.scheduledTasks ?? []).forEach((i) => {
          seenKeys.add(key(i.scheduleRequestId, i.status));
        });
      } else if (role === 'Gardener') {
        const res = await getGardenerCalendar(token, 1, 100);
        (res.scheduledTasks ?? []).forEach((i) => {
          seenKeys.add(key(i.scheduleRequestId, i.status));
        });
      }
    } catch {
      // ignore
    }
  }, [token, role]);

  useEffect(() => {
    if (!token || !role || role === 'Admin') return;

    // Seed seen keys from the initial load so we don't spam on first open
    void seedCurrentStatuses();

    // Start polling
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

    // On foreground resume: re-seed first (absorbs any push-delivered changes),
    // then let the interval handle new real-time changes.
    // This prevents a duplicate local notification firing for events already
    // delivered by the push notification while the app was in the background.
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        void seedCurrentStatuses();
      }
      appState.current = nextState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [token, role, poll, seedCurrentStatuses]);
}

export default useScheduleNotifications;
