import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderHandlers,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../../constants/colors';
import { hapticSelection } from '../../hooks/useHaptics';

interface SwipeableBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeColors;
  children: React.ReactNode;
  maxHeight?: ViewStyle['maxHeight'];
  sheetStyle?: StyleProp<ViewStyle>;
  useKeyboardAvoiding?: boolean;
}

interface BottomSheetContextValue {
  reportScrollOffset: (offsetY: number) => void;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 0.5;
const SHEET_HIDDEN_Y = 540;

interface SheetController {
  translateY: Animated.Value;
  backdropOpacity: Animated.Value;
  handlePanHandlers: GestureResponderHandlers;
  sheetPanHandlers: GestureResponderHandlers;
  contextValue: BottomSheetContextValue;
  setOnClose: (fn: () => void) => void;
  playOpen: () => void;
  dismissWithAnimation: () => void;
}

function createSheetController(initialOnClose: () => void): SheetController {
  const translateY = new Animated.Value(SHEET_HIDDEN_Y);
  const backdropOpacity = new Animated.Value(0);

  let scrollOffset = 0;
  let isClosing = false;
  let dragBaseDy = 0;
  let hasPassedThreshold = false;
  let onCloseHandler = initialOnClose;

  const updateDrag = (nextY: number) => {
    translateY.setValue(nextY);
    backdropOpacity.setValue(Math.max(0.2, 1 - nextY / 420));
    if (nextY > DISMISS_DISTANCE && !hasPassedThreshold) {
      hasPassedThreshold = true;
      hapticSelection();
    } else if (nextY <= DISMISS_DISTANCE - 10 && hasPassedThreshold) {
      hasPassedThreshold = false;
    }
  };

  const dismissWithAnimation = () => {
    if (isClosing) return;
    isClosing = true;
    Keyboard.dismiss();

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HIDDEN_Y,
        duration: 185,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 175,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosing = false;
      onCloseHandler();
    });
  };

  const snapBack = () => {
    hasPassedThreshold = false;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 260,
        mass: 0.75,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isClosing,
    onStartShouldSetPanResponderCapture: () => !isClosing,
    onMoveShouldSetPanResponder: () => !isClosing,
    onMoveShouldSetPanResponderCapture: () => !isClosing,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      dragBaseDy = 0;
      hasPassedThreshold = false;
      translateY.stopAnimation();
    },
    onPanResponderMove: (_, gs) => {
      if (isClosing) return;
      updateDrag(Math.max(0, gs.dy));
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
        dismissWithAnimation();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => {
      snapBack();
    },
  });

  const sheetPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, gs) => {
      if (isClosing) return false;
      if (scrollOffset > 2) return false;
      return gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.25;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (_, gs) => {
      dragBaseDy = Math.max(0, gs.dy);
      hasPassedThreshold = false;
      translateY.stopAnimation();
    },
    onPanResponderMove: (_, gs) => {
      if (isClosing) return;
      updateDrag(Math.max(0, gs.dy - dragBaseDy));
    },
    onPanResponderRelease: (_, gs) => {
      const dragDistance = Math.max(0, gs.dy - dragBaseDy);
      if (dragDistance > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
        dismissWithAnimation();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => {
      snapBack();
    },
  });

  const playOpen = () => {
    isClosing = false;
    scrollOffset = 0;
    dragBaseDy = 0;
    hasPassedThreshold = false;
    translateY.setValue(SHEET_HIDDEN_Y);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 26,
        stiffness: 300,
        mass: 0.78,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    translateY,
    backdropOpacity,
    handlePanHandlers: handlePanResponder.panHandlers,
    sheetPanHandlers: sheetPanResponder.panHandlers,
    contextValue: {
      reportScrollOffset: (offsetY: number) => {
        scrollOffset = offsetY;
      },
    },
    setOnClose: (fn: () => void) => {
      onCloseHandler = fn;
    },
    playOpen,
    dismissWithAnimation,
  };
}

/**
 * ScrollView aware of parent SwipeableBottomSheet so downward pull-to-dismiss
 * engages smoothly when scrolled to top (`offsetY <= 0`) without clipping normal scrolling.
 */
export function BottomSheetScrollView({
  onScroll,
  bounces = false,
  overScrollMode = 'never',
  scrollEventThrottle = 16,
  children,
  ...rest
}: ScrollViewProps) {
  const sheetCtx = useContext(BottomSheetContext);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      sheetCtx?.reportScrollOffset(event.nativeEvent.contentOffset.y);
      onScroll?.(event);
    },
    [sheetCtx, onScroll]
  );

  return (
    <ScrollView
      {...rest}
      bounces={bounces}
      overScrollMode={overScrollMode}
      scrollEventThrottle={scrollEventThrottle}
      onScroll={handleScroll}
    >
      {children}
    </ScrollView>
  );
}

/**
 * Reusable modal bottom sheet with independent backdrop fade, native-driver
 * sheet translation, >=44px drag handle responder, and top-of-scroll pull-to-dismiss.
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
  const insets = useSafeAreaInsets();
  const [controller] = useState(() => createSheetController(onClose));

  useEffect(() => {
    controller.setOnClose(onClose);
  }, [controller, onClose]);

  useEffect(() => {
    if (visible) {
      controller.playOpen();
    }
  }, [controller, visible]);

  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 18) + 8;

  const content = (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: controller.backdropOpacity },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={controller.dismissWithAnimation} />
      </Animated.View>
      <Animated.View
        {...controller.sheetPanHandlers}
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            maxHeight,
            paddingBottom: safeBottomPadding,
            transform: [{ translateY: controller.translateY }],
          },
          sheetStyle,
        ]}
      >
        <View style={styles.dragArea} {...controller.handlePanHandlers}>
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.18)' },
            ]}
          />
        </View>
        <BottomSheetContext.Provider value={controller.contextValue}>
          {children}
        </BottomSheetContext.Provider>
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={controller.dismissWithAnimation}
    >
      {useKeyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 0,
    borderWidth: 1,
    width: '100%',
  },
  dragArea: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 14,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
