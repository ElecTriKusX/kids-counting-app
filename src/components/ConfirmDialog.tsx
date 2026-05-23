/**
 * ConfirmDialog — модальный диалог подтверждения.
 *
 * 1:1 с Pencil-фреймом `FT1zg` (17 Confirm Dialog):
 *  - Полупрозрачный backdrop (#1A1A2E80) на весь экран
 *  - Карточка 320×320 с радиусом 28, фон #FFF8F0, тень
 *  - Иконка предупреждения 36×36 в круге (#FF6B6B26 фон)
 *  - Заголовок 22/800 (центрирован)
 *  - Подзаголовок 16/500 #1A1A2E99 (центрирован, lineHeight 1.4)
 *  - Две кнопки в ряд: «Отмена» (бордер) + «Сбросить» (красная)
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import PressableButton from './PressableButton';
import { getNunitoFamily } from '../hooks/useAppFonts';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Сбросить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={styles.dialog}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconCircle}>
            <TriangleAlert size={36} color="#FF6B6B" strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonsRow}>
            <PressableButton
              onPress={onCancel}
              accessibilityLabel={cancelLabel}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </PressableButton>
            <PressableButton
              onPress={onConfirm}
              accessibilityLabel={confirmLabel}
              style={[styles.button, styles.confirmButton]}
            >
              <Text style={styles.confirmLabel}>{confirmLabel}</Text>
            </PressableButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';

export { ConfirmDialog };
export default ConfirmDialog;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: 320,
    backgroundColor: '#FFF8F0',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    gap: 20,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.4,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,107,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('800'),
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#1A1A2E99',
    fontFamily: getNunitoFamily('500'),
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    height: 60,
  },
  button: {
    flex: 1,
    height: 60,
    minHeight: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFDF9',
    borderWidth: 2,
    borderColor: 'rgba(26,26,46,0.08)',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelLabel: {
    fontSize: 18,
    color: '#1A1A2E',
    fontFamily: getNunitoFamily('700'),
  },
  confirmLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: getNunitoFamily('800'),
  },
});
