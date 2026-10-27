import { useEffect, useState } from 'react';
import { Animated, PanResponder, PanResponderGestureState } from 'react-native';
import { router } from 'expo-router';
import { MobileTab } from '../types';
import { hapticLight } from './useHaptics';

const TABS: MobileTab[] = ['today', 'calendar', 'lists', 'focus'];

const TAB_ROUTES: Record<MobileTab, string> = {
  today: '/(tabs)',
  calendar: '/(tabs)/calendar',
  lists: '/(tabs)/lists',
  focus: '/(tabs)/focus',
};

const navState = {
  isNavigating: false,
  currentTab: 'today' as MobileTab,
  lastVisitedTab: 'today' as MobileTab,
};

export function setLastVisitedTab(tab: MobileTab) {
  navState.lastVisitedTab = tab;
}

export function useSwipeTabNavigation(currentTab: MobileTab) {
  const [dragX] = useState(() => new Animated.Value(0));
  const [enterAnim] = useState(() => new Animated.Value(0));

  const currentIdx = TABS.indexOf(currentTab);
  const prevIdx = TABS.indexOf(navState.lastVisitedTab);
  const direction = currentIdx >= prevIdx ? 1 : -1;
  const isInitial = currentIdx === prevIdx;

  useEffect(() => {
    navState.currentTab = currentTab;
    navState.isNavigating = false;
    dragX.setValue(0);
    enterAnim.setValue(0);

    Animated.spring(enterAnim, {
      toValue: 1,
      damping: 24,
      mass: 0.8,
      stiffness: 170,
      useNativeDriver: true,
    }).start();

    navState.lastVisitedTab = currentTab;
  }, [currentTab, enterAnim, dragX]);

  const [panResponder] = useState(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        if (navState.isNavigating) return false;
        // Dominant horizontal swipe check to prevent interference with vertical scrolling
        const isHorizontal =
          Math.abs(gestureState.dx) > 30 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.6;
        return isHorizontal;
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        if (navState.isNavigating) return;
        // Soft rubber-band damping while finger drags across screen
        dragX.setValue(gestureState.dx * 0.42);
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (navState.isNavigating) return;

        const isSwipeLeft = gestureState.dx < -42 || gestureState.vx < -0.3;
        const isSwipeRight = gestureState.dx > 42 || gestureState.vx > 0.3;

        const activeTab = navState.currentTab;
        const currentIndex = TABS.indexOf(activeTab);
        let targetTab: MobileTab | null = null;

        if (isSwipeLeft) {
          // Finger dragged left -> move to the next tab to the right
          if (currentIndex < TABS.length - 1) {
            targetTab = TABS[currentIndex + 1];
          }
        } else if (isSwipeRight) {
          // Finger dragged right -> move to the previous tab to the left
          if (currentIndex > 0) {
            targetTab = TABS[currentIndex - 1];
          }
        }

        if (targetTab && targetTab !== activeTab) {
          navState.isNavigating = true;
          hapticLight();

          // Smooth glide off
          Animated.timing(dragX, {
            toValue: isSwipeLeft ? -80 : 80,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            router.replace(TAB_ROUTES[targetTab]);
          });
        } else {
          // Spring back softly to center
          Animated.spring(dragX, {
            toValue: 0,
            friction: 7,
            tension: 60,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragX, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }).start();
      },
    });
  });

  const initialSlideOffset = isInitial ? 0 : direction * 24;

  const enterSlide = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [initialSlideOffset, 0],
  });

  const enterOpacity = enterAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [isInitial ? 1 : 0.65, 0.88, 1],
  });

  const translateX = Animated.add(dragX, enterSlide);

  return {
    ...panResponder.panHandlers,
    panHandlers: panResponder.panHandlers,
    containerStyle: {
      flex: 1,
      opacity: enterOpacity,
      transform: [{ translateX }],
    },
  };
}
