import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import theme from '../theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/illustrations/mascot.png')}
        style={styles.mascot}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 240,
    height: 240,
  },
});
