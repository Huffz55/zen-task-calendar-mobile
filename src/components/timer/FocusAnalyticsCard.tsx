import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { DayFocusStat } from '../../hooks/useFocusStats';
import { Ionicons } from '@expo/vector-icons';

interface FocusAnalyticsCardProps {
  theme: ThemeColors;
  totalFocusSeconds: number;
  totalSessionsCount: number;
  todayFocusSeconds: number;
  weeklyDays: DayFocusStat[];
  maxDaySeconds: number;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function FocusAnalyticsCard({
  theme,
  totalFocusSeconds,
  totalSessionsCount,
  todayFocusSeconds,
  weeklyDays,
  maxDaySeconds,
}: FocusAnalyticsCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="bar-chart-outline" size={17} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Weekly Focus Analytics</Text>
        </View>
        <Text style={[styles.badge, { color: theme.primary, backgroundColor: theme.primaryLight }]}>
          {totalSessionsCount} Sessions 🧘
        </Text>
      </View>

      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: theme.textDim }]}>TODAY</Text>
          <Text style={[styles.kpiValue, { color: theme.text }]}>
            {formatDuration(todayFocusSeconds)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: theme.textDim }]}>TOTAL FOCUS</Text>
          <Text style={[styles.kpiValue, { color: theme.text }]}>
            {formatDuration(totalFocusSeconds)}
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
                {day.dayName}
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
    marginHorizontal: 24,
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
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
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
