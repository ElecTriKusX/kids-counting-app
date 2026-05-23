import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import BootstrapGate from './src/app/BootstrapGate';
import RootNavigator from './src/app/RootNavigator';
import { attachPersistence } from './src/state/persistence';

export default function App() {
  useEffect(() => {
    const detach = attachPersistence();
    return detach;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <BootstrapGate>
            <RootNavigator />
          </BootstrapGate>
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
