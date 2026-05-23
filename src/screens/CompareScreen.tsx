/**
 * CompareScreen — режим «Кто больше?».
 *
 * Изменения по запросу:
 *  - Все 5 объектов (apple, star, bee, balloon, ship) с ротацией.
 *  - YellowBurst вокруг кнопки при правильном ответе (вместо конфетти).
 *  - Sound success/error.
 *  - Музыка приглушается через useGameMusicVolume.
 *  - ProgressDots с incorrect-маркерами.
 *  - Шрифт Nunito.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { DoodleBackground } from '../components/DoodleBackground';
import HomeButton from '../components/HomeButton';
import PressableButton from '../components/PressableButton';
import ShakeView, { type ShakeHandle } from '../components/ShakeView';
import RewardOverlay from '../components/RewardOverlay';
import { YellowBurst } from '../components/YellowBurst';
import { ProgressDots, buildDotStates } from '../components/ProgressDots';
import { useCompareGame } from '../features/compare/useCompareGame';
import { useGameMusicVolume } from '../hooks/useGameMusicVolume';
import { soundAdapter } from '../audio/sound-adapter';
import { getNunitoFamily } from '../hooks/useAppFonts';
import SessionFailure from './SessionFailure';
import type { CompareLabel } from '../types';

type RootStackParamList = {
  Home: undefined;
  Compare: undefined;
};
type NavProp = NativeStackNavigationProp<RootStackParamList, 'Compare'>;

const OBJECT_IMAGES = {
  apple: require('../../assets/compose-objects/apple.png') as ImageSourcePropType,
  star: require('../../assets/compose-objects/star.png') as ImageSourcePropType,
  bee: require('../../assets/compose-objects/bee.png') as ImageSourcePropType,
  balloon: require('../../assets/compose-objects/balloon.png') as ImageSourcePropType,
  ship: require('../../assets/compose-objects/ship.png') as ImageSourcePropType,
};
type ObjectKey = keyof typeof OBJECT_IMAGES;
const OBJECT_KEYS: readonly ObjectKey[] = ['apple', 'star', 'bee', 'balloon', 'ship'];

function pickObjectPair(seed: number): { left: ObjectKey; right: ObjectKey } {
  const leftIdx = Math.abs(seed) % OBJECT_KEYS.length;
  const rightOffset = 1 + (Math.abs(seed) % (OBJECT_KEYS.length - 1));
  const rightIdx = (leftIdx + rightOffset) % OBJECT_KEYS.length;
  const left = OBJECT_KEYS[leftIdx]!;
  const right = OBJECT_KEYS[rightIdx]!;
  return { left, right };
}

const ANSWER_LABELS: readonly CompareLabel[] = ['greater', 'less', 'equal'];
const LABEL_GLYPH: Record<CompareLabel, string> = {
  greater: '>',
  less: '<',
  equal: '=',
};

interface ObjectsGroupProps {
  count: number;
  objectKey: ObjectKey;
  borderColor: string;
}

const ObjectsGroup: React.FC<ObjectsGroupProps> = ({
  count,
  objectKey,
  borderColor,
}) => {
  const safeCount = Math.max(1, Math.min(count, 6));
  const rows: number[][] = [];
  for (let i = 0; i < safeCount; i += 2) {
    rows.push(i + 1 < safeCount ? [i, i + 1] : [i]);
  }
  const source = OBJECT_IMAGES[objectKey];
  return (
    <View style={[styles.objectsCard, { borderColor }]}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.objectsRow}>
          {row.map((idx) => (
            <Image
              key={idx}
              source={source}
              style={styles.objectImage}
              resizeMode="contain"
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const CompareScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();
  useGameMusicVolume();

  const {
    question,
    questionIndex,
    isRoundComplete,
    history,
    selectedAnswer,
    feedbackKind,
    answer,
    startNewRound,
  } = useCompareGame();

  const correctCountRef = useRef(0);
  const [showReward, setShowReward] = useState(false);
  const [showFailure, setShowFailure] = useState(false);

  const [burstTrigger, setBurstTrigger] = useState(0);
  const [burstOrigin, setBurstOrigin] = useState<{ x: number; y: number } | null>(
    null,
  );
  const buttonRefs = useRef<Record<CompareLabel, View | null>>({
    greater: null,
    less: null,
    equal: null,
  });

  const shakeRefs = useRef<Record<CompareLabel, ShakeHandle | null>>({
    greater: null,
    less: null,
    equal: null,
  });

  useEffect(() => {
    correctCountRef.current = 0;
    setShowReward(false);
    setShowFailure(false);
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Подсчёт правильных ответов и звуки/анимации
  useEffect(() => {
    if (feedbackKind === 'idle') return;
    if (feedbackKind === 'correct') {
      correctCountRef.current += 1;
      void soundAdapter.play('success');
      if (selectedAnswer !== null) {
        const node = buttonRefs.current[selectedAnswer];
        if (node) {
          node.measureInWindow((x, y, w, h) => {
            setBurstOrigin({ x: x + w / 2, y: y + h / 2 });
            setBurstTrigger((n) => n + 1);
          });
        }
      }
    } else if (feedbackKind === 'incorrect') {
      void soundAdapter.play('error');
      if (selectedAnswer !== null) {
        shakeRefs.current[selectedAnswer]?.shake();
      }
    }
  }, [feedbackKind, selectedAnswer, questionIndex]);

  useEffect(() => {
    if (!isRoundComplete) return;
    if (correctCountRef.current >= 5) setShowReward(true);
    else setShowFailure(true);
  }, [isRoundComplete]);

  const objectPair = useMemo(
    () => pickObjectPair(questionIndex),
    [questionIndex],
  );

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRewardComplete = useCallback(() => {
    setShowReward(false);
    navigation.goBack();
  }, [navigation]);

  const handleAnotherRound = useCallback(() => {
    setShowReward(false);
    setShowFailure(false);
    correctCountRef.current = 0;
    startNewRound();
  }, [startNewRound]);

  const handleRetry = handleAnotherRound;

  const isLocked = feedbackKind !== 'idle' || isRoundComplete;

  const getButtonState = (label: CompareLabel) => {
    if (feedbackKind === 'idle' || selectedAnswer === null) return 'default';
    if (label === question?.correct) return 'correct';
    if (label === selectedAnswer && feedbackKind === 'incorrect') return 'incorrect';
    return 'default';
  };

  const dotStates = buildDotStates(history, questionIndex, isRoundComplete);

  return (
    <View style={styles.root}>
      <DoodleBackground />

      <View style={styles.statusBarSpacer} />

      <View style={[styles.header, { width: width - 32 }]}>
        <HomeButton onPress={goBack} />
        <ProgressDots states={dotStates} />
      </View>

      <Text style={[styles.questionLabel, { width }]}>Где больше?</Text>

      {question !== null && (
        <>
          {question.subMode === 'objects' ? (
            <View style={[styles.objectsContainer, { width: width - 42 }]}>
              <ObjectsGroup
                count={question.left}
                objectKey={objectPair.left}
                borderColor="#FFD93D"
              />
              <ObjectsGroup
                count={question.right}
                objectKey={objectPair.right}
                borderColor="#FFBA59"
              />
            </View>
          ) : (
            <View style={[styles.digitsContainer, { width }]}>
              <View style={[styles.digitTile, { borderColor: '#FFD93D' }]}>
                <Text style={styles.digitText}>{question.left}</Text>
              </View>
              <View style={[styles.digitTile, { borderColor: '#FFBA59' }]}>
                <Text style={styles.digitText}>{question.right}</Text>
              </View>
            </View>
          )}
        </>
      )}

      <View style={[styles.answersRow, { width: width - 42 }]}>
        {ANSWER_LABELS.map((label) => {
          const state = getButtonState(label);
          return (
            <ShakeView
              key={label}
              ref={(r) => {
                shakeRefs.current[label] = r;
              }}
            >
              <View
                ref={(r) => {
                  buttonRefs.current[label] = r;
                }}
              >
                <PressableButton
                  onPress={() => answer(label)}
                  disabled={isLocked}
                  accessibilityLabel={`Ответ ${LABEL_GLYPH[label]}`}
                  style={[
                    styles.answerButton,
                    state === 'correct' && styles.answerButtonCorrect,
                    state === 'incorrect' && styles.answerButtonIncorrect,
                  ]}
                >
                  <Text
                    style={[
                      styles.answerLabel,
                      state !== 'default' && styles.answerLabelLight,
                    ]}
                  >
                    {LABEL_GLYPH[label]}
                  </Text>
                </PressableButton>
              </View>
            </ShakeView>
          );
        })}
      </View>

      {burstOrigin !== null && (
        <YellowBurst
          trigger={burstTrigger}
          originX={burstOrigin.x}
          originY={burstOrigin.y}
        />
      )}

      {showFailure && (
        <SessionFailure
          score={correctCountRef.current}
          onRetry={handleRetry}
          onHome={goBack}
        />
      )}

      <RewardOverlay
        visible={showReward}
        onAnotherRound={handleAnotherRound}
        onComplete={handleRewardComplete}
      />
    </View>
  );
};

CompareScreen.displayName = 'CompareScreen';

export { CompareScreen };
export default CompareScreen;

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

  questionLabel: {
    position: 'absolute',
    top: 160,
    left: 0,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: getNunitoFamily('700'),
    color: '#1A1A2E99',
  },

  objectsContainer: {
    position: 'absolute',
    top: 230,
    left: 21,
    height: 380,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  objectsCard: {
    flex: 1,
    height: 380,
    borderRadius: 24,
    backgroundColor: '#FFFDF9',
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

  digitsContainer: {
    position: 'absolute',
    top: 260,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 60,
  },
  digitTile: {
    width: 140,
    height: 200,
    borderRadius: 32,
    backgroundColor: '#FFFDF9',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  digitText: {
    fontSize: 120,
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
    lineHeight: 130,
  },

  answersRow: {
    position: 'absolute',
    bottom: 64,
    left: 21,
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
    backgroundColor: '#FFFDF9',
    borderWidth: 3,
    borderColor: 'rgba(26,26,46,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    minWidth: 104,
  },
  answerButtonCorrect: {
    backgroundColor: '#6BCB77',
    borderColor: '#6BCB77',
  },
  answerButtonIncorrect: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  answerLabel: {
    fontSize: 56,
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
    lineHeight: 60,
  },
  answerLabelLight: {
    color: '#FFFFFF',
  },
});
