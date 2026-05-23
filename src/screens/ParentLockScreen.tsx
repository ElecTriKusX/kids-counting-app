/**
 * ParentLockScreen — "14 Parent Lock" from design.pen
 *
 * Gates access to the Parent_Section behind a two-digit arithmetic
 * challenge (multiplication or subtraction) that is beyond a 4–6 year
 * old's ability. The parent must enter the correct answer to proceed.
 *
 * On a wrong answer the hook auto-generates a fresh challenge so the
 * child cannot guess by trial and error.
 */

import React, { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme from '@/theme';
import HomeButton from '@/components/HomeButton';
import PressableButton from '@/components/PressableButton';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useParentLock } from '@/features/parent/useParentLock';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type RootStackParamList = {
  Home: undefined;
  ParentLock: undefined;
  ParentSection: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ParentLock'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function opSymbol(op: 'mul' | 'sub'): string {
  return op === 'mul' ? '×' : '−';
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ParentLockScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { challenge, submit } = useParentLock();
  const [input, setInput] = useState('');

  const handleSubmit = (): void => {
    const parsed = parseInt(input, 10);
    if (isNaN(parsed)) {
      setInput('');
      return;
    }
    const correct = submit(parsed);
    if (correct) {
      navigation.replace('ParentSection');
    } else {
      // Wrong answer — hook has already regenerated the challenge
      setInput('');
    }
  };

  const challengeText =
    challenge !== null
      ? `${challenge.a} ${opSymbol(challenge.op)} ${challenge.b}`
      : '…';

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header — back button only */}
        <View style={styles.header}>
          <HomeButton onPress={() => navigation.goBack()} />
        </View>

        {/* Centered content */}
        <View style={styles.content}>
          {/* Subtitle */}
          <Text style={styles.subtitle}>Только для взрослых</Text>

          {/* Lock icon circle */}
          <View
            style={styles.lockCircle}
            accessibilityLabel="Замок"
            accessibilityRole="image"
          >
            {/* Unicode lock glyph — no icon library dependency */}
            <Text style={styles.lockGlyph}>🔒</Text>
          </View>

          {/* Prompt */}
          <Text style={styles.prompt}>Сколько будет?</Text>

          {/* Challenge expression */}
          <Text
            style={styles.challengeText}
            accessibilityLabel={`Задача: ${challengeText}`}
          >
            {challengeText}
          </Text>

          {/* Numeric input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              placeholder="?"
              placeholderTextColor={`${theme.colors.text}33`}
              accessibilityLabel="Введите ответ"
              maxLength={6}
            />
          </View>

          {/* Submit button */}
          <PressableButton
            onPress={handleSubmit}
            accessibilityLabel="Готово"
            accessibilityRole="button"
            style={styles.submitButton}
          >
            <Text style={styles.submitLabel}>Готово</Text>
          </PressableButton>
        </View>
      </SafeAreaView>
    </View>
  );
};

ParentLockScreen.displayName = 'ParentLockScreen';

export { ParentLockScreen };
export default ParentLockScreen;

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

  // Header — back button only, no title
  header: {
    position: 'absolute',
    top: 78,
    left: spacing.md,
    zIndex: 10,
  },

  // Vertically centered content column
  content: {
    flex: 1,
    marginTop: 180,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 32,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: `${colors.text}99`,
    letterSpacing: 1.5,
    textAlign: 'center',
  },

  // Lock icon circle — 96×96 yellow pill
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  lockGlyph: {
    fontSize: 40,
    lineHeight: 48,
    textAlign: 'center',
  },

  prompt: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },

  challengeText: {
    fontSize: 80,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 88,
  },

  // Input field wrapper — 240×80
  inputWrapper: {
    width: 240,
    height: 80,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: `${colors.text}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    width: '100%',
    height: '100%',
    fontSize: 42,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // Submit button — 240×72 yellow
  submitButton: {
    width: 240,
    height: 72,
    borderRadius: radii.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  submitLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
});
