/**
 * ArithmeticScreen — режим «Сложение и вычитание».
 *
 * Изменения по запросу:
 *  - Адаптивные размеры кнопок ответа: при 4 вариантах ужимаем до
 *    fit_container с min-width, чтобы не выходили за экран.
 *  - Sound success.mp3 при правильном, error.mp3 при неправильном.
 *  - Конфетти убраны из feedback'а — теперь YellowBurst вокруг кнопки.
 *  - Неправильный shake (через ShakeView).
 *  - Музыка приглушается через useGameMusicVolume.
 *  - ProgressDots с цветными incorrect-метками.
 *  - Шрифт Nunito.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import {
  ProgressDots,
  buildDotStates,
} from '../components/ProgressDots';
import { useArithmeticGame } from '../features/arithmetic/useArithmeticGame';
import { useGameMusicVolume } from '../hooks/useGameMusicVolume';
import { soundAdapter } from '../audio/sound-adapter';
import { getNunitoFamily } from '../hooks/useAppFonts';
import SessionFailure from './SessionFailure';

type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
};
type NavProp = NativeStackNavigationProp<RootStackParamList, 'Arithmetic'>;

const REFERENCE_WIDTH = 390;

const ArithmeticScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();
  useGameMusicVolume();

  const {
    question,
    questionIndex,
    isRoundComplete,
    roundScore,
    history,
    selectedAnswer,
    feedbackKind,
    answer,
    startNewRound,
  } = useArithmeticGame();

  const [burstTrigger, setBurstTrigger] = useState(0);
  const [burstOrigin, setBurstOrigin] = useState<{ x: number; y: number } | null>(
    null,
  );
  const buttonRefs = useRef<Record<number, View | null>>({});

  // По одному shake-ref на каждый из возможных 4 слотов
  const shakeRefs = [
    useRef<ShakeHandle>(null),
    useRef<ShakeHandle>(null),
    useRef<ShakeHandle>(null),
    useRef<ShakeHandle>(null),
  ] as const;

  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Звук + shake при ответе
  useEffect(() => {
    if (feedbackKind === 'idle') return;
    if (feedbackKind === 'correct') {
      void soundAdapter.play('success');
      // Триггерим YellowBurst вокруг выбранной кнопки
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
      if (selectedAnswer !== null && question !== null) {
        const idx = question.options.indexOf(selectedAnswer);
        if (idx >= 0 && idx < shakeRefs.length) {
          shakeRefs[idx]?.current?.shake();
        }
      }
    }
  }, [feedbackKind, selectedAnswer, question, shakeRefs]);

  const handleGoHome = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRewardComplete = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  const questionText =
    question !== null
      ? `${question.a} ${question.op === 'add' ? '+' : '−'} ${question.b} = ?`
      : '… = ?';

  const isPassingRound = roundScore >= 5;

  // Адаптив для кнопок ответа: ужимаем при 4 вариантах
  const optionCount = question?.options.length ?? 3;
  const buttonStyle = useMemo(() => {
    const screenW = Math.max(width, 320);
    const padding = 21 * 2;
    const gap = 18 * (optionCount - 1);
    const available = screenW - padding - gap;
    const calculated = Math.floor(available / optionCount);
    // Целевой размер 96, но если не влезает — уменьшаем (минимум 72)
    const size = Math.max(72, Math.min(96, calculated));
    return { width: size, height: size, minWidth: size, minHeight: size };
  }, [width, optionCount]);

  const optionFontSize = buttonStyle.width >= 90 ? 48 : 36;

  const dotStates = buildDotStates(history, questionIndex, isRoundComplete);

  return (
    <View style={styles.root}>
      <DoodleBackground />

      <View style={styles.statusBarSpacer} />

      <View style={[styles.header, { width: width - 32 }]}>
        <HomeButton onPress={handleGoHome} />
        <ProgressDots states={dotStates} />
      </View>

      <View style={[styles.questionContainer, { top: width < 360 ? 200 : 240 }]}>
        <Text style={[styles.questionText, { fontSize: width < 360 ? 64 : 80 }]}>
          {questionText}
        </Text>
      </View>

      {question !== null && (
        <View
          style={[
            styles.optionsRow,
            { top: width < 360 ? 460 : 520, gap: 18 },
          ]}
        >
          {question.options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isCorrectOption = opt === question.correctAnswer;
            const showAsCorrect =
              feedbackKind === 'correct' && isSelected;
            const showAsIncorrect =
              feedbackKind === 'incorrect' && isSelected;
            const showCorrectHint =
              feedbackKind === 'incorrect' && isCorrectOption;

            return (
              <ShakeView
                key={`${question.id}-${idx}`}
                ref={shakeRefs[idx] ?? shakeRefs[0]}
              >
                <View
                  ref={(r) => {
                    buttonRefs.current[opt] = r;
                  }}
                >
                  <PressableButton
                    onPress={() => answer(opt)}
                    disabled={feedbackKind !== 'idle' || isRoundComplete}
                    accessibilityLabel={`Ответ ${opt}`}
                    style={[
                      styles.optionButton,
                      buttonStyle,
                      showAsCorrect && styles.optionCorrect,
                      showAsIncorrect && styles.optionIncorrect,
                      showCorrectHint && styles.optionCorrectHint,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { fontSize: optionFontSize },
                        (showAsCorrect || showAsIncorrect) &&
                          styles.optionLabelLight,
                      ]}
                    >
                      {opt}
                    </Text>
                  </PressableButton>
                </View>
              </ShakeView>
            );
          })}
        </View>
      )}

      {/* YellowBurst вокруг правильно нажатой кнопки */}
      {burstOrigin !== null && (
        <YellowBurst
          trigger={burstTrigger}
          originX={burstOrigin.x}
          originY={burstOrigin.y}
        />
      )}

      {/* Failure overlay */}
      {isRoundComplete && !isPassingRound && (
        <SessionFailure score={roundScore} onRetry={handleRetry} onHome={handleGoHome} />
      )}

      {/* Reward overlay при успешном раунде */}
      <RewardOverlay
        visible={isRoundComplete && isPassingRound}
        onAnotherRound={handleRetry}
        onComplete={handleRewardComplete}
      />
    </View>
  );
};

ArithmeticScreen.displayName = 'ArithmeticScreen';

export { ArithmeticScreen };
export default ArithmeticScreen;

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

  questionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  questionText: {
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
    textAlign: 'center',
  },

  optionsRow: {
    position: 'absolute',
    left: 21,
    right: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButton: {
    borderRadius: 24,
    backgroundColor: '#FFFDF9',
    borderWidth: 3,
    borderColor: 'rgba(26,26,46,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  optionCorrect: {
    backgroundColor: '#6BCB77',
    borderColor: '#6BCB77',
  },
  optionIncorrect: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  optionCorrectHint: {
    borderColor: '#6BCB77',
  },
  optionLabel: {
    fontFamily: getNunitoFamily('800'),
    color: '#1A1A2E',
  },
  optionLabelLight: {
    color: '#FFFFFF',
  },
});
