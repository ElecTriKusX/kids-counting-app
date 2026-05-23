/**
 * ProgressDots — индикатор прогресса раунда.
 *
 * Каждый из 10 кружков имеет состояние:
 *  - 'correct'  → mint #6BCB77 (правильный ответ)
 *  - 'incorrect' → coral #FF6B6B (неправильный)
 *  - 'current'  → жёлтый #FFD93D (текущий вопрос, чуть крупнее)
 *  - 'pending'  → серый (ещё не отвечен)
 *
 * Используется во всех игровых режимах.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

export type DotState = 'correct' | 'incorrect' | 'current' | 'pending';

export interface ProgressDotsProps {
  /** Массив длиной 10, по индексу — состояние кружка. */
  states: readonly DotState[];
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ states }) => {
  return (
    <View style={styles.row}>
      {states.map((state, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            state === 'correct' && styles.dotCorrect,
            state === 'incorrect' && styles.dotIncorrect,
            state === 'current' && styles.dotCurrent,
            state === 'pending' && styles.dotPending,
          ]}
        />
      ))}
    </View>
  );
};

ProgressDots.displayName = 'ProgressDots';

/**
 * Хелпер для построения массива состояний из истории ответов.
 *
 * @param history — массив outcomes ('correct' | 'incorrect') в порядке ответов.
 * @param questionIndex — индекс текущего вопроса (0..9).
 * @param isRoundComplete — true когда все 10 ответов даны.
 */
export function buildDotStates(
  history: readonly ('correct' | 'incorrect')[],
  questionIndex: number,
  isRoundComplete: boolean,
): DotState[] {
  const states: DotState[] = [];
  for (let i = 0; i < 10; i++) {
    if (i < history.length) {
      states.push(history[i] === 'correct' ? 'correct' : 'incorrect');
    } else if (!isRoundComplete && i === questionIndex) {
      states.push('current');
    } else {
      states.push('pending');
    }
  }
  return states;
}

export { ProgressDots };
export default ProgressDots;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 999,
  },
  dotCorrect: {
    width: 12,
    height: 12,
    backgroundColor: '#6BCB77',
  },
  dotIncorrect: {
    width: 12,
    height: 12,
    backgroundColor: '#FF6B6B',
  },
  dotCurrent: {
    width: 16,
    height: 16,
    backgroundColor: '#FFD93D',
  },
  dotPending: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(26,26,46,0.08)',
  },
});
