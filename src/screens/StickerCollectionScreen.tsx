/**
 * StickerCollectionScreen — экран наклеек.
 *
 * Два состояния:
 *  - Filled (когда есть хотя бы одна наклейка): группировка по режимам,
 *    сетка 3 колонки. (Pencil: фрейм LZvyA — «12 Sticker Collection — Filled»)
 *  - Empty (когда наклеек нет): маскот 200×200, заголовок «Пока пусто»,
 *    подпись и кнопка «Выбрать игру». (Pencil: фрейм Xc6NU)
 *
 * Шрифт Nunito везде через getNunitoFamily.
 */

import React from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import HomeButton from '../components/HomeButton';
import { BackgroundGradient } from '../components/BackgroundGradient';
import PressableButton from '../components/PressableButton';
import { useProgressStore } from '../state/progress-store';
import { groupByMode } from '../domain/stickers';
import { getNunitoFamily } from '../hooks/useAppFonts';
import type { GameMode, Sticker } from '../types';

type RootStackParamList = {
  Home: undefined;
  StickerCollection: undefined;
};
type NavProp = NativeStackNavigationProp<RootStackParamList, 'StickerCollection'>;

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

const StickerCollectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const allStickers = useProgressStore((s) => s.stickers);
  const grouped = groupByMode(allStickers);
  const totalCount = allStickers.length;

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <HomeButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Мои наклейки</Text>
        </View>

        {totalCount === 0 ? (
          <View style={styles.emptyContent}>
            <Image
              source={require('../../assets/illustrations/mascot.png')}
              style={styles.emptyMascot}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Пока пусто</Text>
            <Text style={styles.emptySubtitle}>
              Сыграй раунд из 10 вопросов, чтобы получить первую наклейку!
            </Text>
            <PressableButton
              onPress={() => navigation.navigate('Home')}
              accessibilityLabel="Выбрать игру"
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>Выбрать игру</Text>
            </PressableButton>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {MODES.map((mode) => (
              <ModeSection
                key={mode}
                mode={mode}
                stickers={grouped[mode]}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

interface ModeSectionProps {
  mode: GameMode;
  stickers: Sticker[];
}

const ModeSection: React.FC<ModeSectionProps> = ({ mode, stickers }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{MODE_TITLES[mode]}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{stickers.length}</Text>
      </View>
    </View>
    {stickers.length === 0 ? (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyCardText}>
          Сыграй раунд, чтобы получить первую наклейку!
        </Text>
      </View>
    ) : (
      <FlatList<Sticker>
        data={stickers}
        keyExtractor={(item) => item.id}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={styles.stickerRow}
        renderItem={({ item }) => (
          <View style={styles.stickerCard}>
            <Image
              source={STICKER_IMAGES[item.mode]}
              style={styles.stickerImage}
              resizeMode="contain"
            />
          </View>
        )}
        contentContainerStyle={styles.stickerGrid}
      />
    )}
  </View>
);

StickerCollectionScreen.displayName = 'StickerCollectionScreen';

export { StickerCollectionScreen };
export default StickerCollectionScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  safeArea: { flex: 1 },

  header: {
    position: 'absolute',
    top: 78,
    left: 16,
    width: 358,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
    lineHeight: 34,
  },

  // Empty state
  emptyContent: {
    flex: 1,
    paddingTop: 160,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  emptyMascot: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    fontSize: 28,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
  },
  emptySubtitle: {
    fontSize: 18,
    color: '#1A1A2E99',
    fontFamily: getNunitoFamily('500'),
    textAlign: 'center',
    lineHeight: 25,
  },
  emptyButton: {
    backgroundColor: '#FFD93D',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 32,
    minHeight: 64,
    shadowColor: '#F5B800',
    shadowOpacity: 0.33,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  emptyButtonText: {
    fontSize: 20,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
  },

  // Filled state
  content: {
    paddingTop: 160,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 24,
  },
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
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('700'),
    flex: 1,
    marginRight: 8,
  },
  countBadge: {
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFD93D',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 15,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('700'),
  },
  emptyCard: {
    width: '100%',
    height: 80,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(26,26,46,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyCardText: {
    fontSize: 15,
    color: 'rgba(26,26,46,0.4)',
    fontFamily: getNunitoFamily('500'),
    textAlign: 'center',
  },
  stickerGrid: { gap: 12 },
  stickerRow: { gap: 12 },
  stickerCard: {
    width: 104,
    height: 104,
    borderRadius: 24,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'visible',
  },
  stickerImage: {
    width: 80,
    height: 80,
    overflow: 'visible',
  },
});
