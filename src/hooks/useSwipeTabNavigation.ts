import { useMemo } from 'react';
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
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        const isHorizontal =
          Math.abs(gestureState.dx) > 35 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8;

        if (!isHorizontal) return false;

        const currentIndex = TABS.indexOf(currentTab);

        // On 'today' (index 0), you can ONLY swipe left (towards calendar). Ignore dragging right!
        if (currentIndex === 0 && gestureState.dx > 0) {
          return false;
        }

        // On 'focus' (last index), you can ONLY swipe right (towards lists). Ignore dragging left!
        if (currentIndex === TABS.length - 1 && gestureState.dx < 0) {
          return false;
        }

        return true;
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        const isSwipeLeft = gestureState.dx < -50 || gestureState.vx < -0.35;
        const isSwipeRight = gestureState.dx > 50 || gestureState.vx > 0.35;

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
          }
        }

        if (targetTab && targetTab !== currentTab) {
          hapticLight();
          router.replace(TAB_ROUTES[targetTab]);
        }
      },
    });
  }, [currentTab]);

  return panResponder.panHandlers;
}
