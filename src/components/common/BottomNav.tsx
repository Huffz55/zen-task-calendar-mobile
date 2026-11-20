import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileTab } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection } from '../../hooks/useHaptics';
import { PRESS_SPRING_CONFIG } from '../../utils/animations';
import { useTranslation } from '../../i18n';

interface BottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  theme: ThemeColors;
}

interface NavItem {
  id: MobileTab;
  labelKey: 'tabs.today' | 'tabs.calendar' | 'tabs.lists' | 'tabs.focus';
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', labelKey: 'tabs.today', iconActive: 'today', iconInactive: 'today-outline' },
  { id: 'calendar', labelKey: 'tabs.calendar', iconActive: 'calendar', iconInactive: 'calendar-outline' },
  { id: 'lists', labelKey: 'tabs.lists', iconActive: 'checkbox', iconInactive: 'checkbox-outline' },
  { id: 'focus', labelKey: 'tabs.focus', iconActive: 'timer', iconInactive: 'timer-outline' },
];

function NavTabButton({
  item,
  label,
  isActive,
  onPress,
  theme,
}: {
  item: NavItem;
  label: string;
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
      accessibilityLabel={label}
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
        maxFontSizeMultiplier={1.35}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomNav({ activeTab, onSelectTab, theme }: BottomNavProps) {
  const { t } = useTranslation();
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
            label={t(item.labelKey)}
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
