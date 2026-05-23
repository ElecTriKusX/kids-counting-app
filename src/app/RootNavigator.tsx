import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ArithmeticScreen from '../screens/ArithmeticScreen';
import CompareScreen from '../screens/CompareScreen';
import ComposeScreen from '../screens/ComposeScreen';
import StickerCollectionScreen from '../screens/StickerCollectionScreen';
import ParentLockScreen from '../screens/ParentLockScreen';
import ParentSectionScreen from '../screens/ParentSectionScreen';

export type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
  Compare: undefined;
  Compose: undefined;
  StickerCollection: undefined;
  ParentLock: undefined;
  ParentSection: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Arithmetic" component={ArithmeticScreen} />
      <Stack.Screen name="Compare" component={CompareScreen} />
      <Stack.Screen name="Compose" component={ComposeScreen} />
      <Stack.Screen name="StickerCollection" component={StickerCollectionScreen} />
      <Stack.Screen name="ParentLock" component={ParentLockScreen} />
      <Stack.Screen name="ParentSection" component={ParentSectionScreen} />
    </Stack.Navigator>
  );
}
