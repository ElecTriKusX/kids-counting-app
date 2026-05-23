/**
 * IdleMascot — медвежонок выглядывает снизу при бездействии.
 *
 * Логика:
 *  - Слушает props.idleSignal (число, инкрементируется при любой
 *    активности — тапе, навигации). Каждое изменение сбрасывает
 *    таймер.
 *  - Через `IDLE_DELAY_MS` (20 сек) маскот выезжает снизу с лёгкой
 *    spring-анимацией.
 *  - Через `VISIBLE_DURATION_MS` (5 сек) уезжает обратно вниз.
 *  - На любом изменении `idleSignal` (= тап) — мгновенно прячется.
 */

import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const IDLE_DELAY_MS = 20_000;
const VISIBLE_DURATION_MS = 5_000;
const SLIDE_DURATION_MS = 600;

/** Высота, на которую маскот выезжает (отрицательный translateY). */
const PEEK_HEIGHT = 180;

export interface IdleMascotProps {
  /**
   * Любой сериализуемый ключ, который меняется при активности.
   * Удобно использовать счётчик или Date.now().
   */
  idleSignal: number;
}

const IdleMascot: React.FC<IdleMascotProps> = ({ idleSignal }) => {
  const translateY = useSharedValue(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Сбрасываем все таймеры и прячем маскот при любой активности
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    translateY.value = withTiming(0, {
      duration: SLIDE_DURATION_MS,
      easing: Easing.in(Easing.quad),
    });

    // Запускаем новый отсчёт
    idleTimerRef.current = setTimeout(() => {
      translateY.value = withTiming(-PEEK_HEIGHT, {
        duration: SLIDE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });

      hideTimerRef.current = setTimeout(() => {
        translateY.value = withTiming(0, {
          duration: SLIDE_DURATION_MS,
          easing: Easing.in(Easing.quad),
        });
      }, VISIBLE_DURATION_MS);
    }, IDLE_DELAY_MS);

    return () => {
      if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    };
  }, [idleSignal, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.mascotWrapper, animatedStyle]}>
        <Image
          source={require('../../assets/illustrations/mascot.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

IdleMascot.displayName = 'IdleMascot';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -PEEK_HEIGHT,
    height: PEEK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  mascotWrapper: {
    width: PEEK_HEIGHT,
    height: PEEK_HEIGHT,
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
});

export { IdleMascot };
export default IdleMascot;
