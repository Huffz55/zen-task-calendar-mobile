import React, { useState } from 'react';
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
import { hapticLight } from '../../hooks/useHaptics';

interface CalendarGridProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate: (dateStr: string) => number;
  theme: ThemeColors;
}

export function CalendarGrid({
  selectedDate,
  onSelectDate,
  getTaskCountForDate,
  theme,
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Month Navigator Header */}
      <View style={styles.header}>
        <Text style={[styles.monthTitle, { color: theme.text }]}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              setCurrentMonth(prev => subMonths(prev, 1));
            }}
          >
            <Ionicons name="chevron-back" size={16} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              setCurrentMonth(prev => addMonths(prev, 1));
            }}
          >
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((wd, i) => (
          <Text key={i} style={[styles.weekDayLabel, { color: theme.textDim }]}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {days.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isSameDay(day, today);
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = getTaskCountForDate(dateStr);

          return (
            <TouchableOpacity
              key={idx}
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
                hapticLight();
                onSelectDate(day);
              }}
              activeOpacity={0.7}
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
    marginHorizontal: 16,
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
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
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
