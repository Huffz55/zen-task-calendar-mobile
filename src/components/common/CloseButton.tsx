import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../constants/colors';
import { hapticLight } from '../../hooks/useHaptics';
import { useBottomSheetClose } from './SwipeableBottomSheet';

interface CloseButtonProps {
  theme: ThemeColors;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Unified 36x36 circular close button with soft elevated surface, hairline border,
 * and expanded >= 48x48dp touch hitbox. Automatically triggers animated bottom-sheet
 * dismissal when rendered inside SwipeableBottomSheet and no custom `onPress` is supplied.
 */
export function CloseButton({
  theme,
  accessibilityLabel,
  onPress,
  disabled = false,
  style,
}: CloseButtonProps) {
  const sheetClose = useBottomSheetClose();

  const handlePress = () => {
    if (disabled) return;
    hapticLight();
    if (onPress) {
      onPress();
    } else {
      sheetClose?.();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Ionicons name="close" size={18} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
