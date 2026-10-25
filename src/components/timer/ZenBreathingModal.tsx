import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess } from '../../hooks/useHaptics';
import { playSingingBowl } from '../../services/audio/audioService';

interface ZenBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeColors;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale';

export function ZenBreathingModal({ isOpen, onClose, theme }: ZenBreathingModalProps) {
  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [remainingSeconds, setRemainingSeconds] = useState(180); // 3-min default break
  const [scaleAnim] = useState(() => new Animated.Value(1));

  // 4-4-4 breathing loop
  useEffect(() => {
    if (!isOpen) return;

    playSingingBowl();
    let isMounted = true;

    const runBreathingCycle = () => {
      if (!isMounted) return;

      // Inhale: 4 seconds (scale up)
      setPhase('Inhale');
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (!isMounted) return;

        // Hold: 4 seconds
        setPhase('Hold');
        setTimeout(() => {
          if (!isMounted) return;

          // Exhale: 4 seconds (scale down)
          setPhase('Exhale');
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            if (isMounted) {
              runBreathingCycle();
            }
          });
        }, 4000);
      });
    };

    runBreathingCycle();

    const ticker = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(ticker);
          hapticSuccess();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(ticker);
      scaleAnim.stopAnimation();
    };
  }, [isOpen, scaleAnim, onClose]);

  if (!isOpen) return null;

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,247,250,0.92)' }]}>
        {/* Close / Skip button */}
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => {
            hapticLight();
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={theme.textDim} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Zen Breathing Break</Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            Clear your mind and restore focus • 4-4-4 rhythm
          </Text>
        </View>

        {/* Breathing Orb */}
        <View style={styles.orbContainer}>
          <Animated.View
            style={[
              styles.outerRing,
              {
                borderColor: theme.primaryLight,
                backgroundColor: theme.isDark ? 'rgba(244,114,182,0.1)' : 'rgba(253,242,248,0.7)',
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={[styles.innerCircle, { backgroundColor: theme.primary }]}>
              <Text style={styles.phaseText}>{phase}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Countdown Timer */}
        <View style={styles.timerRow}>
          <Ionicons name="hourglass-outline" size={16} color={theme.primary} />
          <Text style={[styles.timerText, { color: theme.text }]}>
            {mins}:{secs < 10 ? `0${secs}` : secs} remaining
          </Text>
        </View>

        {/* Finish break button */}
        <TouchableOpacity
          style={[styles.finishBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            hapticSuccess();
            onClose();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.finishBtnText}>Finish Break 🌸</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  orbContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  outerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  phaseText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 30,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  finishBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  finishBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
