/**
 * RewardOverlay — экран награды после успешного раунда.
 *
 * 1:1 с Pencil-фреймом `U4IIy8` (16 Session Reward Overlay):
 *  - BackgroundGradient как фон.
 *  - В центре (y≈170) — анимированный «солнечный» круг:
 *      • радиальный жёлтый ореол 240×240 (Pencil node `ZA4vs`)
 *      • жёлтый круг 160×160 (Pencil node `pVCEm`)
 *      • icon-stickers.png 200×200 в центре (Pencil node `ijtrF`)
 *  - Заголовок «Молодец!» 44/800
 *  - Чип «Раунд завершён • Получена наклейка»
 *  - Внизу две кнопки: «Домой» и «Ещё раунд»
 *  - Lottie конфетти оверлеем (через ConfettiOverlay), speed=0.5
 *
 * Анимация звезды:
 *  - Появление: ореол fade-in, круг scale 0→1.05→1, иконка с
 *    bounce-эффектом (scale 0→1.15→1).
 *  - Длительность ~1000ms, easing spring.
 */

import React, { useCallback, useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from './BackgroundGradient';
import ConfettiOverlay from './ConfettiOverlay';
import PressableButton from './PressableButton';
import { soundAdapter } from '../audio/sound-adapter';
import { getNunitoFamily } from '../hooks/useAppFonts';
import { House, ArrowRight } from 'lucide-react-native';

const ANIMATION_TOTAL_MS = 2200;

type RootStackParamList = {
  Home: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export interface RewardOverlayProps {
  visible: boolean;
  /** Колбэк при нажатии «Ещё раунд». Опциональный. */
  onAnotherRound?: () => void;
  /** Колбэк после полного завершения анимации. */
  onComplete?: () => void;
}

const RewardOverlay: React.FC<RewardOverlayProps> = ({
  visible,
  onAnotherRound,
  onComplete,
}) => {
  const navigation = useNavigation<NavProp>();

  // Shared values для анимаций звезды
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.6);
  const circleScale = useSharedValue(0);
  const starScale = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      haloOpacity.value = 0;
      haloScale.value = 0.6;
      circleScale.value = 0;
      starScale.value = 0;
      return;
    }

    // Запускаем sound сразу
    void soundAdapter.play('session_reward');

    // Halo: fade-in + scale 0.6 → 1.0
    haloOpacity.value = withTiming(1, { duration: 600 });
    haloScale.value = withSpring(1, { damping: 10, stiffness: 80 });

    // Желтый круг: scale 0 → 1.05 → 1
    circleScale.value = withSequence(
      withTiming(1.05, { duration: 500, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1, { duration: 200 }),
    );

    // Звезда: с задержкой 200мс, scale 0 → 1.15 → 1 (bounce)
    starScale.value = withDelay(
      200,
      withSequence(
        withTiming(1.15, { duration: 500, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 250 }),
      ),
    );

    const handle = setTimeout(() => {
      onComplete?.();
    }, ANIMATION_TOTAL_MS);
    return () => clearTimeout(handle);
  }, [visible, haloOpacity, haloScale, circleScale, starScale, onComplete]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));
  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const handleHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const handleAnotherRound = useCallback(() => {
    if (onAnotherRound) {
      onAnotherRound();
    } else {
      navigation.navigate('Home');
    }
  }, [onAnotherRound, navigation]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <BackgroundGradient />

      {/* Конфетти Lottie (замедленное) */}
      <ConfettiOverlay visible={visible} speed={0.5} />

      {/* Центральная композиция: halo + круг + звезда */}
      <View style={styles.center}>
        <View style={styles.starWrapper}>
          {/* Halo (radial gradient approximated as soft yellow circle) */}
          <Animated.View style={[styles.halo, haloStyle]} />
          {/* Yellow circle 160×160 with shadow */}
          <Animated.View style={[styles.circle, circleStyle]}>
            {/* Star illustration 200×200 (icon-stickers.png) */}
            <Animated.View style={starStyle}>
              <Image
                source={require('../../assets/icons/icon-stickers.png')}
                style={styles.star}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>
        </View>

        <Text style={styles.title}>Молодец!</Text>
        <View style={styles.subtitleChip}>
          <Text style={styles.subtitleText}>Раунд завершён • Получена наклейка</Text>
        </View>
      </View>

      {/* Кнопки */}
      <View style={styles.buttonsRow}>
        <PressableButton
          onPress={handleHome}
          accessibilityLabel="Домой"
          style={[styles.button, styles.buttonSecondary]}
        >
          <House size={22} color="#1A1A2E" />
          <Text style={styles.buttonLabelDark}>Домой</Text>
        </PressableButton>

        <PressableButton
          onPress={handleAnotherRound}
          accessibilityLabel="Ещё раунд"
          style={[styles.button, styles.buttonPrimary]}
        >
          <Text style={styles.buttonLabelDark}>Ещё раунд</Text>
          <ArrowRight size={22} color="#1A1A2E" />
        </PressableButton>
      </View>
    </View>
  );
};

RewardOverlay.displayName = 'RewardOverlay';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF8F0',
  },
  center: {
    position: 'absolute',
    top: 170,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  starWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFD93D',
    opacity: 0.45,
    // Размытие через тень (приближение radial gradient)
    shadowColor: '#FFD93D',
    shadowOpacity: 0.6,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  circle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFD93D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5B800',
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  star: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 44,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
  },
  subtitleChip: {
    backgroundColor: '#FFFDF9',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  subtitleText: {
    fontSize: 15,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('600'),
  },
  buttonsRow: {
    position: 'absolute',
    bottom: 32,
    left: 21,
    right: 21,
    height: 80,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 160,
    height: 64,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 64,
  },
  buttonSecondary: {
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
  buttonLabelDark: {
    fontSize: 18,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('700'),
  },
});

export { RewardOverlay };
export default RewardOverlay;
