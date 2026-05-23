/**
 * BackgroundGradient — фон главных и навигационных экранов.
 *
 * 1:1 копия Pencil-компонента `mLudh` (component/BackgroundGradient):
 *  - Линейный градиент сверху вниз: `#FFD93D` (0%) → `#FFF8F0` (55%) → `#FFF8F0` (100%).
 *    Opacity всего слоя 0.75 — добавляет тепло без перегрузки.
 *  - Два радиальных «солнца» из `#FFD93D` в верхней части:
 *      • большое (400×400) в левом верхнем углу со смещением (-120, -180), opacity 0.6
 *      • меньшее (240×240) в правом верхнем углу (280, -100), opacity 0.5
 *  - Контейнер `clip: true` (overflow:hidden) — солнца не выходят за пределы.
 *
 * Используется на: Splash, Home, Sticker_Collection, Parent_Lock, Parent_Section,
 * Session_Reward overlay.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const BackgroundGradient: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Линейный градиент сверху вниз с opacity 0.75 */}
      <LinearGradient
        colors={['#FFD93D', '#FFF8F0', '#FFF8F0']}
        locations={[0, 0.55, 1]}
        style={[StyleSheet.absoluteFill, styles.gradientOpacity]}
      />

      {/* Большое радиальное "солнце" в левом верхнем углу */}
      <View style={styles.sunLargeWrapper}>
        <LinearGradient
          // expo-linear-gradient не поддерживает radial — эмулируем через
          // цвет → прозрачный по диагонали; визуально близко к радиальному
          // gradient'у в Pencil.
          colors={['#FFD93D', '#FFD93D00']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.sunGradient}
        />
      </View>

      {/* Меньшее "солнце" в правом верхнем углу */}
      <View style={styles.sunSmallWrapper}>
        <LinearGradient
          colors={['#FFD93D', '#FFD93D00']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 1 }}
          style={styles.sunGradient}
        />
      </View>
    </View>
  );
};

BackgroundGradient.displayName = 'BackgroundGradient';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradientOpacity: {
    opacity: 0.75,
  },
  sunLargeWrapper: {
    position: 'absolute',
    left: -120,
    top: -180,
    width: 400,
    height: 400,
    borderRadius: 200,
    overflow: 'hidden',
    opacity: 0.6,
  },
  sunSmallWrapper: {
    position: 'absolute',
    left: 280,
    top: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    opacity: 0.5,
  },
  sunGradient: {
    flex: 1,
    borderRadius: 999,
  },
});

export default BackgroundGradient;
