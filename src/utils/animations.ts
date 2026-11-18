import { LayoutAnimation } from 'react-native';

export const PRESS_SPRING_CONFIG = {
  damping: 18,
  stiffness: 280,
  mass: 0.6,
  useNativeDriver: true,
} as const;

/**
 * Silky smooth layout animation for list updates, task additions, and deletions
 */
export function springLayout() {
  try {
    LayoutAnimation.configureNext({
      duration: 240,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.85,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  } catch {
    // Graceful fallback
  }
}

/**
 * Soft fade/ease layout animation for toggling pills, modals, and disclosures
 */
export function animateLayout() {
  try {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
  } catch {
    // Graceful fallback
  }
}
