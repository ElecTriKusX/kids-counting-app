/**
 * ComposeScreen — режим «Собери число».
 *
 * Изменения по запросу:
 *  - Цвета плиток распределены ровно 2+2+2 по yellow-1/2/3, перемешаны.
 *  - При подъёме плитка увеличивается и трясётся (через useTileGesture).
 *  - Sound success/error.
 *  - YellowBurst вокруг bin при правильном (вместо конфетти).
 *  - Bin окрашивается в зелёный/коралловый при correct/invalid.
 *  - Музыка приглушается.
 *  - Maxiмум 2 плитки в bin (защита в session-store).
 *  - ProgressDots с incorrect-маркерами.
 *  - Шрифт Nunito.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DoodleBackground } from '../components/DoodleBackground';
import HomeButton from '../components/HomeButton';
import Tile from '../components/Tile';
import Bin, { type BinLayout } from '../components/Bin';
import RewardOverlay from '../components/RewardOverlay';
import { YellowBurst } from '../components/YellowBurst';
import { ProgressDots, buildDotStates } from '../components/ProgressDots';
import { useComposeGame } from '../features/compose/useComposeGame';
import { useTileGesture } from '../features/compose/useTileGesture';
import { useGameMusicVolume } from '../hooks/useGameMusicVolume';
import { soundAdapter } from '../audio/sound-adapter';
import { getNunitoFamily } from '../hooks/useAppFonts';
import SessionFailure from './SessionFailure';
import type { Tile as TileType } from '../types';

type RootStackParamList = {
  Home: undefined;
  Compose: undefined;
};
type NavProp = NativeStackNavigationProp<RootStackParamList, 'Compose'>;

/**
 * Распределение цветов: 2 плитки yellow-1, 2 yellow-2, 2 yellow-3.
 * Сортируем плитки по ID для стабильного маппинга — тогда при ре-рендерах
 * один и тот же id всегда получает один и тот же цвет.
 */
function buildColorMap(tiles: readonly TileType[]): Record<string, 0 | 1 | 2> {
  const sorted = [...tiles].sort((a, b) => a.id.localeCompare(b.id));
  // Хешируем — простой ротор
  const distribution: Array<0 | 1 | 2> = [0, 0, 1, 1, 2, 2];
  // Перемешиваем детерминированно по hash от первого id
  const seedStr = sorted[0]?.id ?? 'x';
  let seed = 0;
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  // Fisher-Yates с seed
  for (let i = distribution.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    const tmp = distribution[i]!;
    distribution[i] = distribution[j]!;
    distribution[j] = tmp;
  }
  const map: Record<string, 0 | 1 | 2> = {};
  sorted.forEach((tile, i) => {
    map[tile.id] = distribution[i] ?? 0;
  });
  return map;
}

interface DraggableTileProps {
  tile: TileType;
  colorIndex: 0 | 1 | 2;
  binLayout: BinLayout | null;
  hidden: boolean;
  onDrop: () => void;
}

const DraggableTile: React.FC<DraggableTileProps> = ({
  tile,
  colorIndex,
  binLayout,
  hidden,
  onDrop,
}) => {
  const { pan, translateX, translateY, scale, wobble } = useTileGesture({
    tile,
    binLayout,
    onDrop,
  });

  if (hidden) {
    return <View style={styles.tilePlaceholder} />;
  }

  return (
    <GestureDetector gesture={pan}>
      <Tile
        value={tile.value}
        colorIndex={colorIndex}
        translateX={translateX}
        translateY={translateY}
        scale={scale}
        wobble={wobble}
      />
    </GestureDetector>
  );
};

const ComposeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();
  useGameMusicVolume();

  const {
    question,
    bin,
    questionIndex,
    roundScore,
    history,
    isRoundComplete,
    startNewRound,
  } = useComposeGame();

  const [binLayout, setBinLayout] = useState<BinLayout | null>(null);
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set());
  const [burstTrigger, setBurstTrigger] = useState(0);

  // Сбрасываем droppedIds при смене вопроса или очистке корзины
  useEffect(() => {
    if (bin.tiles.length === 0) {
      setDroppedIds(new Set());
    }
  }, [bin.tiles.length, question?.id]);

  // Звук + burst при correct/invalid
  useEffect(() => {
    if (bin.status === 'correct') {
      void soundAdapter.play('success');
      setBurstTrigger((n) => n + 1);
    } else if (bin.status === 'invalid') {
      void soundAdapter.play('error');
    }
  }, [bin.status]);

  const handleLayoutMeasured = useCallback((layout: BinLayout) => {
    setBinLayout(layout);
  }, []);

  const handleTileDropped = useCallback((tileId: string) => {
    setDroppedIds((prev) => {
      const next = new Set(prev);
      next.add(tileId);
      return next;
    });
  }, []);

  const handleGoHome = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRewardComplete = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAnotherRound = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  const isPassingRound = roundScore >= 5;

  const tiles = question?.tiles ?? [];

  // Стабильная карта colorIndex по tile.id для текущей задачи
  const colorMap = useMemo(() => buildColorMap(tiles), [question?.id]);

  const row1 = tiles.slice(0, 3);
  const row2 = tiles.slice(3, 6);

  const dotStates = buildDotStates(history, questionIndex, isRoundComplete);

  // Координаты центра Bin для YellowBurst при correct
  const burstOrigin = binLayout
    ? { x: binLayout.x + binLayout.w / 2, y: binLayout.y + binLayout.h / 2 }
    : null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <DoodleBackground />

      <View style={styles.statusBarSpacer} />

      <View style={[styles.header, { width: width - 32 }]}>
        <HomeButton onPress={handleGoHome} />
        <ProgressDots states={dotStates} />
      </View>

      <View style={[styles.targetRow, { width }]}>
        <Text style={styles.targetLabel}>Собери:</Text>
        <View style={styles.targetChip}>
          <Text style={styles.targetNumber}>
            {question ? String(question.target) : '…'}
          </Text>
        </View>
      </View>

      <View style={styles.binContainer}>
        <Bin
          status={bin.status}
          tiles={bin.tiles}
          sum={bin.sum}
          target={question?.target ?? 0}
          onLayoutMeasured={handleLayoutMeasured}
        />
      </View>

      <View style={[styles.tilesGrid, { width: width - 42 }]}>
        <View style={styles.tilesRow}>
          {row1.map((tile) => (
            <DraggableTile
              key={tile.id}
              tile={tile}
              colorIndex={colorMap[tile.id] ?? 0}
              binLayout={binLayout}
              hidden={droppedIds.has(tile.id)}
              onDrop={() => handleTileDropped(tile.id)}
            />
          ))}
        </View>
        <View style={styles.tilesRow}>
          {row2.map((tile) => (
            <DraggableTile
              key={tile.id}
              tile={tile}
              colorIndex={colorMap[tile.id] ?? 0}
              binLayout={binLayout}
              hidden={droppedIds.has(tile.id)}
              onDrop={() => handleTileDropped(tile.id)}
            />
          ))}
        </View>
      </View>

      {/* YellowBurst вокруг bin при правильном ответе */}
      {burstOrigin && (
        <YellowBurst
          trigger={burstTrigger}
          originX={burstOrigin.x}
          originY={burstOrigin.y}
        />
      )}

      <RewardOverlay
        visible={isRoundComplete && isPassingRound}
        onAnotherRound={handleAnotherRound}
        onComplete={handleRewardComplete}
      />

      {isRoundComplete && !isPassingRound && (
        <SessionFailure
          score={roundScore}
          onRetry={handleAnotherRound}
          onHome={handleGoHome}
        />
      )}
    </GestureHandlerRootView>
  );
};

ComposeScreen.displayName = 'ComposeScreen';

export { ComposeScreen };
export default ComposeScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },

  statusBarSpacer: { height: 62 },

  header: {
    position: 'absolute',
    top: 78,
    left: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  targetRow: {
    position: 'absolute',
    top: 160,
    left: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  targetLabel: {
    fontSize: 24,
    fontFamily: getNunitoFamily('600'),
    color: '#1A1A2E99',
  },
  targetChip: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFD93D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5B800',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  targetNumber: {
    fontSize: 36,
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
    lineHeight: 40,
  },

  binContainer: {
    position: 'absolute',
    top: 260,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  tilesGrid: {
    position: 'absolute',
    top: 580,
    left: 21,
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
  tilePlaceholder: {
    width: 80,
    height: 80,
  },
});
