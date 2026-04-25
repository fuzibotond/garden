import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getClientCalendar } from '@/services/api';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

const BADGE_POLL_MS = 30_000;

function usePendingCount(token: string | null): number {
  const [count, setCount] = useState(0);
  const appState = useRef(AppState.currentState);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getClientCalendar(token, 1, 100);
      const n = (res.scheduledTasks ?? []).filter((i) => i.status === 'Pending').length;
      setCount(n);
      if (Platform.OS !== 'web') {
        const { default: Notifications } = await import('expo-notifications');
        await Notifications.setBadgeCountAsync(n);
      }
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), BADGE_POLL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') void refresh();
      appState.current = next;
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  return count;
}

export default function ClientLayout() {
  const { token } = useAuth();
  const pendingCount = usePendingCount(token);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GardenColors.accent,
        tabBarInactiveTintColor: GardenColors.textMuted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'rgba(7, 20, 12, 0.96)',
          borderTopColor: 'rgba(190, 255, 171, 0.1)',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ color }) => <IconSymbol name="briefcase.fill" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <IconSymbol name="calendar" color={color} size={22} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: GardenColors.accent, color: '#07140c', fontSize: 10, fontWeight: '700' },
        }}
      />
      <Tabs.Screen
        name="questions"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol name="person.fill" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
