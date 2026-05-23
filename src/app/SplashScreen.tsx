/**
 * SplashScreen — экран загрузки, показывается минимум 5 секунд.
 *
 * 1:1 с Pencil-фреймом `nwrVM` (01 Splash):
 *  - BackgroundGradient (sunburst)
 *  - Маскот по центру (240×240)
 *  - Заголовок "Считай-ка" 48pt/800
 *  - Подпись "Учимся считать вместе" 18pt/500 #1A1A2E99
 *
 * Минимальная длительность контролируется в BootstrapGate через
 * Promise.all([loadSnapshot(), preload(), delay(5000)]).
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { BackgroundGradient } from '../components/BackgroundGradient';
import { getNunitoFamily } from '../hooks/useAppFonts';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <BackgroundGradient />
      <View style={styles.content}>
        <Image
          source={require('../../assets/illustrations/mascot.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        <View style={styles.titleBox}>
          <Text style={styles.title}>Посчитай-ка!</Text>
          <Text style={styles.subtitle}>Учимся считать вместе</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  mascot: {
    width: 240,
    height: 240,
  },
  titleBox: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 48,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
  },
  subtitle: {
    fontSize: 18,
    color: '#1A1A2E99',
    fontFamily: getNunitoFamily('500'),
  },
});
