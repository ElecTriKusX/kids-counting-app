/**
 * StickerCollectionScreen — "12 Sticker Collection — Filled" from design.pen
 *
 * Displays the child's earned stickers grouped by game mode. Each mode
 * section shows a header row with the mode title and a count badge, then
 * either a 3-column grid of sticker cards or an empty-state hint card.
 */

import React from 'react';
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '@/theme';
import HomeButton from '@/components/HomeButton';
import { useProgressStore } from '@/state/progress-store';
import { groupByMode } from '@/domain/stickers';
import type { GameMode, Sticker } from '@/types';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type RootStackParamList = {
  Home: undefined;
  StickerCollection: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'StickerCollection'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES: GameMode[] = ['arithmetic', 'compare', 'compose'];

const MODE_TITLES: Record<GameMode, string> = {
  arithmetic: 'Сложение и вычитание',
  compare: 'Кто больше?',
  compose: 'Собери число',
};

const STICKER_IMAGES: Record<GameMode, ReturnType<typeof require>> = {
  arithmetic: require('../../assets/stickers/sticker-arithmetic.png'),
  compare: require('../../assets/stickers/sticker-compare.png'),
  compose: require('../../assets/stickers/sticker-compose.png'),
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StickerItemProps {
  sticker: Sticker;
}

const StickerItem: React.FC<StickerItemProps> = ({ sticker }) => (
  <View style={styles.stickerCard}>
    <Image
      source={STICKER_IMAGES[sticker.mode]}
      style={styles.stickerImage}
      resizeMode="contain"
      accessibilityLabel={`Наклейка ${MODE_TITLES[sticker.mode]}`}
    />
  </View>
);

interface EmptyStateCardProps {
  mode: GameMode;
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({ mode }) => (
  <View
    style={styles.emptyCard}
    accessibilityLabel={`Нет наклеек для режима ${MODE_TITLES[mode]}`}
  >
    <Text style={styles.emptyText}>
      Заработай наклейку, пройдя раунд!
    </Text>
  </View>
);

interface ModeSectionProps {
  mode: GameMode;
  stickers: Sticker[];
}

const ModeSection: React.FC<ModeSectionProps> = ({ mode, stickers }) => (
  <View style={styles.section}>
    {/* Section header */}
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{MODE_TITLES[mode]}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{stickers.length}</Text>
      </View>
    </View>

    {/* Content */}
    {stickers.length === 0 ? (
      <EmptyStateCard mode={mode} />
    ) : (
      <FlatList<Sticker>
        data={stickers}
        keyExtractor={(item) => item.id}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={styles.stickerRow}
        renderItem={({ item }) => <StickerItem sticker={item} />}
        contentContainerStyle={styles.stickerGrid}
      />
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const StickerCollectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const allStickers = useProgressStore((s) => s.stickers);
  const grouped = groupByMode(allStickers);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <HomeButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Мои наклейки</Text>
        </View>

        {/* Scrollable content */}
        <FlatList<GameMode>
          data={MODES}
          keyExtractor={(mode) => mode}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: mode }) => (
            <ModeSection mode={mode} stickers={grouped[mode]} />
          )}
        />
      </SafeAreaView>
    </View>
  );
};

StickerCollectionScreen.displayName = 'StickerCollectionScreen';

export { StickerCollectionScreen };
export default StickerCollectionScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { colors, radii, spacing } = theme;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  safeArea: {
    flex: 1,
  },

  // Header row — back button + title
  header: {
    position: 'absolute',
    top: 78,
    left: spacing.md,
    width: 358,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 10,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
  },

  // Scrollable content starts below the header
  content: {
    paddingTop: 160,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },

  // Per-mode section
  section: {
    gap: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },

  countBadge: {
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  // Empty state card — dashed border
  emptyCard: {
    width: '100%',
    height: 80,
    borderRadius: radii.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${colors.text}33`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: `${colors.text}66`,
    textAlign: 'center',
  },

  // Sticker grid
  stickerGrid: {
    gap: 12,
  },

  stickerRow: {
    gap: 12,
  },

  // Individual sticker card — 104×104
  stickerCard: {
    width: 104,
    height: 104,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  stickerImage: {
    width: 80,
    height: 80,
  },
});
