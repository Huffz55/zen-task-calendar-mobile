import { View, Text, StyleSheet } from 'react-native';
import { format, isValid, parseISO } from 'date-fns';
import { ThemeColors } from '../../constants/colors';
import { DayFocusStat } from '../../hooks/useFocusStats';
import { Ionicons } from '@expo/vector-icons';
import { formatDurationCompact, useTranslation } from '../../i18n';

interface FocusAnalyticsCardProps {
  theme: ThemeColors;
  totalFocusSeconds: number;
  totalSessionsCount: number;
  todayFocusSeconds: number;
  weeklyDays: DayFocusStat[];
  maxDaySeconds: number;
}

export function FocusAnalyticsCard({
  theme,
  totalFocusSeconds,
  totalSessionsCount,
  todayFocusSeconds,
  weeklyDays,
  maxDaySeconds,
}: FocusAnalyticsCardProps) {
  const { t, language, dateLocale } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="bar-chart-outline" size={17} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
            {t('focus.analyticsTitle')}
          </Text>
        </View>
        <Text
          style={[styles.badge, { color: theme.primary, backgroundColor: theme.primaryLight }]}
          maxFontSizeMultiplier={1.35}
        >
          {t('focus.analyticsSessionsCount', { count: totalSessionsCount })}
        </Text>
      </View>

      {/* KPI Row */}
      <View style={[styles.kpiRow, { borderBottomColor: theme.border }]}>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
            {t('focus.analyticsToday')}
          </Text>
          <Text style={[styles.kpiValue, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
            {formatDurationCompact(todayFocusSeconds, language)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: theme.textDim }]} maxFontSizeMultiplier={1.35}>
            {t('focus.analyticsTotal')}
          </Text>
          <Text style={[styles.kpiValue, { color: theme.text }]} maxFontSizeMultiplier={1.35}>
            {formatDurationCompact(totalFocusSeconds, language)}
          </Text>
        </View>
      </View>

      {/* Weekly Bar Chart */}
      <View style={styles.chartContainer}>
        {weeklyDays.map(day => {
          const heightPercent =
            maxDaySeconds > 0 && day.seconds > 0
              ? Math.max(12, Math.round((day.seconds / maxDaySeconds) * 100))
              : 6;
          const parsedDay = parseISO(day.dateStr);
          const dayLabel = isValid(parsedDay)
            ? format(parsedDay, 'EEE', { locale: dateLocale })
            : day.dayName;

          return (
            <View key={day.dateStr} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: day.isToday
                        ? theme.primary
                        : day.seconds > 0
                        ? theme.accent
                        : theme.surfaceMuted,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: day.isToday ? theme.primary : theme.textDim,
                    fontWeight: day.isToday ? '700' : '500',
                  },
                ]}
              >
                {dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    paddingTop: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: 14,
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  dayLabel: {
    fontSize: 11,
  },
});
