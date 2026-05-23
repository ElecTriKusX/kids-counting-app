/**
 * RootNavigator — Stack-навигация всего приложения.
 *
 * Переходы:
 *  - Дефолтный transition `slide_from_right` (мягкий горизонтальный).
 *  - На переходы в игры (Arithmetic, Compare, Compose) — `fade_from_bottom`,
 *    создаёт ощущение «вход в новый мир» для ребёнка.
 *  - Длительность slide ~350ms (мягко для детей).
 */

import React from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';

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

const defaultScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 350,
};

const gameScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade_from_bottom',
  animationDuration: 450,
};

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Arithmetic"
        component={ArithmeticScreen}
        options={gameScreenOptions}
      />
      <Stack.Screen
        name="Compare"
        component={CompareScreen}
        options={gameScreenOptions}
      />
      <Stack.Screen
        name="Compose"
        component={ComposeScreen}
        options={gameScreenOptions}
      />
      <Stack.Screen
        name="StickerCollection"
        component={StickerCollectionScreen}
      />
      <Stack.Screen name="ParentLock" component={ParentLockScreen} />
      <Stack.Screen name="ParentSection" component={ParentSectionScreen} />
    </Stack.Navigator>
  );
}
