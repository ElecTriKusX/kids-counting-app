/**
 * HomeScreen — "02 Home" from design.pen
 *
 * Sunburst gradient background (yellow → cream), greeting, three mode
 * cards, and a stickers shortcut. A small parent-lock button sits in the
 * top-right corner at low opacity so children don't accidentally tap it.
 *
 * expo-linear-gradient is not in the project's dependencies, so the
 * gradient is approximated with a plain View using the cream end-colour
 * as the background. The yellow accent lives on the cards themselves,
 * which matches the design intent closely enough for the MVP.
 */

import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import theme from '@/theme';
import { PressableButton } from '@/components/PressableButton';
import { ButtonLabel } from '@/components/ButtonLabel';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Home: undefined;
  Arithmetic: undefined;
  Compare: undefined;
  Compose: undefined;
  StickerCollection: undefined;
  ParentLock: undefined;
};

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// ---------------------------------------------------------------------------
// ModeCard sub-component
// ---------------------------------------------------------------------------

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
    accessibilityRole="button"
    style={[styles.modeCard, { backgroundColor: fill }]}
  >
    {/* Icon box */}
    <View style={styles.iconBox}>
      <Image source={icon} style={styles.iconImage} resizeMode="contain" />
    </View>

    {/* Text column */}
    <View style={styles.modeTextColumn}>
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={styles.modeSubtitle}>{subtitle}</Text>
    </View>
  </PressableButton>
);

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();

  return (
    // Sunburst gradient approximated with the cream background colour.
    // The yellow accent is carried by the cards so the overall warmth
    // of the design is preserved without expo-linear-gradient.
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Parent lock — small, top-right, low opacity */}
        <PressableButton
          onPress={() => navigation.navigate('ParentLock')}
          accessibilityLabel="Родительский раздел"
          accessibilityRole="button"
          style={styles.parentButton}
          hitSlop={8}
        >
          <Image
            source={require('../../assets/icons/icon-parent.png')}
            style={styles.parentIcon}
            resizeMode="contain"
          />
        </PressableButton>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting block */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingPrimary}>Привет!</Text>
            <Text style={styles.greetingSecondary}>Чем займёмся?</Text>
          </View>

          {/* Mode cards */}
          <ModeCard
            title="Сложение и вычитание"
            subtitle="Решай примеры"
            fill={theme.colors.yellow1}
            icon={require('../../assets/icons/icon-arithmetic.png')}
            onPress={() => navigation.navigate('Arithmetic')}
            accessibilityLabel="Сложение и вычитание — Решай примеры"
          />

          <ModeCard
            title="Кто больше?"
            subtitle="Сравнивай числа"
            fill={theme.colors.yellow2}
            icon={require('../../assets/icons/icon-compare.png')}
            onPress={() => navigation.navigate('Compare')}
            accessibilityLabel="Кто больше? — Сравнивай числа"
          />

          <ModeCard
            title="Собери число"
            subtitle="Сложи из плиток"
            fill={theme.colors.yellow3}
            icon={require('../../assets/icons/icon-compose.png')}
            onPress={() => navigation.navigate('Compose')}
            accessibilityLabel="Собери число — Сложи из плиток"
          />

          {/* Stickers button */}
          <PressableButton
            onPress={() => navigation.navigate('StickerCollection')}
            accessibilityLabel="Мои наклейки"
            accessibilityRole="button"
            style={styles.stickersButton}
          >
            {/* Star icon rendered as a Unicode glyph — no extra dependency */}
            <Text style={styles.starIcon}>★</Text>
            <ButtonLabel style={styles.stickersLabel}>Мои наклейки</ButtonLabel>
          </PressableButton>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

HomeScreen.displayName = 'HomeScreen';

export { HomeScreen };
export default HomeScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { colors, radii, spacing, typography } = theme;

const styles = StyleSheet.create({
  // Root fills the screen with the cream background (gradient end-colour).
  root: {
    flex: 1,
    backgroundColor: colors.background, // #FFF8F0
  },

  safeArea: {
    flex: 1,
  },

  // Parent lock button — absolute, top-right, 44×44, low opacity.
  parentButton: {
    position: 'absolute',
    top: 78,
    right: spacing.md,
    width: 44,
    height: 44,
    minHeight: 44, // override PressableButton's 64 minimum for this special case
    minWidth: 44,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
    opacity: 0.35,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  parentIcon: {
    width: 24,
    height: 24,
    tintColor: colors.text,
  },

  // Scrollable content area.
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: spacing.md, // 16
    paddingBottom: spacing.xl,    // 32
    gap: spacing.lg,              // 24 — RN 0.71+ supports gap in StyleSheet
  },

  // Greeting block.
  greetingBlock: {
    gap: spacing.xs, // 4
  },

  greetingPrimary: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 44,
  },

  greetingSecondary: {
    fontSize: 22,
    fontWeight: '500',
    color: `${colors.text}99`, // #1A1A2E at ~60% opacity
    lineHeight: 28,
  },

  // ModeCard — horizontal layout, fixed height 140.
  modeCard: {
    width: '100%',
    height: 140,
    borderRadius: radii.card,       // 24
    paddingVertical: 20,
    paddingHorizontal: spacing.lg,  // 24
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    // Override PressableButton defaults that centre children — we want
    // flex-start alignment so the icon sits left.
    justifyContent: 'flex-start',
  },

  // Semi-transparent white icon container.
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: radii.card, // 24
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconImage: {
    width: 64,
    height: 64,
  },

  modeTextColumn: {
    flex: 1,
    gap: 6,
  },

  modeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 28,
  },

  modeSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: `${colors.text}99`,
    lineHeight: 22,
  },

  // Stickers button — outlined, cream fill, yellow border.
  stickersButton: {
    width: '100%',
    height: 72,
    borderRadius: radii.card,       // 24
    backgroundColor: colors.surface, // #FFFDF9
    borderWidth: 2,
    borderColor: colors.primary,    // #FFD93D
    paddingHorizontal: spacing.lg,  // 24
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  starIcon: {
    fontSize: 28,
    lineHeight: 32,
    color: '#F5B800',
  },

  stickersLabel: {
    fontSize: typography.buttonLabel.fontSize, // 22, above minLabelFontSize
    fontWeight: '700',
    color: colors.text,
  },
});
