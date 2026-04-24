import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GardenColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getGardenerCalendar } from '@/services/api';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const BADGE_POLL_MS = 30_000;

function useProposalCount(token: string | null): number {
  const [count, setCount] = useState(0);
  const appState = useRef(AppState.currentState);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getGardenerCalendar(token, 1, 100);
      setCount((res.scheduledTasks ?? []).filter((i) => i.status === 'ProposedAlternative').length);
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

export default function GardenerLayout() {
  const { token } = useAuth();
  const proposalCount = useProposalCount(token);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GardenColors.accent,
        tabBarInactiveTintColor: GardenColors.textMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(7, 20, 12, 0.96)',
          borderTopColor: 'rgba(255, 255, 255, 0.07)',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarIconStyle: { marginBottom: 0 },
        tabBarItemStyle: { paddingHorizontal: 0 },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="checkmark.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="calendar" color={color} />,
          tabBarBadge: proposalCount > 0 ? proposalCount : undefined,
          tabBarBadgeStyle: { backgroundColor: GardenColors.accent, color: '#07140c', fontSize: 10, fontWeight: '700' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
