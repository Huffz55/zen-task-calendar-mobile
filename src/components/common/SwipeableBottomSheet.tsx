import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderHandlers,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../../constants/colors';
import { hapticSelection } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface SwipeableBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeColors;
  children: React.ReactNode;
  maxHeight?: ViewStyle['maxHeight'];
  sheetStyle?: StyleProp<ViewStyle>;
  useKeyboardAvoiding?: boolean;
  closeDisabled?: boolean;
}

interface BottomSheetContextValue {
  reportScrollOffset: (offsetY: number) => void;
  requestClose: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 0.5;
const OPEN_ANIM_DURATION_MS = 290;
const CLOSE_ANIM_DURATION_MS = 270;
const SHEET_OFFSCREEN_PADDING = 32;
const OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CLOSE_EASING = Easing.bezier(0.32, 0.72, 0, 1);

interface SheetController {
  translateY: Animated.Value;
  backdropOpacity: Animated.Value;
  handlePanHandlers: GestureResponderHandlers;
  sheetPanHandlers: GestureResponderHandlers;
  contextValue: BottomSheetContextValue;
  updateConfig: (cfg: {
    onClose: () => void;
    fallbackHiddenY: number;
    reducedMotion: boolean;
    closeDisabled: boolean;
    sheetHeightRef: React.MutableRefObject<number>;
    isClosingRef: React.MutableRefObject<boolean>;
  }) => void;
  notifyLayoutMeasured: () => void;
  playOpen: () => void;
  resetHidden: () => void;
  dismissWithAnimation: () => void;
  dispose: () => void;
}

function createSheetController(initialHiddenY: number): SheetController {
  const translateY = new Animated.Value(initialHiddenY);
  const backdropOpacity = new Animated.Value(0);

  let scrollOffset = 0;
  let dragBaseDy = 0;
  let hasPassedThreshold = false;
  let fallbackHiddenY = initialHiddenY;
  let reducedMotion = false;
  let closeDisabled = false;
  let pendingOpen = false;
  let hasMeasuredThisMount = false;
  let openRafId: number | null = null;
  let onCloseHandler: () => void = () => {};
  let sheetHeightRef: React.MutableRefObject<number> = { current: 0 };
  let isClosingRef: React.MutableRefObject<boolean> = { current: false };

  const getDismissY = () =>
    sheetHeightRef.current > 0
      ? sheetHeightRef.current + SHEET_OFFSCREEN_PADDING
      : fallbackHiddenY;

  const cancelOpenRaf = () => {
    if (openRafId !== null) {
      cancelAnimationFrame(openRafId);
      openRafId = null;
    }
  };

  const updateDrag = (nextY: number) => {
    translateY.setValue(nextY);
    const fadeRange = Math.max(200, getDismissY() * 0.75);
    backdropOpacity.setValue(Math.max(0.15, 1 - nextY / fadeRange));
    if (nextY > DISMISS_DISTANCE && !hasPassedThreshold) {
      hasPassedThreshold = true;
      hapticSelection();
    } else if (nextY <= DISMISS_DISTANCE - 10 && hasPassedThreshold) {
      hasPassedThreshold = false;
    }
  };

  const finishClose = () => {
    // Keep translateY off-screen and backdropOpacity at 0 until the next open;
    // dismiss keyboard only after slide-out completes so Android KeyboardAvoidingView
    // never relayouts mid-animation.
    Keyboard.dismiss();
    onCloseHandler();
  };

  const dismissWithAnimation = () => {
    if (isClosingRef.current || closeDisabled) return;
    isClosingRef.current = true;
    pendingOpen = false;
    cancelOpenRaf();
    translateY.stopAnimation();
    backdropOpacity.stopAnimation();

    const dismissY = getDismissY();

    if (reducedMotion) {
      translateY.setValue(dismissY);
      backdropOpacity.setValue(0);
      finishClose();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: dismissY,
        duration: CLOSE_ANIM_DURATION_MS,
        easing: CLOSE_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: CLOSE_ANIM_DURATION_MS,
        easing: CLOSE_EASING,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isClosingRef.current) {
        finishClose();
      }
    });
  };

  const snapBack = () => {
    if (isClosingRef.current) return;
    hasPassedThreshold = false;
    if (reducedMotion) {
      translateY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: OPEN_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: OPEN_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isClosingRef.current && !closeDisabled,
    onStartShouldSetPanResponderCapture: () => !isClosingRef.current && !closeDisabled,
    onMoveShouldSetPanResponder: () => !isClosingRef.current && !closeDisabled,
    onMoveShouldSetPanResponderCapture: () => !isClosingRef.current && !closeDisabled,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      if (isClosingRef.current) return;
      dragBaseDy = 0;
      hasPassedThreshold = false;
      translateY.stopAnimation();
    },
    onPanResponderMove: (_, gs) => {
      if (isClosingRef.current) return;
      updateDrag(Math.max(0, gs.dy));
    },
    onPanResponderRelease: (_, gs) => {
      if (isClosingRef.current) return;
      if (gs.dy > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
        dismissWithAnimation();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => {
      if (isClosingRef.current) return;
      snapBack();
    },
  });

  const sheetPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, gs) => {
      if (isClosingRef.current || closeDisabled) return false;
      if (scrollOffset > 2) return false;
      return gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.25;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (_, gs) => {
      if (isClosingRef.current) return;
      dragBaseDy = Math.max(0, gs.dy);
      hasPassedThreshold = false;
      translateY.stopAnimation();
    },
    onPanResponderMove: (_, gs) => {
      if (isClosingRef.current) return;
      updateDrag(Math.max(0, gs.dy - dragBaseDy));
    },
    onPanResponderRelease: (_, gs) => {
      if (isClosingRef.current) return;
      const dragDistance = Math.max(0, gs.dy - dragBaseDy);
      if (dragDistance > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
        dismissWithAnimation();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => {
      if (isClosingRef.current) return;
      snapBack();
    },
  });

  const startOpenAnimation = () => {
    openRafId = null;
    if (!pendingOpen || isClosingRef.current) return;
    pendingOpen = false;

    if (reducedMotion) {
      translateY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }

    translateY.setValue(getDismissY());
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: OPEN_ANIM_DURATION_MS,
        easing: OPEN_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: OPEN_ANIM_DURATION_MS,
        easing: OPEN_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const notifyLayoutMeasured = () => {
    hasMeasuredThisMount = true;
    if (!pendingOpen || isClosingRef.current) return;
    cancelOpenRaf();
    openRafId = requestAnimationFrame(startOpenAnimation);
  };

  const playOpen = () => {
    isClosingRef.current = false;
    scrollOffset = 0;
    dragBaseDy = 0;
    hasPassedThreshold = false;
    cancelOpenRaf();
    translateY.stopAnimation();
    backdropOpacity.stopAnimation();

    if (reducedMotion) {
      pendingOpen = false;
      translateY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }

    translateY.setValue(getDismissY());
    backdropOpacity.setValue(0);
    pendingOpen = true;

    // Wait until after the initial layout pass + next clean frame so mount cost
    // does not drop the opening animation's first frames.
    openRafId = requestAnimationFrame(() => {
      if (!pendingOpen || isClosingRef.current) return;
      if (hasMeasuredThisMount) {
        startOpenAnimation();
      } else {
        openRafId = requestAnimationFrame(startOpenAnimation);
      }
    });
  };

  const resetHidden = () => {
    isClosingRef.current = false;
    pendingOpen = false;
    hasMeasuredThisMount = false;
    scrollOffset = 0;
    dragBaseDy = 0;
    hasPassedThreshold = false;
    cancelOpenRaf();
    translateY.stopAnimation();
    backdropOpacity.stopAnimation();
    translateY.setValue(getDismissY());
    backdropOpacity.setValue(0);
  };

  const dispose = () => {
    cancelOpenRaf();
    pendingOpen = false;
    translateY.stopAnimation();
    backdropOpacity.stopAnimation();
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
      requestClose: dismissWithAnimation,
    },
    updateConfig: (cfg) => {
      onCloseHandler = cfg.onClose;
      fallbackHiddenY = cfg.fallbackHiddenY;
      reducedMotion = cfg.reducedMotion;
      closeDisabled = cfg.closeDisabled;
      sheetHeightRef = cfg.sheetHeightRef;
      isClosingRef = cfg.isClosingRef;
    },
    notifyLayoutMeasured,
    playOpen,
    resetHidden,
    dismissWithAnimation,
    dispose,
  };
}

/**
 * Returns the nearest parent SwipeableBottomSheet animated-close trigger, or null
 * when called outside a SwipeableBottomSheet.
 */
export function useBottomSheetClose(): (() => void) | null {
  const sheetCtx = useContext(BottomSheetContext);
  return sheetCtx ? sheetCtx.requestClose : null;
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
  closeDisabled = false,
}: SwipeableBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const fallbackHiddenY = Math.max(600, windowHeight);

  const sheetHeightRef = useRef(0);
  const isClosingRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const [controller] = useState(() =>
    createSheetController(Math.max(600, Dimensions.get('window').height))
  );

  useEffect(() => {
    controller.updateConfig({
      onClose,
      fallbackHiddenY,
      reducedMotion,
      closeDisabled,
      sheetHeightRef,
      isClosingRef,
    });
  }, [closeDisabled, controller, fallbackHiddenY, onClose, reducedMotion]);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      wasVisibleRef.current = true;
      controller.playOpen();
      return;
    }
    if (!visible && wasVisibleRef.current) {
      wasVisibleRef.current = false;
      controller.resetHidden();
    }
  }, [controller, visible]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller]);

  const handleSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      if (nextHeight > 0) {
        sheetHeightRef.current = nextHeight;
        controller.notifyLayoutMeasured();
      }
    },
    [controller]
  );

  if (!visible) return null;

  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 18) + 8;

  const content = (
    <View style={styles.overlay}>
      <Animated.View
        collapsable={false}
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: controller.backdropOpacity },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={controller.dismissWithAnimation} />
      </Animated.View>
      <Animated.View
        renderToHardwareTextureAndroid
        collapsable={false}
        onLayout={handleSheetLayout}
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
