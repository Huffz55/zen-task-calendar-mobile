import { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { BuiltinTaskTag, CustomTag, TaskTag } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { TAGS, resolveTagConfig } from '../../constants/tags';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSelection } from '../../hooks/useHaptics';
import { animateLayout } from '../../utils/animations';
import { useTranslation } from '../../i18n';

const EMPTY_CUSTOM_TAGS: CustomTag[] = [];

interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  selectedTag: TaskTag | 'all';
  onSelectTag: (tag: TaskTag | 'all') => void;
  theme: ThemeColors;
  counts?: Record<string, number>;
  customTags?: CustomTag[];
}

export const TaskFilterBar = memo(function TaskFilterBar({
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  theme,
  counts,
  customTags = EMPTY_CUSTOM_TAGS,
}: TaskFilterBarProps) {
  const { t, language } = useTranslation();
  const builtinKeys = Object.keys(TAGS) as BuiltinTaskTag[];
  const extraTagKeys = Array.from(
    new Set([
      ...customTags.map(t => t.id),
      ...Object.keys(counts || {}).filter(k => k !== 'all' && !(k in TAGS) && (counts?.[k] || 0) > 0),
    ])
  ) as TaskTag[];
  const tagKeys: TaskTag[] = [...builtinKeys, ...extraTagKeys];

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
          placeholder={t('tasks.searchPlaceholder')}
          placeholderTextColor={theme.textDim}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              animateLayout();
              onSearchChange('');
            }}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('tasks.a11yClearSearch')}
          >
            <Ionicons name="close-circle" size={16} color={theme.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag Filter Chips Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
            hapticSelection();
            animateLayout();
            onSelectTag('all');
          }}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTag === 'all' }}
        >
          <Text
            style={[
              styles.chipText,
              { color: selectedTag === 'all' ? theme.onPrimary : theme.textMuted },
            ]}
            numberOfLines={1}
          >
            {t('common.all')}
          </Text>
          {counts && counts.all > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    selectedTag === 'all'
                      ? theme.isDark
                        ? 'rgba(0,0,0,0.2)'
                        : 'rgba(255,255,255,0.25)'
                      : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: selectedTag === 'all' ? theme.onPrimary : theme.textDim },
                ]}
              >
                {counts.all}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Individual Tag Chips */}
        {tagKeys.map(tKey => {
          const conf = resolveTagConfig(tKey, customTags, language);
          const isSelected = selectedTag === tKey;
          const tagCount = counts ? (counts[tKey] || 0) : 0;

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
                hapticSelection();
                animateLayout();
                onSelectTag(isSelected ? 'all' : tKey);
              }}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons
                name={conf.icon}
                size={12}
                color={isSelected ? '#ffffff' : conf.color}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#ffffff' : theme.textMuted },
                ]}
                numberOfLines={1}
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
});

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
    minHeight: 36,
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
    fontVariant: ['tabular-nums'],
  },
});
