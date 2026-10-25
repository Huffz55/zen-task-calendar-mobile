import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_PETALS = 16;

interface PetalConfig {
  id: number;
  startX: number;
  delay: number;
  duration: number;
  size: number;
  rotateDeg: string;
  char: string;
}

interface SakuraPetalsOverlayProps {
  active: boolean;
  onFinished?: () => void;
}

export function SakuraPetalsOverlay({ active, onFinished }: SakuraPetalsOverlayProps) {
  const [petals] = useState<PetalConfig[]>(() =>
    Array.from({ length: NUM_PETALS }, (_, i) => ({
      id: i,
      startX: Math.random() * (SCREEN_WIDTH - 30) + 10,
      delay: Math.random() * 800,
      duration: 2600 + Math.random() * 1400,
      size: 14 + Math.random() * 10,
      rotateDeg: `${Math.floor(Math.random() * 360)}deg`,
      char: i % 3 === 0 ? '🌸' : '🍃',
    }))
  );

  const [animations] = useState(() =>
    petals.map(() => new Animated.Value(0))
  );

  useEffect(() => {
    if (!active) return;

    animations.forEach(anim => anim.setValue(0));

    const parallelAnims = animations.map((anim, i) =>
      Animated.sequence([
        Animated.delay(petals[i].delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: petals[i].duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(parallelAnims).start(() => {
      if (onFinished) onFinished();
    });
  }, [active, animations, onFinished, petals]);

  if (!active) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {petals.map((petal, i) => {
        const anim = animations[i];

        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, SCREEN_HEIGHT + 30],
        });

        const translateX = anim.interpolate({
          inputRange: [0, 0.3, 0.7, 1],
          outputRange: [0, 18, -14, 20],
        });

        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', petal.rotateDeg],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 0.9, 0.9, 0],
        });

        return (
          <Animated.Text
            key={petal.id}
            style={[
              styles.petal,
              {
                left: petal.startX,
                fontSize: petal.size,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          >
            {petal.char}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  petal: {
    position: 'absolute',
    top: 0,
  },
});
