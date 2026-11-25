import { memo, useMemo, useState } from 'react';
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
  parseISO,
  startOfDay,
} from 'date-fns';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticSelection } from '../../hooks/useHaptics';
import { animateLayout } from '../../utils/animations';
import { useTranslation } from '../../i18n';

interface CalendarGridProps {
  selectedDate: Date;
  todayStr?: string;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate: (dateStr: string) => number;
  theme: ThemeColors;
}

const MONTH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const CalendarGrid = memo(function CalendarGrid({
  selectedDate,
  todayStr,
  onSelectDate,
  getTaskCountForDate,
  theme,
}: CalendarGridProps) {
  const { t, dateLocale, weekStartsOn } = useTranslation();
  const selectedDayKey = format(selectedDate, 'yyyy-MM-dd');
  const [browsedState, setBrowsedState] = useState<{
    forSelectedDay: string;
    month: Date;
  } | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => selectedDate.getFullYear());

  const currentMonth = useMemo(() => {
    if (browsedState && browsedState.forSelectedDay === selectedDayKey) {
      return browsedState.month;
    }
    return startOfMonth(selectedDate);
  }, [browsedState, selectedDate, selectedDayKey]);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const days = useMemo(() => {
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: dateLocale, weekStartsOn });
    const endDate = endOfWeek(monthEnd, { locale: dateLocale, weekStartsOn });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [monthStart, dateLocale, weekStartsOn]);

  const weekDays = useMemo(() => {
    const baseKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    const orderedKeys =
      weekStartsOn === 1 ? [...baseKeys.slice(1), baseKeys[0]] : baseKeys;
    return orderedKeys.map(k => t(`calendar.weekdays.${k}`));
  }, [t, weekStartsOn]);

  const resolvedTodayStr = todayStr ?? format(new Date(), 'yyyy-MM-dd');
  const todayDate = useMemo(() => startOfDay(parseISO(resolvedTodayStr)), [resolvedTodayStr]);
  const isViewingTodayMonth = isSameMonth(currentMonth, todayDate);
  const isSelectedToday = selectedDayKey === resolvedTodayStr;
  const showTodayPill = !isViewingTodayMonth || !isSelectedToday;

  const monthLabels = useMemo(
    () =>
      MONTH_INDICES.map(idx => ({
        idx,
        label: format(new Date(pickerYear, idx, 1), 'MMM', { locale: dateLocale }),
      })),
    [pickerYear, dateLocale]
  );

  const handleJumpToToday = () => {
    hapticSelection();
    animateLayout();
    setIsPickerOpen(false);
    setBrowsedState(null);
    onSelectDate(todayDate);
  };

  const handleTogglePicker = () => {
    hapticSelection();
    animateLayout();
    setIsPickerOpen(prev => {
      const next = !prev;
      if (next) {
        setPickerYear(currentMonth.getFullYear());
      }
      return next;
    });
  };

  const handlePickMonth = (monthIdx: number) => {
    hapticSelection();
    animateLayout();
    setBrowsedState({
      forSelectedDay: selectedDayKey,
      month: new Date(pickerYear, monthIdx, 1),
    });
    setIsPickerOpen(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Month Navigator Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.monthTrigger}
          onPress={handleTogglePicker}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.a11yPickMonthYear')}
          accessibilityState={{ expanded: isPickerOpen }}
        >
          <Text
            style={[styles.monthTitle, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            maxFontSizeMultiplier={1.35}
          >
            {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
          </Text>
          <Ionicons
            name={isPickerOpen ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={theme.textDim}
          />
        </TouchableOpacity>

        <View style={styles.navRow}>
          {showTodayPill && (
            <TouchableOpacity
              style={[
                styles.todayPill,
                {
                  backgroundColor: theme.primaryLight,
                  borderColor: withAlpha(theme.primary, 0.35),
                },
              ]}
              onPress={handleJumpToToday}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t('calendar.a11yJumpToday')}
            >
              <Text style={[styles.todayPillText, { color: theme.primary }]} maxFontSizeMultiplier={1.25}>
                {t('calendar.todayButton')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border }]}
            onPress={() => {
              hapticSelection();
              animateLayout();
              setIsPickerOpen(false);
              setBrowsedState({
                forSelectedDay: selectedDayKey,
                month: subMonths(currentMonth, 1),
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.a11yPrevMonth')}
          >
            <Ionicons name="chevron-back" size={16} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border }]}
            onPress={() => {
              hapticSelection();
              animateLayout();
              setIsPickerOpen(false);
              setBrowsedState({
                forSelectedDay: selectedDayKey,
                month: addMonths(currentMonth, 1),
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.a11yNextMonth')}
          >
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {isPickerOpen ? (
        /* Quick Month & Year Picker */
        <View style={styles.pickerContainer}>
          <View style={[styles.yearRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.yearStepBtn}
              onPress={() => {
                hapticSelection();
                setPickerYear(y => y - 1);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('calendar.a11yPrevYear')}
            >
              <Ionicons name="chevron-back" size={16} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.yearLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              {pickerYear}
            </Text>
            <TouchableOpacity
              style={styles.yearStepBtn}
              onPress={() => {
                hapticSelection();
                setPickerYear(y => y + 1);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('calendar.a11yNextYear')}
            >
              <Ionicons name="chevron-forward" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {monthLabels.map(({ idx, label }) => {
              const isSelectedMonth =
                pickerYear === currentMonth.getFullYear() && idx === currentMonth.getMonth();
              const isTodayMonthCell =
                pickerYear === todayDate.getFullYear() && idx === todayDate.getMonth();

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.monthChip,
                    {
                      backgroundColor: isSelectedMonth
                        ? theme.primary
                        : isTodayMonthCell
                        ? theme.primaryLight
                        : theme.surfaceMuted,
                      borderColor: isSelectedMonth || isTodayMonthCell ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => handlePickMonth(idx)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelectedMonth }}
                >
                  <Text
                    style={[
                      styles.monthChipText,
                      {
                        color: isSelectedMonth
                          ? theme.onPrimary
                          : isTodayMonthCell
                          ? theme.primary
                          : theme.text,
                        fontWeight: isSelectedMonth || isTodayMonthCell ? '700' : '600',
                      },
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <>
          {/* Weekday Labels */}
          <View style={styles.weekDaysRow}>
            {weekDays.map(wd => (
              <Text key={wd} style={[styles.weekDayLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {days.map(day => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const dateStr = format(day, 'yyyy-MM-dd');
              const isTodayDate = dateStr === resolvedTodayStr;
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
                  accessibilityLabel={format(day, t('dates.fullDate'), { locale: dateLocale })}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? theme.onPrimary
                          : !isCurrentMonth
                          ? theme.textDim
                          : theme.text,
                        opacity: !isCurrentMonth && !isSelected ? 0.35 : 1,
                        fontWeight: isSelected || isTodayDate ? '700' : '400',
                      },
                    ]}
                    maxFontSizeMultiplier={1.45}
                  >
                    {format(day, 'd', { locale: dateLocale })}
                  </Text>

                  {/* Task Count Dot Indicator */}
                  <View style={styles.dotContainer}>
                    {count > 0 ? (
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: isSelected ? theme.onPrimary : theme.primary },
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
        </>
      )}
    </View>
  );
});

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
    gap: 8,
  },
  monthTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
    minHeight: 36,
    paddingVertical: 4,
    paddingRight: 4,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  todayPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    gap: 12,
    paddingTop: 2,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 6,
    minHeight: 42,
  },
  yearStepBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  monthChip: {
    width: '23.5%',
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  monthChipText: {
    fontSize: 13,
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
    minHeight: 48,
    paddingVertical: 4,
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
