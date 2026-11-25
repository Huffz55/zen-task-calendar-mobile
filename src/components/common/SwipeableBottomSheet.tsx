import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  type NativeGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '../../constants/colors';
import { hapticSelection } from '../../hooks/useHaptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ModalPortal } from './ModalPortal';

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
  nativeScrollGesture: NativeGesture;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY_PX_S = 500;
const OPEN_ANIM_DURATION_MS = 280;
const CLOSE_ANIM_DURATION_MS = 260;
const SNAP_BACK_DURATION_MS = 200;
const SHEET_OFFSCREEN_PADDING = 32;
const OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CLOSE_EASING = Easing.bezier(0.32, 0.72, 0, 1);

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
 * engages smoothly on the UI thread when scrolled to top (`offsetY <= 0`)
 * without interfering with normal scrolling.
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

  const scrollNode = (
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

  if (sheetCtx) {
    return (
      <GestureDetector gesture={sheetCtx.nativeScrollGesture}>
        {scrollNode}
      </GestureDetector>
    );
  }

  return scrollNode;
}

function SwipeableBottomSheetContent({
  onClose,
  theme,
  children,
  maxHeight = '88%',
  sheetStyle,
  useKeyboardAvoiding = false,
  closeDisabled = false,
}: Omit<SwipeableBottomSheetProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const fallbackHiddenY = Math.max(600, windowHeight);

  // UI-thread shared values (mutated via .set()/.get() for React Compiler compatibility)
  const sheetHeightSV = useSharedValue(0);
  const fallbackHiddenYSV = useSharedValue(fallbackHiddenY);
  const hasMeasuredSV = useSharedValue(false);
  const translateY = useSharedValue(reducedMotion ? 0 : fallbackHiddenY);
  const backdropOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const isClosingSV = useSharedValue(false);
  const closePhaseSV = useSharedValue<0 | 1 | 2>(0); // 0=idle, 1=closing, 2=closed
  const closeDisabledSV = useSharedValue(closeDisabled);
  const reducedMotionSV = useSharedValue(reducedMotion);
  const scrollOffsetSV = useSharedValue(0);
  const hasPassedThresholdSV = useSharedValue(false);
  const isHandleActiveSV = useSharedValue(false);
  const canSheetDragSV = useSharedValue(false);
  const sheetDragOriginYSV = useSharedValue(0);

  // JS refs for double-close guards and stable callbacks
  const isClosingJSRef = useRef(false);
  const hasCompletedCloseRef = useRef(false);
  const closeDisabledRef = useRef(closeDisabled);
  const reducedMotionRef = useRef(reducedMotion);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    fallbackHiddenYSV.set(fallbackHiddenY);
  }, [fallbackHiddenY, fallbackHiddenYSV]);

  useEffect(() => {
    closeDisabledRef.current = closeDisabled;
    closeDisabledSV.set(closeDisabled);
  }, [closeDisabled, closeDisabledSV]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
    reducedMotionSV.set(reducedMotion);
  }, [reducedMotion, reducedMotionSV]);

  useEffect(() => {
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
    };
  }, [backdropOpacity, translateY]);

  const finishCloseOnJS = useCallback(() => {
    if (hasCompletedCloseRef.current) return;
    hasCompletedCloseRef.current = true;
    // Dismiss keyboard only after slide-out completes so Android KeyboardAvoidingView
    // never relayouts mid-animation.
    Keyboard.dismiss();
    onCloseRef.current();
  }, []);

  const markClosingOnJS = useCallback(() => {
    isClosingJSRef.current = true;
  }, []);

  useAnimatedReaction(
    () => closePhaseSV.get(),
    (phase, prevPhase) => {
      if (phase === 1 && prevPhase !== 1) {
        scheduleOnRN(markClosingOnJS);
      } else if (phase === 2 && prevPhase !== 2) {
        scheduleOnRN(finishCloseOnJS);
      }
    }
  );

  const dismissWithAnimation = useCallback(() => {
    if (closeDisabledRef.current || isClosingJSRef.current) return;
    isClosingJSRef.current = true;

    scheduleOnUI(() => {
      'worklet';
      if (isClosingSV.get() || closeDisabledSV.get()) return;
      isClosingSV.set(true);
      closePhaseSV.set(1);
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);

      const targetY =
        sheetHeightSV.get() > 0
          ? sheetHeightSV.get() + SHEET_OFFSCREEN_PADDING
          : fallbackHiddenYSV.get();

      if (reducedMotionSV.get()) {
        translateY.set(targetY);
        backdropOpacity.set(0);
        closePhaseSV.set(2);
        return;
      }

      backdropOpacity.set(
        withTiming(0, {
          duration: CLOSE_ANIM_DURATION_MS,
          easing: CLOSE_EASING,
        })
      );
      translateY.set(
        withTiming(
          targetY,
          {
            duration: CLOSE_ANIM_DURATION_MS,
            easing: CLOSE_EASING,
          },
          finished => {
            'worklet';
            if (finished) {
              closePhaseSV.set(2);
            }
          }
        )
      );
    });
  }, [
    backdropOpacity,
    closeDisabledSV,
    closePhaseSV,
    fallbackHiddenYSV,
    isClosingSV,
    reducedMotionSV,
    sheetHeightSV,
    translateY,
  ]);

  const handleSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      if (nextHeight <= 0) return;

      const isReduced = reducedMotionRef.current;
      scheduleOnUI((measuredHeight: number, reduced: boolean) => {
        'worklet';
        sheetHeightSV.set(measuredHeight);
        if (hasMeasuredSV.get() || isClosingSV.get()) return;

        hasMeasuredSV.set(true);
        if (reduced) {
          translateY.set(0);
          backdropOpacity.set(1);
          return;
        }

        // Start from exact measured height + padding on the same UI-thread frame
        // so there is zero first-frame jump and no screen-height overshoot.
        translateY.set(measuredHeight + SHEET_OFFSCREEN_PADDING);
        backdropOpacity.set(0);
        translateY.set(
          withTiming(0, {
            duration: OPEN_ANIM_DURATION_MS,
            easing: OPEN_EASING,
          })
        );
        backdropOpacity.set(
          withTiming(1, {
            duration: OPEN_ANIM_DURATION_MS,
            easing: OPEN_EASING,
          })
        );
      }, nextHeight, isReduced);
    },
    [backdropOpacity, hasMeasuredSV, isClosingSV, sheetHeightSV, translateY]
  );

  const reportScrollOffset = useCallback(
    (offsetY: number) => {
      scrollOffsetSV.set(offsetY);
    },
    [scrollOffsetSV]
  );

  const nativeScrollGesture = useMemo(() => Gesture.Native(), []);

  const sheetPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!closeDisabled)
        .activeOffsetY(10)
        .failOffsetY(-5)
        .failOffsetX([-16, 16])
        .simultaneousWithExternalGesture(nativeScrollGesture)
        .onBegin(() => {
          'worklet';
          canSheetDragSV.set(
            !isClosingSV.get() &&
              !closeDisabledSV.get() &&
              !isHandleActiveSV.get() &&
              scrollOffsetSV.get() <= 2
          );
        })
        .onStart(event => {
          'worklet';
          if (
            !canSheetDragSV.get() ||
            isClosingSV.get() ||
            closeDisabledSV.get() ||
            isHandleActiveSV.get() ||
            scrollOffsetSV.get() > 2
          ) {
            canSheetDragSV.set(false);
            return;
          }
          sheetDragOriginYSV.set(Math.max(0, event.translationY));
          hasPassedThresholdSV.set(false);
          cancelAnimation(translateY);
          cancelAnimation(backdropOpacity);
        })
        .onUpdate(event => {
          'worklet';
          if (
            !canSheetDragSV.get() ||
            isClosingSV.get() ||
            isHandleActiveSV.get() ||
            scrollOffsetSV.get() > 2
          ) {
            return;
          }
          const nextY = Math.max(0, event.translationY - sheetDragOriginYSV.get());
          translateY.set(nextY);

          const dismissY =
            sheetHeightSV.get() > 0
              ? sheetHeightSV.get() + SHEET_OFFSCREEN_PADDING
              : fallbackHiddenYSV.get();
          const fadeRange = Math.max(200, dismissY * 0.75);
          backdropOpacity.set(Math.max(0.15, 1 - nextY / fadeRange));

          if (nextY > DISMISS_DISTANCE && !hasPassedThresholdSV.get()) {
            hasPassedThresholdSV.set(true);
            scheduleOnRN(hapticSelection);
          } else if (nextY <= DISMISS_DISTANCE - 10 && hasPassedThresholdSV.get()) {
            hasPassedThresholdSV.set(false);
          }
        })
        .onEnd(event => {
          'worklet';
          if (!canSheetDragSV.get() || isClosingSV.get() || isHandleActiveSV.get()) {
            return;
          }
          const dragDistance = Math.max(0, event.translationY - sheetDragOriginYSV.get());
          const shouldDismiss =
            dragDistance > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY_PX_S;

          if (shouldDismiss) {
            isClosingSV.set(true);
            closePhaseSV.set(1);
            const targetY =
              sheetHeightSV.get() > 0
                ? sheetHeightSV.get() + SHEET_OFFSCREEN_PADDING
                : fallbackHiddenYSV.get();

            if (reducedMotionSV.get()) {
              translateY.set(targetY);
              backdropOpacity.set(0);
              closePhaseSV.set(2);
              return;
            }

            backdropOpacity.set(
              withTiming(0, {
                duration: CLOSE_ANIM_DURATION_MS,
                easing: CLOSE_EASING,
              })
            );
            translateY.set(
              withTiming(
                targetY,
                {
                  duration: CLOSE_ANIM_DURATION_MS,
                  easing: CLOSE_EASING,
                },
                finished => {
                  'worklet';
                  if (finished) {
                    closePhaseSV.set(2);
                  }
                }
              )
            );
          } else {
            hasPassedThresholdSV.set(false);
            if (reducedMotionSV.get()) {
              translateY.set(0);
              backdropOpacity.set(1);
              return;
            }
            translateY.set(
              withTiming(0, {
                duration: SNAP_BACK_DURATION_MS,
                easing: OPEN_EASING,
              })
            );
            backdropOpacity.set(
              withTiming(1, {
                duration: 180,
                easing: OPEN_EASING,
              })
            );
          }
        })
        .onFinalize((_, success) => {
          'worklet';
          const wasDragging = canSheetDragSV.get();
          canSheetDragSV.set(false);
          if (!success && wasDragging && !isClosingSV.get() && translateY.get() > 0) {
            hasPassedThresholdSV.set(false);
            if (reducedMotionSV.get()) {
              translateY.set(0);
              backdropOpacity.set(1);
              return;
            }
            translateY.set(
              withTiming(0, {
                duration: SNAP_BACK_DURATION_MS,
                easing: OPEN_EASING,
              })
            );
            backdropOpacity.set(
              withTiming(1, {
                duration: 180,
                easing: OPEN_EASING,
              })
            );
          }
        }),
    [
      backdropOpacity,
      canSheetDragSV,
      closeDisabled,
      closeDisabledSV,
      closePhaseSV,
      fallbackHiddenYSV,
      hasPassedThresholdSV,
      isClosingSV,
      isHandleActiveSV,
      nativeScrollGesture,
      reducedMotionSV,
      scrollOffsetSV,
      sheetDragOriginYSV,
      sheetHeightSV,
      translateY,
    ]
  );

  const handlePanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!closeDisabled)
        .activeOffsetY(4)
        .failOffsetX([-24, 24])
        .blocksExternalGesture(sheetPanGesture)
        .onBegin(() => {
          'worklet';
          isHandleActiveSV.set(true);
          canSheetDragSV.set(false);
        })
        .onStart(() => {
          'worklet';
          if (isClosingSV.get() || closeDisabledSV.get()) return;
          hasPassedThresholdSV.set(false);
          cancelAnimation(translateY);
          cancelAnimation(backdropOpacity);
        })
        .onUpdate(event => {
          'worklet';
          if (isClosingSV.get() || closeDisabledSV.get()) return;
          const nextY = Math.max(0, event.translationY);
          translateY.set(nextY);

          const dismissY =
            sheetHeightSV.get() > 0
              ? sheetHeightSV.get() + SHEET_OFFSCREEN_PADDING
              : fallbackHiddenYSV.get();
          const fadeRange = Math.max(200, dismissY * 0.75);
          backdropOpacity.set(Math.max(0.15, 1 - nextY / fadeRange));

          if (nextY > DISMISS_DISTANCE && !hasPassedThresholdSV.get()) {
            hasPassedThresholdSV.set(true);
            scheduleOnRN(hapticSelection);
          } else if (nextY <= DISMISS_DISTANCE - 10 && hasPassedThresholdSV.get()) {
            hasPassedThresholdSV.set(false);
          }
        })
        .onEnd(event => {
          'worklet';
          if (isClosingSV.get() || closeDisabledSV.get()) return;
          const dragDistance = Math.max(0, event.translationY);
          const shouldDismiss =
            dragDistance > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY_PX_S;

          if (shouldDismiss) {
            isClosingSV.set(true);
            closePhaseSV.set(1);
            const targetY =
              sheetHeightSV.get() > 0
                ? sheetHeightSV.get() + SHEET_OFFSCREEN_PADDING
                : fallbackHiddenYSV.get();

            if (reducedMotionSV.get()) {
              translateY.set(targetY);
              backdropOpacity.set(0);
              closePhaseSV.set(2);
              return;
            }

            backdropOpacity.set(
              withTiming(0, {
                duration: CLOSE_ANIM_DURATION_MS,
                easing: CLOSE_EASING,
              })
            );
            translateY.set(
              withTiming(
                targetY,
                {
                  duration: CLOSE_ANIM_DURATION_MS,
                  easing: CLOSE_EASING,
                },
                finished => {
                  'worklet';
                  if (finished) {
                    closePhaseSV.set(2);
                  }
                }
              )
            );
          } else {
            hasPassedThresholdSV.set(false);
            if (reducedMotionSV.get()) {
              translateY.set(0);
              backdropOpacity.set(1);
              return;
            }
            translateY.set(
              withTiming(0, {
                duration: SNAP_BACK_DURATION_MS,
                easing: OPEN_EASING,
              })
            );
            backdropOpacity.set(
              withTiming(1, {
                duration: 180,
                easing: OPEN_EASING,
              })
            );
          }
        })
        .onFinalize((_, success) => {
          'worklet';
          isHandleActiveSV.set(false);
          if (!success && !isClosingSV.get() && translateY.get() > 0) {
            hasPassedThresholdSV.set(false);
            if (reducedMotionSV.get()) {
              translateY.set(0);
              backdropOpacity.set(1);
              return;
            }
            translateY.set(
              withTiming(0, {
                duration: SNAP_BACK_DURATION_MS,
                easing: OPEN_EASING,
              })
            );
            backdropOpacity.set(
              withTiming(1, {
                duration: 180,
                easing: OPEN_EASING,
              })
            );
          }
        }),
    [
      backdropOpacity,
      canSheetDragSV,
      closeDisabled,
      closeDisabledSV,
      closePhaseSV,
      fallbackHiddenYSV,
      hasPassedThresholdSV,
      isClosingSV,
      isHandleActiveSV,
      reducedMotionSV,
      sheetHeightSV,
      sheetPanGesture,
      translateY,
    ]
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.get(),
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    if (!hasMeasuredSV.get() && !reducedMotionSV.get()) {
      return {
        opacity: 0,
        transform: [{ translateY: fallbackHiddenYSV.get() }],
      };
    }
    return {
      opacity: 1,
      transform: [{ translateY: translateY.get() }],
    };
  });

  const contextValue = useMemo<BottomSheetContextValue>(
    () => ({
      reportScrollOffset,
      requestClose: dismissWithAnimation,
      nativeScrollGesture,
    }),
    [dismissWithAnimation, nativeScrollGesture, reportScrollOffset]
  );

  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 18) + 8;

  const content = (
    <View style={styles.overlay}>
      <Animated.View
        collapsable={false}
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimatedStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissWithAnimation}
          accessible={false}
        />
      </Animated.View>

      <GestureDetector gesture={sheetPanGesture}>
        <Animated.View
          collapsable={false}
          onLayout={handleSheetLayout}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              maxHeight,
              paddingBottom: safeBottomPadding,
            },
            sheetStyle,
            sheetAnimatedStyle,
          ]}
        >
          <GestureDetector gesture={handlePanGesture}>
            <View style={styles.dragArea}>
              <View
                style={[
                  styles.dragHandle,
                  {
                    backgroundColor: theme.isDark
                      ? 'rgba(255,255,255,0.24)'
                      : 'rgba(0,0,0,0.18)',
                  },
                ]}
              />
            </View>
          </GestureDetector>

          <BottomSheetContext.Provider value={contextValue}>
            {children}
          </BottomSheetContext.Provider>
        </Animated.View>
      </GestureDetector>
    </View>
  );

  return (
    <ModalPortal
      visible
      onRequestClose={dismissWithAnimation}
      isClosingRef={isClosingJSRef}
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
    </ModalPortal>
  );
}

/**
 * Reusable portal-backed bottom sheet powered by Reanimated v4 and Gesture Handler
 * for 60/120 Hz native UI-thread slide/fade transitions, >=44px drag handle gesture,
 * and top-of-scroll pull-to-dismiss without Android Modal window jank.
 */
export function SwipeableBottomSheet(props: SwipeableBottomSheetProps) {
  if (!props.visible) return null;
  return (
    <SwipeableBottomSheetContent
      onClose={props.onClose}
      theme={props.theme}
      maxHeight={props.maxHeight}
      sheetStyle={props.sheetStyle}
      useKeyboardAvoiding={props.useKeyboardAvoiding}
      closeDisabled={props.closeDisabled}
    >
      {props.children}
    </SwipeableBottomSheetContent>
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
