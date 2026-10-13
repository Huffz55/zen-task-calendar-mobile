import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppToast } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../hooks/useHaptics';

interface ToastProps {
  toast: AppToast | null;
  onDismiss: () => void;
  theme: ThemeColors;
}

export function Toast({ toast, onDismiss, theme }: ToastProps) {
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

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name={getIconName()} size={18} color={theme.primary} />
        </View>

        <View style={styles.textContainer}>
          {toast.title && (
            <Text style={[styles.title, { color: theme.primary }]}>{toast.title}</Text>
          )}
          <Text style={[styles.message, { color: theme.text }]} numberOfLines={2}>
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
          >
            <Text style={[styles.actionText, { color: theme.primary }]}>{toast.actionLabel}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={16} color={theme.textDim} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 84,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
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
    padding: 4,
  },
});
