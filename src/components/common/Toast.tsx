import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppToast } from '../../types';
import { ThemeColors, withAlpha } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../hooks/useHaptics';
import { useTranslation } from '../../i18n';

interface ToastProps {
  toast: AppToast | null;
  onDismiss: () => void;
  theme: ThemeColors;
  hasMiniPlayer?: boolean;
}

export function Toast({ toast, onDismiss, theme, hasMiniPlayer = false }: ToastProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(20));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;

    translateY.setValue(18);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const durationMs = toast.type === 'undo' ? 4500 : 2800;
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 14,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, durationMs);

    return () => clearTimeout(timeout);
  }, [toast, onDismiss, opacity, translateY]);

  if (!toast) return null;

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (toast.type) {
      case 'undo':
        return 'arrow-undo-outline';
      case 'error':
        return 'alert-circle-outline';
      case 'warning':
        return 'warning-outline';
      default:
        return 'checkmark-circle-outline';
    }
  };

  const getToneColor = (): string => {
    switch (toast.type) {
      case 'error':
        return theme.danger;
      case 'warning':
        return theme.warning;
      case 'success':
        return theme.success;
      default:
        return theme.primary;
    }
  };

  const toneColor = getToneColor();
  const bottomOffset = Math.max(insets.bottom, 10) + 74 + (hasMiniPlayer ? 62 : 0);

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(toneColor, theme.isDark ? 0.2 : 0.12) }]}>
          <Ionicons name={getIconName()} size={18} color={toneColor} />
        </View>

        <View style={styles.textContainer}>
          {toast.title && (
            <Text style={[styles.title, { color: toneColor }]} numberOfLines={1} ellipsizeMode="tail">
              {toast.title}
            </Text>
          )}
          <Text style={[styles.message, { color: theme.text }]} numberOfLines={2} ellipsizeMode="tail">
            {toast.message}
          </Text>
        </View>

        {toast.actionLabel && toast.onAction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
            onPress={() => {
              hapticLight();
              toast.onAction?.();
              onDismiss();
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.actionText, { color: theme.primary }]}>{toast.actionLabel}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onDismiss();
          }}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('toasts.a11yDismiss')}
        >
          <Ionicons name="close" size={16} color={theme.textDim} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
});
