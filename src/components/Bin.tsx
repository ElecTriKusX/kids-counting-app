/**
 * Bin — drop-зона Compose_Mode.
 *
 * Дизайн: «уравнение-конструктор» — два пунктирных квадрата под
 * слагаемые, знак операции (+ или −) между ними, далее «=» и большой
 * целевой результат. Ребёнок видит готовую структуру и понимает, что
 * нужно собрать ровно два числа.
 *
 *   ┌────┐  +  ┌────┐  =  N
 *   │    │     │    │
 *   └────┘     └────┘
 *
 * Состояния:
 *  - 'empty'   — оба слота пусты, рамка контейнера #F5B800
 *  - 'partial' — есть одно слагаемое, рамка #F5B800
 *  - 'correct' — оба, сумма = target → зелёная рамка #6BCB77
 *  - 'invalid' — оба, сумма ≠ target → коралловая рамка #FF6B6B,
 *                плюс короткий горизонтальный shake (через ShakeView).
 *
 * Размеры:
 *  - Ширина 320, высота 160 (та же, что в Pencil-фрейме).
 *  - Слот-плитка 60×60 — намеренно меньше тащимых плиток (80×80),
 *    чтобы внутри рамки помещалось «уравнение» и было визуально проще.
 *
 * Координаты для drag-and-drop hit-testing:
 *  - `onLayoutMeasured` отдаёт прямоугольник окна через
 *    `measureInWindow`. Жест в `useTileGesture` сравнивает
 *    `e.absoluteX/absoluteY` с этим прямоугольником.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ShakeView, { type ShakeHandle } from './ShakeView';
import { getNunitoFamily } from '../hooks/useAppFonts';

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
  /** Знак операции в уравнении (по умолчанию '+'). */
  operator?: '+' | '−';
  onLayoutMeasured?(layout: BinLayout): void;
}

const BIN_WIDTH = 320;
const BIN_HEIGHT = 160;
const BIN_RADIUS = 28;
const BORDER_THICKNESS = 3;

const SLOT_SIZE = 60;
const SLOT_FONT = 32;

const FILLS: readonly [string, string, string] = [
  '#FFD93D',
  '#FFCE4D',
  '#FFBA59',
];

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
  operator = '+',
  onLayoutMeasured,
}) => {
  const viewRef = useRef<View>(null);
  const shakeRef = useRef<ShakeHandle>(null);

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
      requestAnimationFrame(measure);
    },
    [measure],
  );

  // При invalid — лёгкий shake рамки.
  useEffect(() => {
    if (status === 'invalid') {
      shakeRef.current?.shake();
    }
  }, [status]);

  const borderColor = BORDER_BY_STATUS[status];

  const effectiveSum =
    typeof sum === 'number'
      ? sum
      : tiles.reduce((acc, t) => acc + t.value, 0);

  const a11yLabel =
    status === 'empty'
      ? `Корзина пуста, цель ${target}`
      : `Корзина: сумма ${effectiveSum} из ${target}`;

  // Два слота: первый и второй слагаемые. Если плитка перетащена в
  // соответствующий слот — показываем её число; иначе — пустой
  // пунктирный квадрат с многоточием как подсказкой.
  const slot0 = tiles[0];
  const slot1 = tiles[1];

  return (
    <ShakeView ref={shakeRef}>
      <View
        ref={viewRef}
        onLayout={handleLayout}
        style={[styles.bin, { borderColor }]}
        accessibilityRole="summary"
        accessibilityLabel={a11yLabel}
      >
        <Slot tile={slot0} colorIndex={0} />
        <Text style={styles.operator}>{operator}</Text>
        <Slot tile={slot1} colorIndex={1} />
        <Text style={styles.equals}>=</Text>
        <Text style={styles.target}>{target}</Text>
      </View>
    </ShakeView>
  );
};

interface SlotProps {
  tile?: BinTile;
  colorIndex: 0 | 1 | 2;
}

const Slot: React.FC<SlotProps> = ({ tile, colorIndex }) => {
  if (tile) {
    return (
      <View
        style={[styles.slotFilled, { backgroundColor: FILLS[colorIndex] }]}
      >
        <Text style={styles.slotValue}>{tile.value}</Text>
      </View>
    );
  }
  return (
    <View style={styles.slotEmpty}>
      <Text style={styles.slotPlaceholder}>?</Text>
    </View>
  );
};

Slot.displayName = 'Slot';

Bin.displayName = 'Bin';

const styles = StyleSheet.create({
  bin: {
    width: BIN_WIDTH,
    height: BIN_HEIGHT,
    borderRadius: BIN_RADIUS,
    borderWidth: BORDER_THICKNESS,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  slotFilled: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5B800',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  slotEmpty: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(26,26,46,0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  slotValue: {
    fontSize: SLOT_FONT,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
    lineHeight: SLOT_FONT + 2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  slotPlaceholder: {
    fontSize: 28,
    color: 'rgba(26,26,46,0.35)',
    fontFamily: getNunitoFamily('700'),
    lineHeight: 30,
    textAlign: 'center',
    includeFontPadding: false,
  },
  operator: {
    fontSize: 28,
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
    paddingHorizontal: 4,
    lineHeight: 30,
    includeFontPadding: false,
  },
  equals: {
    fontSize: 28,
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
    paddingHorizontal: 4,
    lineHeight: 30,
    includeFontPadding: false,
  },
  target: {
    fontSize: 40,
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
    lineHeight: 44,
    includeFontPadding: false,
  },
});

export { Bin };
export default Bin;
