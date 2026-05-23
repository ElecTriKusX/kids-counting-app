/**
 * DoodleBackground — фон игровых экранов (Arithmetic, Compare, Compose).
 *
 * 1:1 копия Pencil-компонента `k9oRkP` (component/DoodleBackground):
 *  - Линейный градиент `#FFD93D` (0%) → `#FFF8F0` (60%) → `#FFF8F0` (100%),
 *    opacity 0.6 (немного бледнее, чем `BackgroundGradient`).
 *  - 10 «парящих» математических символов (плюсы, минусы, цифры, равенства)
 *    с конкретными координатами, размерами шрифта и углами поворота —
 *    значения скопированы из дизайна без изменений.
 *  - Каждый символ отрендерен через `Text` с opacity 0.07 и шрифтом Nunito 800.
 *
 * Контейнер абсолютный, `pointerEvents='none'` — не блокирует тапы.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Doodle {
  /** Символ для отображения (математический оператор или цифра). */
  symbol: string;
  /** Локальные X/Y координаты внутри 390×844 экрана (из Pencil). */
  x: number;
  y: number;
  /** Размер шрифта в pt (из Pencil). */
  fontSize: number;
  /** Угол поворота в градусах (из Pencil). */
  rotation: number;
}

/**
 * Дудлы скопированы из узла `k9oRkP` design.pen без изменений.
 * Не двигай координаты — мы привязали их к статус-бару (62) и
 * хедеру (78–134); сдвиг сломает визуальный баланс.
 */
const DOODLES: readonly Doodle[] = [
  { symbol: '+', x: 30, y: 140, fontSize: 64, rotation: -12 },
  { symbol: '−', x: 310, y: 200, fontSize: 80, rotation: 8 },
  { symbol: '3', x: 60, y: 280, fontSize: 72, rotation: -6 },
  { symbol: '=', x: 280, y: 380, fontSize: 68, rotation: -15 },
  { symbol: '7', x: 40, y: 480, fontSize: 80, rotation: 10 },
  { symbol: '+', x: 300, y: 560, fontSize: 60, rotation: -8 },
  { symbol: '5', x: 60, y: 680, fontSize: 72, rotation: 14 },
  { symbol: '−', x: 280, y: 740, fontSize: 60, rotation: -4 },
  { symbol: '9', x: 170, y: 60, fontSize: 54, rotation: 6 },
  { symbol: '=', x: 170, y: 780, fontSize: 52, rotation: 0 },
];

export const DoodleBackground: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={['#FFD93D', '#FFF8F0', '#FFF8F0']}
        locations={[0, 0.6, 1]}
        style={[StyleSheet.absoluteFill, styles.gradient]}
      />
      {DOODLES.map((d, i) => (
        <Text
          key={i}
          style={[
            styles.doodle,
            {
              left: d.x,
              top: d.y,
              fontSize: d.fontSize,
              transform: [{ rotate: `${d.rotation}deg` }],
            },
          ]}
        >
          {d.symbol}
        </Text>
      ))}
    </View>
  );
};

DoodleBackground.displayName = 'DoodleBackground';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradient: {
    opacity: 0.6,
  },
  doodle: {
    position: 'absolute',
    color: '#1A1A2E',
    fontFamily: 'Nunito',
    fontWeight: '800',
    opacity: 0.07,
  },
});

export default DoodleBackground;
