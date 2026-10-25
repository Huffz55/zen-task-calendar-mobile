import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { HeatmapDay } from '../../hooks/useFocusStats';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../hooks/useHaptics';

interface ZenHeatmapProps {
  theme: ThemeColors;
  days: HeatmapDay[];
}

function formatMinutes(seconds: number): string {
  if (seconds <= 0) return 'No focus';
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins}m focus`;
}

export function ZenHeatmap({ theme, days }: ZenHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  // Group 84 days into 12 columns of 7 days
  const columns: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  const getTileColor = (level: number) => {
    switch (level) {
      case 4:
        return theme.primary;
      case 3:
        return theme.accent || theme.primary;
      case 2:
        return theme.primaryLight;
      case 1:
        return theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(244,114,182,0.25)';
      default:
        return theme.surfaceMuted;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="grid-outline" size={16} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Zen Activity Matrix</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textDim }]}>Last 12 Weeks</Text>
      </View>

      {/* Selected Day Tooltip */}
      {selectedDay && (
        <View style={[styles.tooltipPill, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
          <Text style={[styles.tooltipDate, { color: theme.primary }]}>
            {selectedDay.dateStr}:
          </Text>
          <Text style={[styles.tooltipValue, { color: theme.text }]}>
            {formatMinutes(selectedDay.seconds)}
          </Text>
        </View>
      )}

      {/* Matrix Columns */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matrixScroll}>
        <View style={styles.matrixGrid}>
          {columns.map((col, colIdx) => (
            <View key={colIdx} style={styles.column}>
              {col.map((day) => {
                const isSelected = selectedDay?.dateStr === day.dateStr;
                return (
                  <TouchableOpacity
                    key={day.dateStr}
                    style={[
                      styles.tile,
                      {
                        backgroundColor: getTileColor(day.level),
                        borderColor: isSelected
                          ? theme.primary
                          : day.isToday
                          ? theme.accent
                          : 'transparent',
                        borderWidth: isSelected || day.isToday ? 1.5 : 0.5,
                      },
                    ]}
                    onPress={() => {
                      hapticLight();
                      setSelectedDay(isSelected ? null : day);
                    }}
                    activeOpacity={0.7}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: theme.textDim }]}>Less</Text>
        <View style={styles.legendTiles}>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <View key={lvl} style={[styles.legendTile, { backgroundColor: getTileColor(lvl) }]} />
          ))}
        </View>
        <Text style={[styles.legendText, { color: theme.textDim }]}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  tooltipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  matrixScroll: {
    paddingVertical: 4,
  },
  matrixGrid: {
    flexDirection: 'row',
    gap: 5,
  },
  column: {
    flexDirection: 'column',
    gap: 5,
  },
  tile: {
    width: 14,
    height: 14,
    borderRadius: 3.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 12,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  legendTiles: {
    flexDirection: 'row',
    gap: 3,
  },
  legendTile: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
  },
});
