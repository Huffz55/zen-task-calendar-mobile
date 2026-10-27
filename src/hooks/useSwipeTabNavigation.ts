import { useMemo, useRef } from 'react';
import { PanResponder, PanResponderGestureState } from 'react-native';
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

export function useSwipeTabNavigation(currentTab: MobileTab) {
  const isNavigating = useRef(false);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        // Only capture if horizontal movement is clearly dominant over vertical scrolling
        const isHorizontal = Math.abs(gestureState.dx) > 35 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        return isHorizontal;
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (isNavigating.current) return;

        const isSwipeLeft = gestureState.dx < -45 || gestureState.vx < -0.3;
        const isSwipeRight = gestureState.dx > 45 || gestureState.vx > 0.3;

        if (!isSwipeLeft && !isSwipeRight) return;

        const currentIndex = TABS.indexOf(currentTab);
        let targetTab: MobileTab | null = null;

        if (isSwipeLeft) {
          // Swiped left (finger moves left -> go to tab on the right)
          if (currentIndex < TABS.length - 1) {
            targetTab = TABS[currentIndex + 1];
          }
        } else if (isSwipeRight) {
          // Swiped right (finger moves right -> go to tab on the left)
          if (currentIndex > 0) {
            targetTab = TABS[currentIndex - 1];
          } else if (currentIndex === 0) {
            // User requested: on Today, swiping in either direction opens calendar
            targetTab = 'calendar';
          }
        }

        if (targetTab && targetTab !== currentTab) {
          isNavigating.current = true;
          hapticLight();
          router.replace(TAB_ROUTES[targetTab]);
          setTimeout(() => {
            isNavigating.current = false;
          }, 350);
        }
      },
    });
  }, [currentTab]);

  return panResponder.panHandlers;
}
