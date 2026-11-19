import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ThemeColors } from '../../constants/colors';
import { hapticSelection } from '../../hooks/useHaptics';
import { useTranslation } from '../../i18n';

interface DayStripProps {
  selectedDate: Date;
  todayStr?: string;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate: (dateStr: string) => number;
  theme: ThemeColors;
}

const DAY_CARD_STRIDE = 58; // width (50) + gap (8)

export function DayStrip({
  selectedDate,
  todayStr,
  onSelectDate,
  getTaskCountForDate,
  theme,
}: DayStripProps) {
  const { language, dateLocale } = useTranslation();
  const scrollRef = useRef<ScrollView | null>(null);
  const resolvedTodayStr = todayStr ?? format(new Date(), 'yyyy-MM-dd');
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');

  // Generate 14 days centered around today (-3 to +10 days)
  const days = useMemo(() => {
    const base = parseISO(resolvedTodayStr);
    const upperLocale = language === 'tr' ? 'tr-TR' : 'en-US';
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(subDays(base, 3), i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        dayOfWeek: format(date, 'EEE', { locale: dateLocale }).toLocaleUpperCase(upperLocale),
        dayNum: format(date, 'd', { locale: dateLocale }),
      };
    });
  }, [resolvedTodayStr, dateLocale, language]);

  useEffect(() => {
    const index = days.findIndex(d => d.dateStr === selectedStr);
    if (index >= 0 && scrollRef.current) {
      const targetX = Math.max(0, (index - 2) * DAY_CARD_STRIDE);
      scrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [days, selectedStr]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map(item => {
          const isSelected = item.dateStr === selectedStr;
          const isToday = item.dateStr === resolvedTodayStr;
          const taskCount = getTaskCountForDate(item.dateStr);

          return (
            <TouchableOpacity
              key={item.dateStr}
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
                    ? theme.accent || theme.border
                    : theme.border,
                },
              ]}
              onPress={() => {
                hapticSelection();
                onSelectDate(item.date);
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${item.dayOfWeek} ${item.dayNum}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dayOfWeek,
                  { color: isSelected ? '#ffffff' : theme.textDim },
                ]}
                maxFontSizeMultiplier={1.35}
              >
                {item.dayOfWeek}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  { color: isSelected ? '#ffffff' : theme.text },
                ]}
                maxFontSizeMultiplier={1.35}
              >
                {item.dayNum}
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
    paddingHorizontal: 20,
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
    letterSpacing: 0.5,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
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
