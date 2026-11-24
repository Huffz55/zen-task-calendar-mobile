import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Easing, Keyboard, Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useApp, useTimer } from '../../context/AppContext';
import { BottomNav } from '../../components/common/BottomNav';
import { MiniFocusPlayer } from '../../components/timer/MiniFocusPlayer';
import { MobileTab } from '../../types';
import { useTranslation } from '../../i18n';

const ROUTE_TO_TAB: Record<string, MobileTab> = {
  index: 'today',
  calendar: 'calendar',
  lists: 'lists',
  focus: 'focus',
};

const TAB_TO_ROUTE: Record<MobileTab, string> = {
  today: 'index',
  calendar: 'calendar',
  lists: 'lists',
  focus: 'focus',
};

type CustomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

type TabsScreenOptions = Exclude<
  NonNullable<React.ComponentProps<typeof Tabs>['screenOptions']>,
  (...args: never[]) => unknown
>;

const TAB_TRANSITION_SPEC = {
  animation: 'timing' as const,
  config: {
    duration: 130,
    easing: Easing.out(Easing.cubic),
  },
};

const TAB_SCENE_INTERPOLATOR: NonNullable<
  TabsScreenOptions['sceneStyleInterpolator']
> = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0.01, 1, 0.01],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-18, 0, 18],
        }),
      },
    ],
  },
});

/**
 * Dedicated timer-subscribed slot so 1-second focus ticks only re-render the compact
 * mini player and never re-render BottomNav or the Tabs navigator tree.
 */
const MiniFocusPlayerSlot = memo(function MiniFocusPlayerSlot({
  isFocusTab,
  onOpenFocus,
}: {
  isFocusTab: boolean;
  onOpenFocus: () => void;
}) {
  const { theme, activeFocusTask } = useApp();
  const { timeLeft, initialTime, isTimerRunning, toggleTimer } = useTimer();

  const shouldShowMiniPlayer =
    !isFocusTab && (isTimerRunning || (timeLeft < initialTime && timeLeft > 0));

  if (!shouldShowMiniPlayer) return null;

  return (
    <MiniFocusPlayer
      timeLeft={timeLeft}
      initialTime={initialTime}
      isTimerRunning={isTimerRunning}
      onToggleTimer={toggleTimer}
      onOpenFocus={onOpenFocus}
      activeTaskTitle={activeFocusTask?.title}
      theme={theme}
    />
  );
});

const TabsFooter = memo(function TabsFooter({ state, navigation }: CustomTabBarProps) {
  const { theme } = useApp();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Hide bottom tab bar on Android while soft keyboard is open so inline inputs stay uncluttered
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardOpen(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSelectTab = useCallback(
    (tab: MobileTab) => {
      navigation.navigate(TAB_TO_ROUTE[tab]);
    },
    [navigation]
  );

  const handleOpenFocus = useCallback(() => {
    navigation.navigate(TAB_TO_ROUTE.focus);
  }, [navigation]);

  if (isKeyboardOpen) {
    return null;
  }

  const activeRouteName = state.routes[state.index]?.name ?? 'index';
  const activeTab = ROUTE_TO_TAB[activeRouteName] ?? 'today';

  return (
    <View style={{ backgroundColor: theme.background }}>
      <MiniFocusPlayerSlot isFocusTab={activeTab === 'focus'} onOpenFocus={handleOpenFocus} />
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        theme={theme}
      />
    </View>
  );
});

export default function TabsLayout() {
  const { theme } = useApp();
  const { t } = useTranslation();

  const screenOptions = useMemo<TabsScreenOptions>(
    () => ({
      headerShown: false,
      lazy: false,
      transitionSpec: TAB_TRANSITION_SPEC,
      sceneStyleInterpolator: TAB_SCENE_INTERPOLATOR,
      tabBarStyle: {
        backgroundColor: theme.background,
        borderTopWidth: 0,
        elevation: 0,
      },
      sceneStyle: {
        backgroundColor: theme.background,
      },
    }),
    [theme.background]
  );

  const renderTabBar = useCallback((props: CustomTabBarProps) => {
    return <TabsFooter {...props} />;
  }, []);

  return (
    <Tabs
      backBehavior="initialRoute"
      detachInactiveScreens={false}
      screenOptions={screenOptions}
      tabBar={renderTabBar}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: t('tabs.lists'),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: t('tabs.focus'),
        }}
      />
    </Tabs>
  );
}
