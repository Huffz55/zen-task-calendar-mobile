import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MobileTab } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection } from '../../hooks/useHaptics';

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

export function BottomNav({ activeTab, onSelectTab, theme }: BottomNavProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.tabBar, borderTopColor: theme.tabBarBorder }]}>
      {NAV_ITEMS.map(item => {
        const isActive = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.tabItem}
            onPress={() => {
              if (!isActive) {
                hapticSelection();
                onSelectTab(item.id);
              }
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                isActive && { backgroundColor: theme.primaryLight },
              ]}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.iconInactive}
                size={22}
                color={isActive ? theme.primary : theme.textDim}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? theme.primary : theme.textDim, fontWeight: isActive ? '600' : '400' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
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
    paddingVertical: 8,
    paddingBottom: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
