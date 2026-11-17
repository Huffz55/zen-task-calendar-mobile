import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ThemeColors } from '../../constants/colors';

interface SwipeableBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeColors;
  children: React.ReactNode;
  maxHeight?: ViewStyle['maxHeight'];
  sheetStyle?: StyleProp<ViewStyle>;
  useKeyboardAvoiding?: boolean;
}

const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.55;

/**
 * Reusable modal bottom sheet that supports smooth downward swipe-to-dismiss
 * and adapts cleanly to light/dark themes.
 */
export function SwipeableBottomSheet({
  visible,
  onClose,
  theme,
  children,
  maxHeight = '88%',
  sheetStyle,
  useKeyboardAvoiding = false,
}: SwipeableBottomSheetProps) {
  const [translateY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2,
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) {
            translateY.setValue(gs.dy);
          }
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
            Animated.timing(translateY, {
              toValue: 500,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              translateY.setValue(0);
              onClose();
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              damping: 22,
              stiffness: 240,
              mass: 0.8,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateY, onClose]
  );

  const content = (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            maxHeight,
            transform: [{ translateY }],
          },
          sheetStyle,
        ]}
      >
        <View style={styles.dragArea} {...panResponder.panHandlers}>
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)' },
            ]}
          />
        </View>
        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {useKeyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    width: '100%',
  },
  dragArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
});
