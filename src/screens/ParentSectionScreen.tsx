/**
 * ParentSectionScreen — "15 Parent Section" from design.pen
 *
 * Shows per-mode progress stats (rounds, accuracy, level) and lets the
 * parent manually pin a difficulty level via a segmented control. A
 * reset button at the bottom clears all progress after confirmation.
 *
 * Scrollable — taller than 844px to accommodate three mode cards.
 */

import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Trash2 } from 'lucide-react-native';

import theme from '@/theme';
import HomeButton from '@/components/HomeButton';
import PressableButton from '@/components/PressableButton';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useProgressStore, effectiveLevel } from '@/state/progress-store';
import { getNunitoFamily } from '@/hooks/useAppFonts';
import type { DifficultyLevel, GameMode } from '@/types';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type RootStackParamList = {
  Home: undefined;
  ParentSection: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ParentSection'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES: GameMode[] = ['arithmetic', 'compare', 'compose'];

const MODE_TITLES: Record<GameMode, string> = {
  arithmetic: 'Сложение и вычитание',
  compare: 'Кто больше?',
  compose: 'Собери число',
};

const MODE_ICONS: Record<GameMode, ReturnType<typeof require>> = {
  arithmetic: require('../../assets/icons/icon-arithmetic.png'),
  compare: require('../../assets/icons/icon-compare.png'),
  compose: require('../../assets/icons/icon-compose.png'),
};

const DIFFICULTY_SEGMENTS: { level: DifficultyLevel; label: string }[] = [
  { level: 1, label: '1–5' },
  { level: 2, label: '1–10' },
  { level: 3, label: '1–15' },
  { level: 4, label: '1–20' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MetricProps {
  label: string;
  value: string;
  valueColor?: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, valueColor }) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, valueColor ? { color: valueColor } : undefined]}>
      {value}
    </Text>
  </View>
);

interface SegmentedControlProps {
  activeLevel: DifficultyLevel;
  onSelect: (level: DifficultyLevel) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  activeLevel,
  onSelect,
}) => (
  <View style={styles.segmentedControl}>
    {DIFFICULTY_SEGMENTS.map(({ level, label }) => {
      const isActive = level === activeLevel;
      return (
        <TouchableOpacity
          key={level}
          onPress={() => onSelect(level)}
          style={[styles.segment, isActive && styles.segmentActive]}
          accessibilityRole="button"
          accessibilityLabel={`Уровень ${label}`}
          accessibilityState={{ selected: isActive }}
        >
          <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

interface ModeCardProps {
  mode: GameMode;
}

const ModeCard: React.FC<ModeCardProps> = ({ mode }) => {
  const stats = useProgressStore((s) => s.stats[mode]);
  const state = useProgressStore((s) => s);
  const setManualDifficulty = useProgressStore((s) => s.setManualDifficulty);

  const active = effectiveLevel(state, mode);

  const accuracyPct =
    stats.totalAnswered > 0
      ? `${Math.round(stats.accuracy * 100)}%`
      : '—';

  return (
    <View style={styles.modeCard}>
      {/* Card header: icon + title */}
      <View style={styles.modeCardHeader}>
        <Image
          source={MODE_ICONS[mode]}
          style={styles.modeIcon}
          resizeMode="contain"
          accessibilityLabel={MODE_TITLES[mode]}
        />
        <Text style={styles.modeTitle}>{MODE_TITLES[mode]}</Text>
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        <Metric label="Раундов" value={String(stats.roundsCompleted)} />
        <Metric
          label="Точность"
          value={accuracyPct}
          valueColor={theme.colors.success}
        />
        <Metric label="Уровень" value={String(active)} />
      </View>

      {/* Segmented difficulty control */}
      <SegmentedControl
        activeLevel={active}
        onSelect={(level) => setManualDifficulty(mode, level)}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ParentSectionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const resetAll = useProgressStore((s) => s.resetAll);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleReset = (): void => {
    setConfirmOpen(true);
  };

  const handleConfirmReset = (): void => {
    setConfirmOpen(false);
    resetAll();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <HomeButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Прогресс</Text>
        </View>

        {/* Scrollable content */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {MODES.map((mode) => (
            <ModeCard key={mode} mode={mode} />
          ))}

          {/* Reset button */}
          <PressableButton
            onPress={handleReset}
            accessibilityLabel="Сбросить прогресс"
            accessibilityRole="button"
            style={styles.resetButton}
          >
            <Trash2 size={20} color="#FF6B6B" strokeWidth={2.5} />
            <Text style={styles.resetLabel}>Сбросить прогресс</Text>
          </PressableButton>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={confirmOpen}
        title="Сбросить прогресс?"
        message="Все наклейки и статистика будут удалены."
        confirmLabel="Сбросить"
        cancelLabel="Отмена"
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmOpen(false)}
      />
    </View>
  );
};

ParentSectionScreen.displayName = 'ParentSectionScreen';

export { ParentSectionScreen };
export default ParentSectionScreen;

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

  // Scrollable content
  content: {
    paddingTop: 160,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: 20,
  },

  // Mode card
  modeCard: {
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: 20,
    gap: spacing.md,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  modeIcon: {
    width: 48,
    height: 48,
  },

  modeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },

  // Metrics row
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  metric: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },

  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: `${colors.text}99`,
    textAlign: 'center',
  },

  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },

  // Segmented control
  segmentedControl: {
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: `${colors.text}14`,
    flexDirection: 'row',
    padding: 4,
    gap: 2,
  },

  segment: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  segmentActive: {
    backgroundColor: colors.primary,
  },

  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: `${colors.text}99`,
  },

  segmentLabelActive: {
    fontWeight: '800',
    color: colors.text,
  },

  // Reset button — outlined danger style
  resetButton: {
    height: 64,
    borderRadius: 20,
    backgroundColor: `${colors.danger}1A`,
    borderWidth: 2,
    borderColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  resetLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
  },
});
