import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        {/* Pressable обёртка ловит любой тап — пингует idle-сигнал.
            pointerEvents="box-none" чтобы внутренние элементы получали
            события первыми, а здесь только сбрасываем idle. */}
        <Pressable style={styles.flex} onPressIn={ping} onPress={ping}>
          <View style={styles.flex}>
            <NavigationContainer>
              <BootstrapGate>
                <RootNavigator />
              </BootstrapGate>
            </NavigationContainer>
            <IdleMascot idleSignal={idleSignal} />
          </View>
        </Pressable>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
