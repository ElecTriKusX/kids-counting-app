/**
 * YellowBurst — небольшой «взрыв» жёлтых шариков вокруг точки.
 *
 * Используется для Answer_Feedback при правильном ответе:
 *  - В Arithmetic/Compare — оверлей внутри кнопки (originX/Y не передаём).
 *  - В Compose — оверлей внутри bin.
 *
 * Полноэкранное конфетти — только в Session_Reward (через Lottie).
 *
 * Цвета: yellow-1 / yellow-2 / yellow-3.
 *
 * Анимация:
 *  - 10–14 круглых шариков, разлетаются по радиальным траекториям
 *    из точки origin, длительность ~1000ms, fade-out к концу.
 *
 * Защита от NaN:
 *  - Если переданы originX/originY и они валидны — используем абсолютное
 *    позиционирование. Если не переданы — занимаем всё пространство
 *    родителя (StyleSheet.absoluteFillObject) и центрируем шарики
 *    через alignItems/justifyContent. Это предпочтительный путь —
 *    избавляет от хрупкого measureInWindow и проблем с NaN при
 *    переходе между экранами.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#FFD93D', '#FFCE4D', '#FFBA59'];
const MIN_COUNT = 10;
const MAX_COUNT = 14;
const DURATION_MS = 1000;
const MIN_DISTANCE = 60;
const MAX_DISTANCE = 130;
const MIN_SIZE = 10;
const MAX_SIZE = 18;

interface Particle {
  angle: number; // радианы
  distance: number;
  size: number;
  color: string;
  delay: number;
}

export interface YellowBurstProps {
  /** Когда меняется (новое значение != prev) — запускается новый burst. */
  trigger: number;
  /** Координаты центра burst'а. Если не заданы — burst центрируется в родителе. */
  originX?: number;
  originY?: number;
  /** Опциональная callback после завершения. */
  onComplete?: () => void;
}

interface ParticleViewProps {
  particle: Particle;
}

const ParticleView: React.FC<ParticleViewProps> = ({ particle }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const tx = Math.cos(particle.angle) * particle.distance * progress.value;
    const ty = Math.sin(particle.angle) * particle.distance * progress.value;
    const opacity = interpolate(progress.value, [0, 0.6, 1], [1, 0.9, 0]);
    const scale = interpolate(progress.value, [0, 0.3, 1], [0.4, 1, 0.6]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
};

ParticleView.displayName = 'ParticleView';

/** Безопасная проверка координат — отсекает NaN/undefined/Infinity. */
function isFiniteNumber(n: number | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

const YellowBurst: React.FC<YellowBurstProps> = ({
  trigger,
  originX,
  originY,
  onComplete,
}) => {
  // Генерируем новые частицы при каждом изменении trigger
  const particles = useMemo<Particle[]>(() => {
    if (trigger === 0) return [];
    const count =
      MIN_COUNT + Math.floor(Math.random() * (MAX_COUNT - MIN_COUNT + 1));
    return Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance:
        MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE),
      size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0]!,
      delay: 0,
    }));
  }, [trigger]);

  useEffect(() => {
    if (trigger === 0) return;
    const handle = setTimeout(() => {
      onComplete?.();
    }, DURATION_MS);
    return () => clearTimeout(handle);
  }, [trigger, onComplete]);

  if (particles.length === 0) return null;

  // Если переданы валидные координаты — абсолютное позиционирование.
  // Иначе fallback: заполняем родителя и центрируем (надёжнее).
  const hasValidOrigin = isFiniteNumber(originX) && isFiniteNumber(originY);

  return (
    <View
      pointerEvents="none"
      style={
        hasValidOrigin
          ? [styles.absoluteAnchor, { left: originX, top: originY }]
          : styles.fillCenter
      }
    >
      {particles.map((p, i) => (
        <ParticleView key={`${trigger}-${i}`} particle={p} />
      ))}
    </View>
  );
};

YellowBurst.displayName = 'YellowBurst';

const styles = StyleSheet.create({
  absoluteAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});

export { YellowBurst };
export default YellowBurst;
