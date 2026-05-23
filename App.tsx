import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import BootstrapGate from './src/app/BootstrapGate';
import RootNavigator from './src/app/RootNavigator';
import { attachPersistence } from './src/state/persistence';
import { IdleMascot } from './src/components/IdleMascot';
import { useIdleSignal } from './src/hooks/useIdleSignal';

export default function App() {
  const { idleSignal, ping } = useIdleSignal();

  useEffect(() => {
    const detach = attachPersistence();
    return detach;
  }, []);

  // Слушатель тапа через capture-фазу: НЕ поглощает события,
  // но видит каждый touchStart до того, как ребёнок его обработает.
  // Это надёжнее, чем Pressable-обёртка (родительский Pressable
  // не получает onPress, если ребёнок-Pressable его поглощает).
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <View
          style={styles.flex}
          onStartShouldSetResponderCapture={() => {
            ping();
            return false; // не перехватываем — пускаем событие дальше
          }}
        >
          <NavigationContainer>
            <BootstrapGate>
              <RootNavigator />
            </BootstrapGate>
          </NavigationContainer>
          <IdleMascot idleSignal={idleSignal} />
        </View>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
