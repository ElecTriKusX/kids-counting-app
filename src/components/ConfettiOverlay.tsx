/**
 * ConfettiOverlay — Lottie-конфетти на полный экран.
 *
 * Используется ТОЛЬКО в Session_Reward. Для feedback на правильный
 * ответ в играх — компонент `YellowBurst` (вызывается локально).
 *
 * Контракт:
 *  - `visible` — управляет показом.
 *  - `speed` — по умолчанию 0.5 (в 2 раза медленнее, чтобы анимация
 *    не казалась обрезанной).
 *  - При ошибке Lottie — silent fallback (ничего не рендерим, чтобы
 *    не мешать reward-звезде).
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

const CONFETTI_SOURCE = require('../../assets/lottie/confetti.lottie') as unknown as
  | string
  | { uri: string };

export interface ConfettiOverlayProps {
  visible: boolean;
  /** Скорость воспроизведения; 1 = норма, 0.5 = в 2 раза медленнее. */
  speed?: number;
}

const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({
  visible,
  speed = 0.5,
}) => {
  const [failed, setFailed] = useState(false);

  if (!visible || failed) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <LottieView
        source={CONFETTI_SOURCE}
        autoPlay
        loop={false}
        speed={speed}
        resizeMode="cover"
        onAnimationFailure={() => setFailed(true)}
        style={styles.lottie}
      />
    </View>
  );
};

ConfettiOverlay.displayName = 'ConfettiOverlay';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});

export { ConfettiOverlay };
export default ConfettiOverlay;
