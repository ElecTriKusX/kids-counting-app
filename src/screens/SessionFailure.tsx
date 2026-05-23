/**
 * SessionFailure — оверлей при провале раунда (<5/10 правильных).
 *
 * 1:1 с Pencil-фреймом `TVrGQ` (20 Session Failure):
 *  - BackgroundGradient
 *  - Маскот 200×200
 *  - Пилюля «N из 10»
 *  - «Не страшно!» 36/800
 *  - Подпись «Каждая попытка делает тебя умнее...»
 *  - Кнопки: «Домой» (134 width) + «Попробуем ещё» (fill)
 *
 * Без конфетти.
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { House, RotateCcw } from 'lucide-react-native';

import { BackgroundGradient } from '../components/BackgroundGradient';
import PressableButton from '../components/PressableButton';
import { getNunitoFamily } from '../hooks/useAppFonts';

export interface SessionFailureProps {
  score: number;
  onRetry: () => void;
  onHome: () => void;
}

const SessionFailure: React.FC<SessionFailureProps> = ({
  score,
  onRetry,
  onHome,
}) => {
  return (
    <View style={styles.root}>
      <BackgroundGradient />

      <View style={styles.content}>
        <Image
          source={require('../../assets/illustrations/mascot.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        <View style={styles.scoreChip}>
          <Text style={styles.scoreText}>{score} из 10</Text>
        </View>
        <Text style={styles.title}>Не страшно!</Text>
        <Text style={styles.subtitle}>
          Каждая попытка делает тебя умнее. Давай сыграем ещё раз — у тебя обязательно получится!
        </Text>
      </View>

      <View style={styles.buttons}>
        <PressableButton
          onPress={onHome}
          accessibilityLabel="Домой"
          style={[styles.button, styles.buttonSecondary]}
        >
          <House size={22} color="#1A1A2E" />
          <Text style={styles.buttonLabel}>Домой</Text>
        </PressableButton>

        <PressableButton
          onPress={onRetry}
          accessibilityLabel="Попробуем ещё"
          style={[styles.button, styles.buttonPrimary, { flex: 1 }]}
        >
          <RotateCcw size={22} color="#1A1A2E" />
          <Text style={[styles.buttonLabel, styles.buttonLabelBold]}>
            Попробуем ещё
          </Text>
        </PressableButton>
      </View>
    </View>
  );
};

SessionFailure.displayName = 'SessionFailure';

export { SessionFailure };
export default SessionFailure;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF8F0',
  },
  content: {
    position: 'absolute',
    top: 160,
    left: 0,
    right: 0,
    height: 560,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  mascot: {
    width: 200,
    height: 200,
  },
  scoreChip: {
    backgroundColor: '#FFFDF9',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: 'rgba(26,26,46,0.08)',
  },
  scoreText: {
    fontSize: 18,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
  },
  title: {
    fontSize: 36,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
  },
  subtitle: {
    fontSize: 18,
    color: '#1A1A2E99',
    fontFamily: getNunitoFamily('500'),
    textAlign: 'center',
    lineHeight: 25,
  },
  buttons: {
    position: 'absolute',
    bottom: 32,
    left: 21,
    right: 21,
    flexDirection: 'row',
    gap: 12,
    height: 64,
  },
  button: {
    height: 64,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  buttonSecondary: {
    width: 134,
    backgroundColor: '#FFFDF9',
    borderWidth: 2,
    borderColor: 'rgba(26,26,46,0.08)',
  },
  buttonPrimary: {
    backgroundColor: '#FFD93D',
    shadowColor: '#F5B800',
    shadowOpacity: 0.33,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  buttonLabel: {
    fontSize: 18,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('700'),
  },
  buttonLabelBold: {
    fontFamily: getNunitoFamily('800'),
  },
});
