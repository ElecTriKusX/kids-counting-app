/**
 * CompareScreen — "06 Compare — Objects" and "07 Compare — Digits"
 *
 * Renders the Compare_Mode game screen. The active sub-mode
 * (`objects` | `digits`) is driven by `question.subMode` from the
 * `useCompareGame` hook, which reads `compareSubMode` from the
 * Progress_Store and auto-advances objects → digits after 5 correct
 * answers.
 *
 * Layout (390×844, layout:none):
 *  - DoodleBackground (LinearGradient + faded math symbols)
 *  - StatusBar area (height 62)
 *  - Header at y:78 — HomeButton + 10 progress dots
 *  - Label "Где больше?" at y:160
 *  - Objects sub-mode: two group cards at y:230 with object images
 *  - Digits sub-mode: two large digit tiles at y:260
 *  - Answer buttons (>, <, =) at y:680
 *  - Overlays: ConfettiOverlay (correct), RewardOverlay (round ≥5),
 *    failure view (round <5)
 *
 * Validates: Requirements 3.1–3.6, 6.1–6.5, 7.1, 7.2
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '@/theme';
import { useCompareGame } from '../features/compare/useCompareGame';
import type { CompareLabel } from '../types';
import { HomeButton } from '@/components/HomeButton';
import { NumericText } from '@/components/NumericText';
import { PressableButton } from '@/components/PressableButton';
import { ButtonLabel } from '@/components/ButtonLabel';
import { ConfettiOverlay } from '@/components/ConfettiOverlay';
import { RewardOverlay } from '@/components/RewardOverlay';
import { ShakeView, type ShakeHandle } from '@/components/ShakeView';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
  Compare: undefined;
  Compose: undefined;
  StickerCollection: undefined;
  ParentLock: undefined;
};

type CompareNavProp = NativeStackNavigationProp<RootStackParamList, 'Compare'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = 390;
const TOTAL_QUESTIONS = 10;
const PASSING_SCORE = 5;

/** Max objects shown per group (design spec: Math.min(count, 6)). */
const MAX_OBJECTS = 6;

/** Object images for left and right groups. */
const LEFT_IMAGE = require('../../assets/compose-objects/apple.png') as number;
const RIGHT_IMAGE = require('../../assets/compose-objects/star.png') as number;

/** The three answer labels in display order. */
const ANSWER_LABELS: CompareLabel[] = ['greater', 'less', 'equal'];

/** Display glyphs for each label. */
const LABEL_GLYPH: Record<CompareLabel, string> = {
  greater: '>',
  less: '<',
  equal: '=',
};

// ---------------------------------------------------------------------------
// DoodleBackground
// ---------------------------------------------------------------------------

/**
 * Faded math-symbol doodles layered over a warm cream background.
 * Approximates the LinearGradient + symbol overlay from the design.
 */
const DOODLE_SYMBOLS = ['+', '−', '×', '÷', '=', '>', '<', '?'];

const DoodleBackground: React.FC = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {/* Gradient approximated with a two-stop View */}
    <View style={styles.gradientTop} />
    <View style={styles.gradientBottom} />
    {/* Faded symbol grid */}
    {DOODLE_SYMBOLS.map((sym, i) => (
      <Text
        key={i}
        style={[
          styles.doodleSymbol,
          {
            top: 60 + (i % 4) * 180,
            left: i < 4 ? 20 + i * 80 : 40 + (i - 4) * 90,
            transform: [{ rotate: `${(i * 17) % 30 - 15}deg` }],
          },
        ]}
        accessibilityElementsHidden
      >
        {sym}
      </Text>
    ))}
  </View>
);

DoodleBackground.displayName = 'DoodleBackground';

// ---------------------------------------------------------------------------
// ProgressDots
// ---------------------------------------------------------------------------

interface ProgressDotsProps {
  total: number;
  current: number;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ total, current }) => (
  <View style={styles.dotsRow} accessibilityLabel={`Вопрос ${current + 1} из ${total}`}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i < current
            ? styles.dotCompleted
            : i === current
            ? styles.dotActive
            : styles.dotInactive,
        ]}
      />
    ))}
  </View>
);

ProgressDots.displayName = 'ProgressDots';

// ---------------------------------------------------------------------------
// ObjectsGroup
// ---------------------------------------------------------------------------

interface ObjectsGroupProps {
  count: number;
  image: number;
  borderColor: string;
  accessibilityLabel: string;
}

/**
 * Renders up to MAX_OBJECTS images in a 2-column grid inside a card.
 */
const ObjectsGroup: React.FC<ObjectsGroupProps> = ({
  count,
  image,
  borderColor,
  accessibilityLabel,
}) => {
  const displayCount = Math.min(count, MAX_OBJECTS);
  const rows: number[][] = [];
  for (let i = 0; i < displayCount; i += 2) {
    rows.push(
      i + 1 < displayCount ? [i, i + 1] : [i],
    );
  }

  return (
    <View
      style={[styles.objectsCard, { borderColor }]}
      accessibilityLabel={accessibilityLabel}
    >
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.objectsRow}>
          {row.map((itemIdx) => (
            <Image
              key={itemIdx}
              source={image}
              style={styles.objectImage}
              resizeMode="contain"
              accessibilityElementsHidden
            />
          ))}
        </View>
      ))}
    </View>
  );
};

ObjectsGroup.displayName = 'ObjectsGroup';

// ---------------------------------------------------------------------------
// DigitTile
// ---------------------------------------------------------------------------

interface DigitTileProps {
  value: number;
  borderColor: string;
  accessibilityLabel: string;
}

const DigitTile: React.FC<DigitTileProps> = ({
  value,
  borderColor,
  accessibilityLabel,
}) => (
  <View
    style={[styles.digitTile, { borderColor }]}
    accessibilityLabel={accessibilityLabel}
  >
    <NumericText
      fontSize={120}
      style={styles.digitText}
      accessibilityLabel={String(value)}
    >
      {value}
    </NumericText>
  </View>
);

DigitTile.displayName = 'DigitTile';

// ---------------------------------------------------------------------------
// FailureView
// ---------------------------------------------------------------------------

interface FailureViewProps {
  onRetry: () => void;
}

const FailureView: React.FC<FailureViewProps> = ({ onRetry }) => (
  <View style={styles.failureOverlay} pointerEvents="box-none">
    <View style={styles.failureCard}>
      <Text style={styles.failureEmoji}>😔</Text>
      <Text style={styles.failureTitle}>Попробуй ещё раз!</Text>
      <PressableButton
        onPress={onRetry}
        accessibilityLabel="Попробовать снова"
        style={styles.retryButton}
      >
        <ButtonLabel style={styles.retryLabel}>Ещё раз</ButtonLabel>
      </PressableButton>
    </View>
  </View>
);

FailureView.displayName = 'FailureView';

// ---------------------------------------------------------------------------
// CompareScreen
// ---------------------------------------------------------------------------

const CompareScreen: React.FC = () => {
  const navigation = useNavigation<CompareNavProp>();

  const {
    question,
    questionIndex,
    isRoundComplete,
    selectedAnswer,
    feedbackKind,
    answer,
    startNewRound,
  } = useCompareGame();

  // Track correct count locally to decide reward vs failure at round end.
  const correctCountRef = useRef(0);
  const [showReward, setShowReward] = useState(false);
  const [showFailure, setShowFailure] = useState(false);

  // Shake refs — one per answer button.
  const shakeRefs = useRef<Record<CompareLabel, ShakeHandle | null>>({
    greater: null,
    less: null,
    equal: null,
  });

  // Start a fresh round on mount.
  useEffect(() => {
    correctCountRef.current = 0;
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track correct answers for end-of-round decision.
  useEffect(() => {
    if (feedbackKind === 'correct') {
      correctCountRef.current += 1;
    }
  }, [feedbackKind, questionIndex]);

  // Trigger shake on incorrect answer.
  useEffect(() => {
    if (feedbackKind === 'incorrect' && selectedAnswer !== null) {
      shakeRefs.current[selectedAnswer]?.shake();
    }
  }, [feedbackKind, selectedAnswer]);

  // When round completes, decide reward vs failure.
  useEffect(() => {
    if (!isRoundComplete) return;
    if (correctCountRef.current >= PASSING_SCORE) {
      setShowReward(true);
    } else {
      setShowFailure(true);
    }
  }, [isRoundComplete]);

  const handleAnswer = useCallback(
    (label: CompareLabel) => {
      answer(label);
    },
    [answer],
  );

  const handleRewardComplete = useCallback(() => {
    setShowReward(false);
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setShowFailure(false);
    correctCountRef.current = 0;
    startNewRound();
  }, [startNewRound]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Determine button visual state.
  const getButtonStyle = useCallback(
    (label: CompareLabel) => {
      if (feedbackKind === 'idle' || selectedAnswer === null) {
        return {};
      }
      // feedbackKind is 'correct' | 'incorrect' here
      if (label === question?.correct) {
        return {
          backgroundColor: theme.colors.correct,
          borderColor: theme.colors.correct,
        };
      }
      if (label === selectedAnswer && feedbackKind === 'incorrect') {
        return {
          backgroundColor: theme.colors.incorrect,
          borderColor: theme.colors.incorrect,
        };
      }
      return {};
    },
    [feedbackKind, selectedAnswer, question],
  );

  const getButtonLabelStyle = useCallback(
    (label: CompareLabel) => {
      if (feedbackKind === 'idle' || selectedAnswer === null) return {};
      // feedbackKind is 'correct' | 'incorrect' here
      if (
        label === question?.correct ||
        (label === selectedAnswer && feedbackKind === 'incorrect')
      ) {
        return { color: '#FFFFFF' };
      }
      return {};
    },
    [feedbackKind, selectedAnswer, question],
  );

  const isAnswerDisabled = feedbackKind !== 'idle' || isRoundComplete;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Background */}
      <DoodleBackground />

      {/* Status bar spacer */}
      <View style={styles.statusBarSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <HomeButton onPress={goBack} />
        <ProgressDots total={TOTAL_QUESTIONS} current={questionIndex} />
      </View>

      {/* Question label */}
      <Text style={styles.questionLabel}>Где больше?</Text>

      {/* Question area */}
      {question !== null && (
        <>
          {question.subMode === 'objects' ? (
            /* Objects sub-mode */
            <View style={styles.objectsContainer}>
              <ObjectsGroup
                count={question.left}
                image={LEFT_IMAGE}
                borderColor={theme.colors.yellow1}
                accessibilityLabel={`Левая группа: ${question.left} объектов`}
              />
              <ObjectsGroup
                count={question.right}
                image={RIGHT_IMAGE}
                borderColor={theme.colors.yellow3}
                accessibilityLabel={`Правая группа: ${question.right} объектов`}
              />
            </View>
          ) : (
            /* Digits sub-mode */
            <View style={styles.digitsContainer}>
              <DigitTile
                value={question.left}
                borderColor={theme.colors.yellow1}
                accessibilityLabel={`Левое число: ${question.left}`}
              />
              <DigitTile
                value={question.right}
                borderColor={theme.colors.yellow3}
                accessibilityLabel={`Правое число: ${question.right}`}
              />
            </View>
          )}
        </>
      )}

      {/* Answer buttons */}
      <View style={styles.answersRow}>
        {ANSWER_LABELS.map((label) => (
          <ShakeView
            key={label}
            ref={(r) => {
              shakeRefs.current[label] = r;
            }}
          >
            <PressableButton
              onPress={() => handleAnswer(label)}
              disabled={isAnswerDisabled}
              accessibilityLabel={`Ответ ${LABEL_GLYPH[label]}`}
              style={[styles.answerButton, getButtonStyle(label)]}
            >
              <ButtonLabel style={[styles.answerLabel, getButtonLabelStyle(label)]}>
                {LABEL_GLYPH[label]}
              </ButtonLabel>
            </PressableButton>
          </ShakeView>
        ))}
      </View>

      {/* Confetti overlay — shown on correct answer */}
      <ConfettiOverlay visible={feedbackKind === 'correct'} />

      {/* Reward overlay — shown on round complete with passing score */}
      <RewardOverlay visible={showReward} onComplete={handleRewardComplete} />

      {/* Failure view — shown on round complete with failing score */}
      {showFailure && <FailureView onRetry={handleRetry} />}
    </View>
  );
};

CompareScreen.displayName = 'CompareScreen';

export { CompareScreen };
export default CompareScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { colors, radii, spacing } = theme;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: SCREEN_WIDTH,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },

  // ---- Background ----
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    backgroundColor: '#FFF3D6', // warm yellow tint
    opacity: 0.6,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 424,
    backgroundColor: colors.background,
    opacity: 0.9,
  },
  doodleSymbol: {
    position: 'absolute',
    fontSize: 48,
    fontWeight: '800',
    color: `${colors.text}0D`, // ~5% opacity
  },

  // ---- Status bar spacer ----
  statusBarSpacer: {
    height: 62,
  },

  // ---- Header ----
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

  // ---- Progress dots ----
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: colors.success,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotInactive: {
    backgroundColor: `${colors.text}1A`, // ~10% opacity
  },

  // ---- Question label ----
  questionLabel: {
    position: 'absolute',
    top: 160,
    left: 0,
    width: SCREEN_WIDTH,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: `${colors.text}99`, // #1A1A2E at ~60% opacity
  },

  // ---- Objects sub-mode ----
  objectsContainer: {
    position: 'absolute',
    top: 230,
    left: 21,
    width: 348,
    height: 380,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  objectsCard: {
    width: 160,
    height: 380,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectImage: {
    width: 48,
    height: 48,
  },

  // ---- Digits sub-mode ----
  digitsContainer: {
    position: 'absolute',
    top: 260,
    left: 0,
    width: SCREEN_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 60,
  },
  digitTile: {
    width: 140,
    height: 200,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  digitText: {
    fontWeight: '800',
    color: colors.text,
    lineHeight: 130,
  },

  // ---- Answer buttons ----
  answersRow: {
    position: 'absolute',
    top: 680,
    left: 21,
    width: 348,
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  answerButton: {
    width: 104,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: `${colors.text}14`, // #1A1A2E at ~8% opacity
    alignItems: 'center',
    justifyContent: 'center',
    // Override PressableButton minHeight/minWidth defaults
    minHeight: 88,
    minWidth: 104,
  },
  answerLabel: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 40,
  },

  // ---- Failure overlay ----
  failureOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,26,46,0.55)',
  },
  failureCard: {
    width: 300,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  failureEmoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  failureTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  retryButton: {
    width: '100%',
    height: 56,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  retryLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
