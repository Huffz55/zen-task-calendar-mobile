import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import {
  AmbientSoundType,
  AMBIENT_TRACKS,
  playAmbientSound,
  stopAmbientSound,
  setAmbientVolume,
  getActiveAmbientSound,
  getAmbientVolume,
} from '../../services/audio/audioService';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../hooks/useHaptics';

interface AmbientSoundBarProps {
  theme: ThemeColors;
  isTimerRunning: boolean;
}

export function AmbientSoundBar({ theme, isTimerRunning }: AmbientSoundBarProps) {
  const [selectedSound, setSelectedSound] = useState<AmbientSoundType>(getActiveAmbientSound());
  const [volume, setVolumeState] = useState<number>(getAmbientVolume());

  const soundKeys: AmbientSoundType[] = ['none', 'rain', 'waves', 'forest', 'wind', 'fire'];

  const handleSelect = (sound: AmbientSoundType) => {
    hapticLight();
    setSelectedSound(sound);
    if (sound === 'none') {
      stopAmbientSound();
    } else {
      playAmbientSound(sound, volume);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    hapticLight();
    setVolumeState(newVol);
    setAmbientVolume(newVol);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="headset-outline" size={17} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Zen Ambient Sounds</Text>
        </View>
        {selectedSound !== 'none' && (
          <View style={[styles.activePill, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.activePillText, { color: theme.primary }]}>Playing 🎵</Text>
          </View>
        )}
      </View>

      {/* Sound Pills Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {soundKeys.map(key => {
          const config = AMBIENT_TRACKS[key];
          const isSelected = selectedSound === key;

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleSelect(key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={config.icon as any}
                size={14}
                color={isSelected ? '#ffffff' : theme.textMuted}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#ffffff' : theme.textMuted },
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Volume Controls (Only visible when a sound is active) */}
      {selectedSound !== 'none' && (
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low-outline" size={16} color={theme.textDim} />
          <View style={styles.volumePresets}>
            {[0.25, 0.5, 0.75, 1.0].map(v => {
              const isVolActive = Math.abs(volume - v) < 0.1;
              return (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.volBtn,
                    {
                      backgroundColor: isVolActive ? theme.primary : theme.surfaceMuted,
                      borderColor: isVolActive ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => handleVolumeChange(v)}
                >
                    <Text
                      style={[
                        styles.volBtnText,
                        { color: isVolActive ? '#ffffff' : theme.textDim },
                      ]}
                    >
                      {Math.round(v * 100)}%
                    </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Ionicons name="volume-high-outline" size={16} color={theme.textDim} />
        </View>
      )}
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
    marginBottom: 12,
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
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  volumePresets: {
    flexDirection: 'row',
    gap: 8,
  },
  volBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  volBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
