import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileTab } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection } from '../../hooks/useHaptics';
import { PRESS_SPRING_CONFIG } from '../../utils/animations';

interface BottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  theme: ThemeColors;
}

interface NavItem {
  id: MobileTab;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', label: 'Today', iconActive: 'today', iconInactive: 'today-outline' },
  { id: 'calendar', label: 'Calendar', iconActive: 'calendar', iconInactive: 'calendar-outline' },
  { id: 'lists', label: 'Lists', iconActive: 'checkbox', iconInactive: 'checkbox-outline' },
  { id: 'focus', label: 'Focus', iconActive: 'timer', iconInactive: 'timer-outline' },
];

function NavTabButton({
  item,
  isActive,
  onPress,
  theme,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
  theme: ThemeColors;
}) {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 80, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
    }
  }, [isActive, scale]);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.94, ...PRESS_SPRING_CONFIG }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, ...PRESS_SPRING_CONFIG }).start();
  };

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          isActive && { backgroundColor: theme.primaryLight },
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={isActive ? item.iconActive : item.iconInactive}
          size={22}
          color={isActive ? theme.primary : theme.textDim}
        />
      </Animated.View>
      <Text
        style={[
          styles.label,
          {
            color: isActive ? theme.primary : theme.textDim,
            fontWeight: isActive ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function BottomNav({ activeTab, onSelectTab, theme }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const safeBottomPadding = Math.max(insets.bottom, 10);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          paddingBottom: safeBottomPadding,
        },
      ]}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id;
        return (
          <NavTabButton
            key={item.id}
            item={item}
            isActive={isActive}
            onPress={() => {
              if (!isActive) {
                hapticSelection();
                onSelectTab(item.id);
              }
            }}
            theme={theme}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
  },
  iconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
