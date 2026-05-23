/**
 * Bin — drop zone для Compose_Mode.
 *
 * 1:1 с Pencil-компонентом `T3IuJG` (component/Bin):
 *  - 320×160, cornerRadius:28
 *  - fill: #FFFFFF80 (полупрозрачный белый), border 3px solid #F5B800 (deep yellow)
 *  - Padding 24, gap 16, по центру
 *  - В пустом состоянии: текст "Перетащи плитки сюда" 18pt/600, цвет #1A1A2E99
 *
 * Состояния (по статусу):
 *  - 'empty'   → жёлтая обводка #F5B800
 *  - 'partial' → жёлтая обводка #F5B800
 *  - 'correct' → зелёная #6BCB77 (success)
 *  - 'invalid' → коралловая #FF6B6B (danger)
 *
 * Координаты для drag-and-drop hit-testing:
 *  - `onLayoutMeasured` отдаёт прямоугольник в координатах окна
 *    (через `measureInWindow`).
 *  - Жест в `useTileGesture` сравнивает `e.absoluteX/absoluteY` с этим
 *    прямоугольником — обе величины в одной системе координат.
 */

import React, { useCallback, useRef } from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import NumericText from './NumericText';
import Tile from './Tile';

export interface BinLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BinStatus = 'empty' | 'partial' | 'correct' | 'invalid';

export interface BinTile {
  id: string;
  value: number;
}

export interface BinProps {
  status: BinStatus;
  tiles?: BinTile[];
  sum?: number;
  target: number;
  onLayoutMeasured?(layout: BinLayout): void;
}

const BIN_WIDTH = 320;
const BIN_HEIGHT = 160;
const BIN_RADIUS = 28;
const BORDER_THICKNESS = 3;

const BORDER_BY_STATUS: Record<BinStatus, string> = {
  empty: '#F5B800',
  partial: '#F5B800',
  correct: '#6BCB77',
  invalid: '#FF6B6B',
};

const Bin: React.FC<BinProps> = ({
  status,
  tiles = [],
  sum,
  target,
  onLayoutMeasured,
}) => {
  const viewRef = useRef<View>(null);

  const measure = useCallback(() => {
    if (!onLayoutMeasured) return;
    const node = viewRef.current;
    if (!node) return;
    node.measureInWindow((x, y, w, h) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(w) &&
        Number.isFinite(h)
      ) {
        onLayoutMeasured({ x, y, w, h });
      }
    });
  }, [onLayoutMeasured]);

  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      // requestAnimationFrame даёт RN время добить транзишены и outer
      // layout pass до того, как мы позовём measureInWindow.
      requestAnimationFrame(measure);
    },
    [measure],
  );

  const borderColor = BORDER_BY_STATUS[status];

  const effectiveSum =
    typeof sum === 'number'
      ? sum
      : tiles.reduce((acc, t) => acc + t.value, 0);

  const a11yLabel =
    status === 'empty'
      ? `Корзина пуста, цель ${target}`
      : `Корзина: сумма ${effectiveSum} из ${target}`;

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      style={[styles.bin, { borderColor }]}
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      {status === 'empty' ? (
        <Text style={styles.hint}>Перетащи плитки сюда</Text>
      ) : (
        <View style={styles.row}>
          {tiles.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 ? <Text style={styles.operator}>+</Text> : null}
              <Tile value={t.value} colorIndex={(i % 3) as 0 | 1 | 2} />
            </React.Fragment>
          ))}
          <Text style={styles.operator}>=</Text>
          <NumericText fontSize={42}>{String(effectiveSum)}</NumericText>
        </View>
      )}
    </View>
  );
};

Bin.displayName = 'Bin';

const styles = StyleSheet.create({
  bin: {
    width: BIN_WIDTH,
    height: BIN_HEIGHT,
    borderRadius: BIN_RADIUS,
    borderWidth: BORDER_THICKNESS,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  hint: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E99',
    textAlign: 'center',
    fontFamily: 'Nunito',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  operator: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    marginHorizontal: 4,
    fontFamily: 'Nunito',
  },
});

export { Bin };
export default Bin;
