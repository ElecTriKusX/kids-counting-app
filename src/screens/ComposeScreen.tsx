/**
 * ComposeScreen — "08 Compose — Idle" from design.pen
 *
 * Drag-and-drop number composition game. The child drags numbered tiles
 * into a bin until the sum matches the target. Correct answers trigger
 * confetti; completing 10 questions shows the RewardOverlay.
 *
 * Layout (390×844):
 *  - DoodleBackground (LinearGradient + faded math symbols)
 *  - StatusBar area (height 62)
 *  - Header at y:78 — HomeButton + 10 progress dots
 *  - Target display at y:160 — "Собери:" label + target chip
 *  - Bin (drop zone) at y:260
 *  - Tiles grid at y:580 — 2 rows × 3 tiles
 *
 * Validates: Requirements 4.1–4.7, 6.1, 6.5, 7.1, 7.2
 */

import React, { useCallback, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '@/theme';
import HomeButton from '@/components/HomeButton';
import NumericText from '@/components/NumericText';
import Tile from '@/components/Tile';
import Bin from '@/components/Bin';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import RewardOverlay from '@/components/RewardOverlay';
import { useComposeGame } from '@/features/compose/useComposeGame';
import { useTileGesture } from '@/features/compose/useTileGesture';
import type { BinLayout as BinLayoutType } from '@/components/Bin';
import type { Tile as TileType } from '@/types';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------

type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
  Compare: undefined;
  Compose: undefined;
  StickerCollection: undefined;
  ParentLock: undefined;
};

type ComposeNavProp = NativeStackNavigationProp<RootStackParamList, 'Compose'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROUND_LENGTH = 10;

// ---------------------------------------------------------------------------
// ProgressDots sub-component
// ---------------------------------------------------------------------------

interface ProgressDotsProps {
  total: number;
  completed: number;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ total, completed }) => (
  <View style={styles.dotsRow} accessibilityLabel={`Вопрос ${completed + 1} из ${total}`}>
    {Array.from({ length: total }, (_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i < completed ? styles.dotCompleted : styles.dotPending,
        ]}
      />
    ))}
  </View>
);

ProgressDots.displayName = 'ProgressDots';

// ---------------------------------------------------------------------------
// DraggableTile sub-component
// ---------------------------------------------------------------------------

interface DraggableTileProps {
  tile: TileType;
  colorIndex: 0 | 1 | 2;
  binLayout: BinLayoutType | null;
  onDrop?: () => void;
}

const DraggableTile: React.FC<DraggableTileProps> = ({
  tile,
  colorIndex,
  binLayout,
  onDrop,
}) => {
  const { pan, translateX, translateY, scale } = useTileGesture({
    tile,
    binLayout,
    onDrop,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>
        <Tile
          value={tile.value}
          colorIndex={colorIndex}
          style={styles.tile}
        />
      </Animated.View>
    </GestureDetector>
  );
};

DraggableTile.displayName = 'DraggableTile';

// ---------------------------------------------------------------------------
// FailureView sub-component
// ---------------------------------------------------------------------------

interface FailureViewProps {
  onRetry: () => void;
}

const FailureView: React.FC<FailureViewProps> = ({ onRetry }) => (
  <View style={styles.failureOverlay} accessibilityRole="alert">
    <View style={styles.failureCard}>
      <Text style={styles.failureEmoji}>😔</Text>
      <Text style={styles.failureTitle}>Попробуй ещё раз!</Text>
      <View style={styles.retryButton} accessibilityRole="button">
        <Text style={styles.retryLabel} onPress={onRetry}>
          Начать заново
        </Text>
      </View>
    </View>
  </View>
);

FailureView.displayName = 'FailureView';

// ---------------------------------------------------------------------------
// ComposeScreen
// ---------------------------------------------------------------------------

const ComposeScreen: React.FC = () => {
  const navigation = useNavigation<ComposeNavProp>();

  const {
    question,
    bin,
    questionIndex,
    isRoundComplete,
    startNewRound,
  } = useComposeGame();

  // Bin layout measured via measureInWindow — stored in state so DraggableTile
  // instances re-render with the correct window-space rectangle for hit-testing.
  const [binLayout, setBinLayout] = useState<BinLayoutType | null>(null);

  const handleLayoutMeasured = useCallback((layout: BinLayoutType) => {
    setBinLayout(layout);
  }, []);

  // Confetti is shown while bin.status === 'correct' (before the next
  // question loads). The watcher in useComposeGame clears the bin after
  // FEEDBACK_DELAY_MS, so confetti naturally disappears with it.
  const showConfetti = bin.status === 'correct';

  // Show reward overlay when the round is complete (10 questions answered).
  // The hook awards a sticker on completion regardless of score.
  const showReward = isRoundComplete;

  const handleGoHome = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRewardComplete = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  // Split tiles into two rows of 3
  const tiles = question?.tiles ?? [];
  const row1 = tiles.slice(0, 3);
  const row2 = tiles.slice(3, 6);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Background ── */}
      <View style={styles.background}>
        {/* Gradient approximated with cream background; math symbols as faded text */}
        <View style={styles.gradientLayer} />
        <View style={styles.doodleLayer} pointerEvents="none">
          {DOODLE_SYMBOLS.map((sym, i) => (
            <Text key={i} style={[styles.doodleSymbol, DOODLE_POSITIONS[i]!]}>
              {sym}
            </Text>
          ))}
        </View>
      </View>

      {/* ── Header (y:78) ── */}
      <View style={styles.header}>
        <HomeButton onPress={handleGoHome} />
        <ProgressDots total={ROUND_LENGTH} completed={questionIndex} />
      </View>

      {/* ── Target display (y:160) ── */}
      <View style={styles.targetRow}>
        <Text style={styles.targetLabel}>Собери:</Text>
        <View style={styles.targetChip}>
          <NumericText fontSize={36} style={styles.targetNumber}>
            {question ? String(question.target) : '…'}
          </NumericText>
        </View>
      </View>

      {/* ── Bin / drop zone (y:260) ── */}
      <View style={styles.binContainer}>
        <Bin
          status={bin.status}
          tiles={bin.tiles}
          sum={bin.sum}
          target={question?.target ?? 0}
          onLayoutMeasured={handleLayoutMeasured}
        />
      </View>

      {/* ── Tiles grid (y:580) ── */}
      <View style={styles.tilesGrid}>
        <View style={styles.tilesRow}>
          {row1.map((tile, i) => (
            <DraggableTile
              key={tile.id}
              tile={tile}
              colorIndex={(i % 3) as 0 | 1 | 2}
              binLayout={binLayout}
            />
          ))}
        </View>
        <View style={styles.tilesRow}>
          {row2.map((tile, i) => (
            <DraggableTile
              key={tile.id}
              tile={tile}
              colorIndex={(i % 3) as 0 | 1 | 2}
              binLayout={binLayout}
            />
          ))}
        </View>
      </View>

      {/* ── Overlays ── */}
      <ConfettiOverlay visible={showConfetti} />
      <RewardOverlay visible={showReward} onComplete={handleRewardComplete} />
    </GestureHandlerRootView>
  );
};

ComposeScreen.displayName = 'ComposeScreen';

export { ComposeScreen };
export default ComposeScreen;

// ---------------------------------------------------------------------------
// Doodle background data
// ---------------------------------------------------------------------------

const DOODLE_SYMBOLS = ['+', '−', '×', '÷', '=', '+', '−', '×', '÷', '=', '+', '−'];

const DOODLE_POSITIONS: readonly Partial<{
  top: number;
  left: number;
  right: number;
  bottom: number;
}>[] = [
  { top: 80, left: 20 },
  { top: 120, right: 30 },
  { top: 200, left: 60 },
  { top: 300, right: 50 },
  { top: 400, left: 10 },
  { top: 500, right: 20 },
  { top: 600, left: 40 },
  { top: 700, right: 60 },
  { top: 150, left: 180 },
  { top: 350, right: 140 },
  { top: 550, left: 160 },
  { top: 750, right: 100 },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { colors, radii, spacing } = theme;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Background layers ──
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  doodleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  doodleSymbol: {
    position: 'absolute',
    fontSize: 28,
    fontWeight: '700',
    color: `${colors.text}12`, // ~7% opacity — faded math symbols
  },

  // ── Header ──
  header: {
    position: 'absolute',
    top: 78,
    left: spacing.md,
    width: 358,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Progress dots ──
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotCompleted: {
    backgroundColor: colors.primary,
  },
  dotPending: {
    backgroundColor: `${colors.text}20`,
  },

  // ── Target display ──
  targetRow: {
    position: 'absolute',
    top: 160,
    left: 0,
    width: 390,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  targetLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: `${colors.text}99`, // #1A1A2E at ~60% opacity
  },
  targetChip: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.yellow1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  targetNumber: {
    color: colors.text,
    fontWeight: '800',
  },

  // ── Bin container ──
  binContainer: {
    position: 'absolute',
    top: 260,
    left: 35,
    width: 320,
    height: 160,
  },

  // ── Tiles grid ──
  tilesGrid: {
    position: 'absolute',
    top: 580,
    left: 21,
    width: 348,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  tilesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  tile: {
    shadowColor: colors.text,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  // ── Failure overlay ──
  failureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,248,240,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureCard: {
    width: 300,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  failureEmoji: {
    fontSize: 56,
    lineHeight: 64,
  },
  failureTitle: {
    fontSize: 24,
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
  },
  retryLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
