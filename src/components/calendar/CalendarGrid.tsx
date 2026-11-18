import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection } from '../../hooks/useHaptics';
import { animateLayout } from '../../utils/animations';

interface CalendarGridProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate: (dateStr: string) => number;
  theme: ThemeColors;
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({
  selectedDate,
  onSelectDate,
  getTaskCountForDate,
  theme,
}: CalendarGridProps) {
  const selectedDayKey = format(selectedDate, 'yyyy-MM-dd');
  const [browsedState, setBrowsedState] = useState<{
    forSelectedDay: string;
    month: Date;
  } | null>(null);

  const currentMonth = useMemo(() => {
    if (browsedState && browsedState.forSelectedDay === selectedDayKey) {
      return browsedState.month;
    }
    return startOfMonth(selectedDate);
  }, [browsedState, selectedDate, selectedDayKey]);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const days = useMemo(() => {
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [monthStart]);

  const today = new Date();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Month Navigator Header */}
      <View style={styles.header}>
        <Text style={[styles.monthTitle, { color: theme.text }]} numberOfLines={1}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border }]}
            onPress={() => {
              hapticSelection();
              animateLayout();
              setBrowsedState({
                forSelectedDay: selectedDayKey,
                month: subMonths(currentMonth, 1),
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={16} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border }]}
            onPress={() => {
              hapticSelection();
              animateLayout();
              setBrowsedState({
                forSelectedDay: selectedDayKey,
                month: addMonths(currentMonth, 1),
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekDaysRow}>
        {WEEK_DAYS.map(wd => (
          <Text key={wd} style={[styles.weekDayLabel, { color: theme.textDim }]}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {days.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isSameDay(day, today);
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = getTaskCountForDate(dateStr);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: theme.primary, borderRadius: 14 },
                !isSelected && isTodayDate && {
                  borderWidth: 1,
                  borderColor: theme.primary,
                  borderRadius: 14,
                },
              ]}
              onPress={() => {
                hapticSelection();
                onSelectDate(day);
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={dateStr}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dayText,
                  {
                    color: isSelected
                      ? '#ffffff'
                      : !isCurrentMonth
                      ? theme.textDim
                      : theme.text,
                    opacity: !isCurrentMonth && !isSelected ? 0.35 : 1,
                    fontWeight: isSelected || isTodayDate ? '700' : '400',
                  },
                ]}
              >
                {format(day, 'd')}
              </Text>

              {/* Task Count Dot Indicator */}
              <View style={styles.dotContainer}>
                {count > 0 ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isSelected ? '#ffffff' : theme.primary },
                    ]}
                  />
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: '14.2857%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  dotContainer: {
    height: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  emptyDot: {
    width: 4,
    height: 4,
  },
});
