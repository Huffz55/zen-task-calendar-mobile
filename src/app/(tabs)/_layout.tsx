import React from 'react';
import { Tabs, router, usePathname } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { BottomNav } from '../../components/common/BottomNav';
import { MobileTab } from '../../types';

export default function TabsLayout() {
  const { theme } = useApp();
  const pathname = usePathname();

  const getActiveTab = (): MobileTab => {
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/lists')) return 'lists';
    if (pathname.includes('/focus')) return 'focus';
    return 'today';
  };

  const handleSelectTab = (tab: MobileTab) => {
    switch (tab) {
      case 'today':
        router.replace('/(tabs)');
        break;
      case 'calendar':
        router.replace('/(tabs)/calendar');
        break;
      case 'lists':
        router.replace('/(tabs)/lists');
        break;
      case 'focus':
        router.replace('/(tabs)/focus');
        break;
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={() => (
        <BottomNav
          activeTab={getActiveTab()}
          onSelectTab={handleSelectTab}
          theme={theme}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Lists',
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
        }}
      />
    </Tabs>
  );
}
