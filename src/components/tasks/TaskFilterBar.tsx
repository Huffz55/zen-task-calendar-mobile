import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TaskTag } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../hooks/useHaptics';

interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  selectedTag: TaskTag | 'all';
  onSelectTag: (tag: TaskTag | 'all') => void;
  theme: ThemeColors;
  counts?: {
    all: number;
    work: number;
    personal: number;
    health: number;
    ideas: number;
    priority: number;
  };
}

export function TaskFilterBar({
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  theme,
  counts,
}: TaskFilterBarProps) {
  const tagKeys = Object.keys(TAGS) as TaskTag[];

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.surface,
            borderColor: searchQuery ? theme.primary : theme.border,
          },
        ]}
      >
        <Ionicons name="search" size={16} color={theme.textDim} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search tasks..."
          placeholderTextColor={theme.textDim}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              onSearchChange('');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={theme.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag Filter Chips Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {/* 'All' Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor:
                selectedTag === 'all' ? theme.primary : theme.surfaceMuted,
              borderColor:
                selectedTag === 'all' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            hapticLight();
            onSelectTag('all');
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              { color: selectedTag === 'all' ? '#ffffff' : theme.textMuted },
            ]}
          >
            All
          </Text>
          {counts && counts.all > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    selectedTag === 'all'
                      ? 'rgba(255,255,255,0.25)'
                      : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: selectedTag === 'all' ? '#ffffff' : theme.textDim },
                ]}
              >
                {counts.all}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Individual Tag Chips */}
        {tagKeys.map(tKey => {
          const conf = TAGS[tKey];
          const isSelected = selectedTag === tKey;
          const tagCount = counts ? counts[tKey] : 0;

          return (
            <TouchableOpacity
              key={tKey}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? conf.color : theme.surfaceMuted,
                  borderColor: isSelected ? conf.color : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                onSelectTag(isSelected ? 'all' : tKey);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={conf.icon as any}
                size={12}
                color={isSelected ? '#ffffff' : conf.color}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#ffffff' : theme.textMuted },
                ]}
              >
                {conf.label}
              </Text>
              {tagCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : theme.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isSelected ? '#ffffff' : theme.textDim },
                    ]}
                  >
                    {tagCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
