/**
 * ArithmeticScreen — game screen for Arithmetic_Mode.
 *
 * Source of truth: `.kiro/specs/kids-counting-app/design.md`
 *   → "Screen designs / Arithmetic" / "03 Arithmetic — Idle"
 *   → requirements 2.1–2.8, 6.1–6.5, 7.1, 7.2, 12.1–12.6
 *
 * Layout (390×844):
 *  - DoodleBackground: faded math symbols positioned absolutely.
 *  - StatusBar area (height 62).
 *  - Header row (y:78): HomeButton + 10 progress dots.
 *  - Question display (y:240): large arithmetic expression.
 *  - Answer options row (y:520): 3–4 tappable answer chips.
 *
 * Overlays:
 *  - ConfettiOverlay on correct answer.
 *  - RewardOverlay on round complete with passing score (≥5).
 *  - Session failure view on round complete with failing score (<5).
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useArithmeticGame } from '../features/arithmetic/useArithmeticGame';
import HomeButton from '../components/HomeButton';
import NumericText from '../components/NumericText';
import ShakeView, { type ShakeHandle } from '../components/ShakeView';
import ConfettiOverlay from '../components/ConfettiOverlay';
import RewardOverlay from '../components/RewardOverlay';
import PressableButton from '../components/PressableButton';
import ButtonLabel from '../components/ButtonLabel';
import theme from '@/theme';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------

type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
};

export interface ArithmeticScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Arithmetic'>;
}

// ---------------------------------------------------------------------------
// DoodleBackground
// ---------------------------------------------------------------------------

const DOODLE_SYMBOLS: ReadonlyArray<{
  symbol: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: string;
}> = [
  { symbol: '+', x: 30, y: 140, fontSize: 64, rotation: '-12deg' },
  { symbol: '−', x: 310, y: 200, fontSize: 80, rotation: '8deg' },
  { symbol: '3', x: 60, y: 280, fontSize: 72, rotation: '-6deg' },
  { symbol: '=', x: 280, y: 380, fontSize: 68, rotation: '-15deg' },
  { symbol: '7', x: 40, y: 480, fontSize: 80, rotation: '10deg' },
  { symbol: '5', x: 60, y: 680, fontSize: 72, rotation: '14deg' },
];

const DoodleBackground: React.FC = () => (
  <>
    {DOODLE_SYMBOLS.map((item, idx) => (
      <Text
        key={idx}
        style={[
          styles.doodleSymbol,
          {
            left: item.x,
            top: item.y,
            fontSize: item.fontSize,
            transform: [{ rotate: item.rotation }],
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {item.symbol}
      </Text>
    ))}
  </>
);

DoodleBackground.displayName = 'DoodleBackground';

// ---------------------------------------------------------------------------
// ProgressDots
// ---------------------------------------------------------------------------

interface ProgressDotsProps {
  questionIndex: number;
  isRoundComplete: boolean;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({
  questionIndex,
  isRoundComplete,
}) => {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const isDone = isRoundComplete ? true : i < questionIndex;
    const isCurrent = !isRoundComplete && i === questionIndex;
    return { isDone, isCurrent };
  });

  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            dot.isDone && styles.dotDone,
            dot.isCurrent && styles.dotCurrent,
            !dot.isDone && !dot.isCurrent && styles.dotPending,
          ]}
        />
      ))}
    </View>
  );
};

ProgressDots.displayName = 'ProgressDots';

// ---------------------------------------------------------------------------
// AnswerOption
// ---------------------------------------------------------------------------

interface AnswerOptionProps {
  value: number;
  selectedAnswer: number | null;
  correctAnswer: number;
  feedbackKind: 'idle' | 'correct' | 'incorrect';
  onPress: (value: number) => void;
  shakeRef: React.RefObject<ShakeHandle>;
}

const AnswerOption: React.FC<AnswerOptionProps> = ({
  value,
  selectedAnswer,
  correctAnswer,
  feedbackKind,
  onPress,
  shakeRef,
}) => {
  const isSelected = selectedAnswer === value;
  const isCorrectAnswer = value === correctAnswer;

  let optionStyle: StyleProp<ViewStyle> = styles.optionDefault;
  let labelStyle: StyleProp<TextStyle> = styles.optionLabelDefault;

  if (feedbackKind !== 'idle' && isSelected) {
    if (feedbackKind === 'correct') {
      optionStyle = styles.optionCorrect;
      labelStyle = styles.optionLabelLight;
    } else {
      optionStyle = styles.optionIncorrect;
      labelStyle = styles.optionLabelLight;
    }
  } else if (feedbackKind !== 'idle' && !isSelected && isCorrectAnswer) {
    // Highlight the correct answer when the child picked wrong
    optionStyle = styles.optionCorrect;
    labelStyle = styles.optionLabelLight;
  }

  const handlePress = useCallback(() => {
    onPress(value);
  }, [onPress, value]);

  return (
    <ShakeView ref={shakeRef} style={styles.optionWrapper}>
      <PressableButton
        onPress={handlePress}
        disabled={feedbackKind !== 'idle'}
        style={[styles.optionButton, optionStyle]}
        accessibilityLabel={`Ответ ${value}`}
        accessibilityRole="button"
      >
        <ButtonLabel style={[styles.optionLabelBase, labelStyle]} fontSize={32}>
          {value}
        </ButtonLabel>
      </PressableButton>
    </ShakeView>
  );
};

AnswerOption.displayName = 'AnswerOption';

// ---------------------------------------------------------------------------
// ArithmeticScreen
// ---------------------------------------------------------------------------

const ArithmeticScreen: React.FC<ArithmeticScreenProps> = ({ navigation }) => {
  const {
    question,
    questionIndex,
    isRoundComplete,
    roundScore,
    selectedAnswer,
    feedbackKind,
    answer,
    startNewRound,
  } = useArithmeticGame();

  // One shake ref per option slot (max 4 options).
  const shakeRefs = [
    useRef<ShakeHandle>(null),
    useRef<ShakeHandle>(null),
    useRef<ShakeHandle>(null),
    useRef<ShakeHandle>(null),
  ] as const;

  // Start the round on mount.
  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger shake on the selected incorrect option.
  useEffect(() => {
    if (feedbackKind !== 'incorrect' || selectedAnswer === null || question === null) {
      return;
    }
    const idx = question.options.indexOf(selectedAnswer);
    if (idx >= 0 && idx < shakeRefs.length) {
      shakeRefs[idx]?.current?.shake();
    }
  }, [feedbackKind, selectedAnswer, question, shakeRefs]);

  const handleGoHome = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAnswer = useCallback(
    (value: number) => {
      answer(value);
    },
    [answer],
  );

  const handleRewardComplete = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  // Build the question string.
  const questionText =
    question !== null
      ? `${question.a} ${question.op === 'add' ? '+' : '−'} ${question.b} = ?`
      : '… = ?';

  const isPassingRound = roundScore >= 5;

  return (
    <View style={styles.container}>
      {/* Doodle background */}
      <DoodleBackground />

      {/* StatusBar spacer */}
      <View style={styles.statusBarSpacer} />

      {/* Header row */}
      <View style={styles.header}>
        <HomeButton onPress={handleGoHome} />
        <ProgressDots
          questionIndex={questionIndex}
          isRoundComplete={isRoundComplete}
        />
      </View>

      {/* Question display */}
      <View style={styles.questionContainer}>
        <NumericText
          fontSize={80}
          style={styles.questionText}
          accessibilityLabel={questionText}
        >
          {questionText}
        </NumericText>
      </View>

      {/* Answer options */}
      {question !== null && (
        <View style={styles.optionsRow}>
          {question.options.map((opt, idx) => (
            <AnswerOption
              key={`${question.id}-${opt}-${idx}`}
              value={opt}
              selectedAnswer={selectedAnswer}
              correctAnswer={question.correctAnswer}
              feedbackKind={feedbackKind}
              onPress={handleAnswer}
              shakeRef={shakeRefs[idx] ?? shakeRefs[0]}
            />
          ))}
        </View>
      )}

      {/* Session failure overlay */}
      {isRoundComplete && !isPassingRound && (
        <View style={styles.failureOverlay}>
          <View style={styles.failureCard}>
            <Text style={styles.failureEmoji}>🙈</Text>
            <Text style={styles.failureTitle}>Не страшно!</Text>
            <Text style={styles.failureSubtitle}>
              Попробуй ещё раз — у тебя получится!
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              accessibilityLabel="Попробовать снова"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonLabel}>Ещё раз</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Confetti overlay — correct answer feedback */}
      <ConfettiOverlay visible={feedbackKind === 'correct'} />

      {/* Reward overlay — round complete with passing score */}
      <RewardOverlay
        visible={isRoundComplete && isPassingRound}
        onComplete={handleRewardComplete}
      />
    </View>
  );
};

ArithmeticScreen.displayName = 'ArithmeticScreen';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Doodle background
  doodleSymbol: {
    position: 'absolute',
    opacity: 0.07,
    color: theme.colors.text,
    fontWeight: '800',
  },

  // StatusBar spacer
  statusBarSpacer: {
    height: 62,
  },

  // Header
  header: {
    position: 'absolute',
    top: 78,
    left: 16,
    width: 358,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 999,
  },
  dotDone: {
    width: 12,
    height: 12,
    backgroundColor: theme.colors.success,
  },
  dotCurrent: {
    width: 16,
    height: 16,
    backgroundColor: theme.colors.primary,
  },
  dotPending: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(26,26,46,0.08)',
  },

  // Question
  questionContainer: {
    position: 'absolute',
    top: 240,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  questionText: {
    fontSize: 80,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },

  // Answer options
  optionsRow: {
    position: 'absolute',
    top: 520,
    left: 21,
    width: 348,
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  optionWrapper: {
    // ShakeView wraps the button; size is set on the button itself.
  },
  optionButton: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDefault: {
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: 'rgba(26,26,46,0.08)',
  },
  optionCorrect: {
    backgroundColor: theme.colors.success,
    borderWidth: 3,
    borderColor: theme.colors.success,
  },
  optionIncorrect: {
    backgroundColor: theme.colors.danger,
    borderWidth: 3,
    borderColor: theme.colors.danger,
  },
  optionLabelBase: {
    textAlign: 'center',
  },
  optionLabelDefault: {
    color: theme.colors.text,
  },
  optionLabelLight: {
    color: '#FFFFFF',
  },

  // Session failure overlay
  failureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26,26,46,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureCard: {
    width: 320,
    backgroundColor: theme.colors.surface,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  failureEmoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  failureTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  failureSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: theme.colors.text,
    textAlign: 'center',
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
});

export { ArithmeticScreen };
export default ArithmeticScreen;
