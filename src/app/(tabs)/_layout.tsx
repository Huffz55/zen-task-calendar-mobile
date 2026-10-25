import React from 'react';
import { View } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { BottomNav } from '../../components/common/BottomNav';
import { MiniFocusPlayer } from '../../components/timer/MiniFocusPlayer';
import { MobileTab } from '../../types';

export default function TabsLayout() {
  const {
    theme,
    timeLeft,
    initialTime,
    isTimerRunning,
    toggleTimer,
    activeFocusTask,
  } = useApp();
  const pathname = usePathname();

  const getActiveTab = (): MobileTab => {
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/lists')) return 'lists';
    if (pathname.includes('/focus')) return 'focus';
    return 'today';
  };

  const activeTab = getActiveTab();
  const shouldShowMiniPlayer = activeTab !== 'focus' && (isTimerRunning || (timeLeft < initialTime && timeLeft > 0));

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
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
      tabBar={() => (
        <View style={{ backgroundColor: theme.background }}>
          {shouldShowMiniPlayer && (
            <MiniFocusPlayer
              timeLeft={timeLeft}
              initialTime={initialTime}
              isTimerRunning={isTimerRunning}
              onToggleTimer={toggleTimer}
              onOpenFocus={() => handleSelectTab('focus')}
              activeTaskTitle={activeFocusTask?.title}
              theme={theme}
            />
          )}
          <BottomNav
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            theme={theme}
          />
        </View>
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
