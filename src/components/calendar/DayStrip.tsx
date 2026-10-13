import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { format, addDays, subDays } from 'date-fns';
import { ThemeColors } from '../../constants/colors';
import { hapticLight } from '../../hooks/useHaptics';

interface DayStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate: (dateStr: string) => number;
  theme: ThemeColors;
}

export function DayStrip({
  selectedDate,
  onSelectDate,
  getTaskCountForDate,
  theme,
}: DayStripProps) {
  // Generate 14 days centered around today (-3 to +10 days)
  const today = new Date();
  const days = Array.from({ length: 14 }).map((_, i) => addDays(subDays(today, 3), i));
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(today, 'yyyy-MM-dd');

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((date, idx) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedStr;
          const isToday = dateStr === todayStr;
          const taskCount = getTaskCountForDate(dateStr);

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCard,
                {
                  backgroundColor: isSelected
                    ? theme.primary
                    : isToday
                    ? theme.surfaceMuted
                    : theme.card,
                  borderColor: isSelected
                    ? theme.primary
                    : isToday
                    ? theme.border
                    : theme.border,
                },
              ]}
              onPress={() => {
                hapticLight();
                onSelectDate(date);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayOfWeek,
                  { color: isSelected ? '#ffffff' : theme.textDim },
                ]}
              >
                {format(date, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  { color: isSelected ? '#ffffff' : theme.text },
                ]}
              >
                {format(date, 'd')}
              </Text>

              {/* Task Indicator Dot */}
              <View style={styles.dotContainer}>
                {taskCount > 0 ? (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isSelected
                          ? '#ffffff'
                          : theme.primary,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayCard: {
    width: 50,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 6,
  },
  dayOfWeek: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 2,
  },
  dotContainer: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  emptyDot: {
    width: 5,
    height: 5,
  },
});
