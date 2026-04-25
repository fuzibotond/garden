import { AuthProvider, useAuth } from '@/context/AuthContext';
import useScheduleNotifications, {
    registerExpoPushToken,
    requestNotificationPermission,
} from '@/hooks/use-schedule-notifications';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

function NotificationSetup() {
  const { token, role } = useAuth();
  const prevTokenRef = useRef<string | null>(null);

  // Request permission on mount
  useEffect(() => {
    void requestNotificationPermission();
  }, []);

  // Register Expo push token whenever the auth token changes (i.e. after login)
  useEffect(() => {
    if (token && token !== prevTokenRef.current) {
      prevTokenRef.current = token;
      void registerExpoPushToken(token);
    }
    if (!token) prevTokenRef.current = null;
  }, [token]);

  // Navigate to schedule screen when user taps a push notification
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'schedule_request' || data?.type === 'schedule_update') {
        if (role === 'Client') router.push('/(client)/schedule');
        else if (role === 'Gardener') router.push('/(gardener)/schedule');
      } else if (data?.type === 'question' || data?.type === 'answer') {
        if (role === 'Client') router.push('/(client)/jobs');
        else if (role === 'Gardener') router.push('/(gardener)/tasks');
      }
    });

    return () => sub.remove();
  }, [role]);

  useScheduleNotifications(token, role);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationSetup />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(gardener)" />
        <Stack.Screen name="(client)" />
      </Stack>
      <StatusBar style="light" />
    </AuthProvider>
  );
}
