/**
 * HomeButton — круглая кнопка возврата 56×56 с icon-home.png.
 *
 * Per Pencil-design: вместо стрелки/иконки lucide используется
 * прямое изображение `assets/icons/icon-home.png` 56×56.
 * Соответствует HomeButton-инстансу внутри игровых экранов в
 * design.pen (image fill, 56×56).
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import PressableButton from './PressableButton';

export interface HomeButtonProps {
  onPress?: () => void;
  accessibilityLabel?: string;
}

const BUTTON_SIZE = 56;

const HomeButton: React.FC<HomeButtonProps> = ({
  onPress,
  accessibilityLabel = 'На главный экран',
}) => {
  return (
    <PressableButton
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={styles.button}
    >
      <View style={styles.iconBox}>
        <Image
          source={require('../../assets/icons/icon-home.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
    </PressableButton>
  );
};

HomeButton.displayName = 'HomeButton';

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    minHeight: BUTTON_SIZE,
    minWidth: BUTTON_SIZE,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    padding: 0,
  },
  iconBox: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
});

export { HomeButton };
export default HomeButton;
