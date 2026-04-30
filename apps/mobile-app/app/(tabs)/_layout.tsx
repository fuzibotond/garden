import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GardenColors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GardenColors.accent,
        tabBarInactiveTintColor: GardenColors.textMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(7, 20, 12, 0.96)',
          borderTopColor: 'rgba(255, 255, 255, 0.07)',
          borderTopWidth: 1,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet.clipboard.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
