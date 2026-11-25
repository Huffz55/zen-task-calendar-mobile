import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
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
const SHEET_ANIM_DURATION_MS = 240;

interface SheetController {
  translateY: Animated.Value;
  backdropOpacity: Animated.Value;
  handlePanHandlers: GestureResponderHandlers;
  sheetPanHandlers: GestureResponderHandlers;
  contextValue: BottomSheetContextValue;
  updateConfig: (cfg: {
    onClose: () => void;
    setExiting: (exiting: boolean) => void;
    hiddenY: number;
    reducedMotion: boolean;
    closeDisabled: boolean;
  }) => void;
  playOpen: () => void;
  resetHidden: () => void;
  dismissWithAnimation: () => void;
}

function createSheetController(initialHiddenY: number): SheetController {
  const translateY = new Animated.Value(initialHiddenY);
  const backdropOpacity = new Animated.Value(0);

  let scrollOffset = 0;
  let closing = false;
  let dragBaseDy = 0;
  let hasPassedThreshold = false;
  let hiddenY = initialHiddenY;
  let reducedMotion = false;
  let closeDisabled = false;
  let onCloseHandler: () => void = () => {};
  let setExitingHandler: (exiting: boolean) => void = () => {};

  const updateDrag = (nextY: number) => {
    translateY.setValue(nextY);
    const fadeRange = Math.max(360, hiddenY * 0.55);
    backdropOpacity.setValue(Math.max(0.15, 1 - nextY / fadeRange));
    if (nextY > DISMISS_DISTANCE && !hasPassedThreshold) {
      hasPassedThreshold = true;
      hapticSelection();
    } else if (nextY <= DISMISS_DISTANCE - 10 && hasPassedThreshold) {
      hasPassedThreshold = false;
    }
  };

  const finishClose = () => {
    // Keep translateY at hiddenY and backdropOpacity at 0 until the next open;
    // never reset translateY back to 0 during close so there is zero jump-back flicker.
    onCloseHandler();
    setExitingHandler(false);
  };

  const dismissWithAnimation = () => {
    if (closing || closeDisabled) return;
    closing = true;
    setExitingHandler(true);
    Keyboard.dismiss();
    translateY.stopAnimation();
    backdropOpacity.stopAnimation();

    if (reducedMotion) {
      translateY.setValue(hiddenY);
      backdropOpacity.setValue(0);
      finishClose();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: hiddenY,
        duration: SHEET_ANIM_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SHEET_ANIM_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      finishClose();
    });
  };

  const snapBack = () => {
    if (closing) return;
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
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !closing && !closeDisabled,
    onStartShouldSetPanResponderCapture: () => !closing && !closeDisabled,
    onMoveShouldSetPanResponder: () => !closing && !closeDisabled,
    onMoveShouldSetPanResponderCapture: () => !closing && !closeDisabled,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      if (closing) return;
      dragBaseDy = 0;
      hasPassedThreshold = false;
      translateY.stopAnimation();
    },
    onPanResponderMove: (_, gs) => {
      if (closing) return;
      updateDrag(Math.max(0, gs.dy));
    },
    onPanResponderRelease: (_, gs) => {
      if (closing) return;
      if (gs.dy > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
        dismissWithAnimation();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => {
      if (closing) return;
      snapBack();
    },
  });

  const sheetPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, gs) => {
      if (closing || closeDisabled) return false;
      if (scrollOffset > 2) return false;
      return gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.25;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (_, gs) => {
      if (closing) return;
      dragBaseDy = Math.max(0, gs.dy);
      hasPassedThreshold = false;
      translateY.stopAnimation();
    },
    onPanResponderMove: (_, gs) => {
      if (closing) return;
      updateDrag(Math.max(0, gs.dy - dragBaseDy));
    },
    onPanResponderRelease: (_, gs) => {
      if (closing) return;
      const dragDistance = Math.max(0, gs.dy - dragBaseDy);
      if (dragDistance > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
        dismissWithAnimation();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => {
      if (closing) return;
      snapBack();
    },
  });

  const playOpen = () => {
    closing = false;
    scrollOffset = 0;
    dragBaseDy = 0;
    hasPassedThreshold = false;
    translateY.stopAnimation();
    backdropOpacity.stopAnimation();

    if (reducedMotion) {
      translateY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }

    translateY.setValue(hiddenY);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: SHEET_ANIM_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: SHEET_ANIM_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetHidden = () => {
    closing = false;
    scrollOffset = 0;
    dragBaseDy = 0;
    hasPassedThreshold = false;
    translateY.stopAnimation();
    backdropOpacity.stopAnimation();
    translateY.setValue(hiddenY);
    backdropOpacity.setValue(0);
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
      setExitingHandler = cfg.setExiting;
      hiddenY = cfg.hiddenY;
      reducedMotion = cfg.reducedMotion;
      closeDisabled = cfg.closeDisabled;
    },
    playOpen,
    resetHidden,
    dismissWithAnimation,
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
  const hiddenY = Math.max(600, windowHeight);

  const [isExiting, setIsExiting] = useState(false);
  const [controller] = useState(() =>
    createSheetController(Math.max(600, Dimensions.get('window').height))
  );
  const wasVisibleRef = useRef(false);

  const shouldRender = visible || isExiting;

  useEffect(() => {
    controller.updateConfig({
      onClose,
      setExiting: setIsExiting,
      hiddenY,
      reducedMotion,
      closeDisabled,
    });
  }, [closeDisabled, controller, hiddenY, onClose, reducedMotion]);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      wasVisibleRef.current = true;
      controller.playOpen();
      return;
    }
    if (!visible && wasVisibleRef.current) {
      wasVisibleRef.current = false;
      if (!isExiting) {
        controller.resetHidden();
      }
    }
  }, [controller, isExiting, visible]);

  useEffect(() => {
    if (!shouldRender || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      controller.dismissWithAnimation();
      return true;
    });
    return () => sub.remove();
  }, [controller, shouldRender]);

  if (!shouldRender) return null;

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
      visible={shouldRender}
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
