/**
 * HomeScreen — главный экран.
 *
 * 1:1 с Pencil-фреймом `AkbLi` (02 Home).
 *
 * Изменения по запросу:
 *  - Кнопка «Мои наклейки»: lucide Star 28×28 цвет primary-yellow-deep.
 *  - Parent-кнопка: lucide Lock 22×22 (вместо image), прозрачнее.
 *  - Шрифт через getNunitoFamily.
 */

import React, { useCallback } from 'react';
import {
  Image,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Lock, Star } from 'lucide-react-native';

import { BackgroundGradient } from '../components/BackgroundGradient';
import PressableButton from '../components/PressableButton';
import { getNunitoFamily } from '../hooks/useAppFonts';

type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
  Compare: undefined;
  Compose: undefined;
  StickerCollection: undefined;
  ParentLock: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface ModeCardProps {
  title: string;
  subtitle: string;
  fill: string;
  icon: ImageSourcePropType;
  onPress: () => void;
  accessibilityLabel: string;
}

const ModeCard: React.FC<ModeCardProps> = ({
  title,
  subtitle,
  fill,
  icon,
  onPress,
  accessibilityLabel,
}) => (
  <PressableButton
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    style={[styles.modeCard, { backgroundColor: fill }]}
  >
    <View style={styles.iconBox}>
      <Image source={icon} style={styles.iconImage} resizeMode="contain" />
    </View>
    <View style={styles.modeTextColumn}>
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={styles.modeSubtitle}>{subtitle}</Text>
    </View>
  </PressableButton>
);

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const goArithmetic = useCallback(() => navigation.navigate('Arithmetic'), [navigation]);
  const goCompare = useCallback(() => navigation.navigate('Compare'), [navigation]);
  const goCompose = useCallback(() => navigation.navigate('Compose'), [navigation]);
  const goStickers = useCallback(() => navigation.navigate('StickerCollection'), [navigation]);
  const goParent = useCallback(() => navigation.navigate('ParentLock'), [navigation]);

  return (
    <View style={styles.root}>
      <BackgroundGradient />

      <View style={styles.statusBarSpacer} />

      {/* Parent lock — маленькая кнопка в углу, lucide Lock 22×22, прозрачнее */}
      <View style={styles.parentButtonWrapper}>
        <PressableButton
          onPress={goParent}
          accessibilityLabel="Родительский раздел"
          style={styles.parentButton}
          hitSlop={8}
        >
          <Lock size={22} color="#1A1A2E99" strokeWidth={2.5} />
        </PressableButton>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingPrimary}>Привет!</Text>
          <Text style={styles.greetingSecondary}>Чем займёмся?</Text>
        </View>

        <ModeCard
          title="Сложение и вычитание"
          subtitle="Решай примеры"
          fill="#FFD93D"
          icon={require('../../assets/icons/icon-arithmetic.png')}
          onPress={goArithmetic}
          accessibilityLabel="Сложение и вычитание"
        />

        <ModeCard
          title="Кто больше?"
          subtitle="Сравнивай числа"
          fill="#FFCE4D"
          icon={require('../../assets/icons/icon-compare.png')}
          onPress={goCompare}
          accessibilityLabel="Кто больше"
        />

        <ModeCard
          title="Собери число"
          subtitle="Сложи из плиток"
          fill="#FFBA59"
          icon={require('../../assets/icons/icon-compose.png')}
          onPress={goCompose}
          accessibilityLabel="Собери число"
        />

        {/* Stickers — lucide Star 28×28 в primary-yellow-deep */}
        <PressableButton
          onPress={goStickers}
          accessibilityLabel="Мои наклейки"
          style={styles.stickersButton}
        >
          <Star
            size={28}
            color="#F5B800"
            fill="#F5B800"
            strokeWidth={1.5}
          />
          <Text style={styles.stickersLabel}>Мои наклейки</Text>
        </PressableButton>
      </ScrollView>
    </View>
  );
};

HomeScreen.displayName = 'HomeScreen';

export { HomeScreen };
export default HomeScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },

  statusBarSpacer: { height: 62 },

  parentButtonWrapper: {
    position: 'absolute',
    top: 78,
    right: 16,
    zIndex: 10,
  },
  parentButton: {
    width: 44,
    height: 44,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 24,
  },

  greetingBlock: {
    gap: 4,
  },
  greetingPrimary: {
    fontSize: 36,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
    lineHeight: 44,
  },
  greetingSecondary: {
    fontSize: 22,
    color: '#1A1A2E99',
    fontFamily: getNunitoFamily('500'),
    lineHeight: 28,
  },

  modeCard: {
    width: '100%',
    height: 140,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
    shadowColor: '#F5B800',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 72,
    height: 72,
  },
  modeTextColumn: {
    flex: 1,
    gap: 6,
  },
  modeTitle: {
    fontSize: 22,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
    lineHeight: 28,
  },
  modeSubtitle: {
    fontSize: 16,
    color: '#1A1A2E99',
    fontFamily: getNunitoFamily('500'),
    lineHeight: 22,
  },

  stickersButton: {
    width: '100%',
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FFFDF9',
    borderWidth: 2,
    borderColor: '#FFD93D',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stickersLabel: {
    fontSize: 20,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('700'),
  },
});
