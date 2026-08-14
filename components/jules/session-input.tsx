import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface SessionInputProps {
  isDark: boolean;
  insetsBottom: number;
  keyboardPadding: Animated.Value;
  messageInput: string;
  setMessageInput: (text: string) => void;
  t: (key: string) => string;
  handleSend: (requestCompletion?: boolean) => void;
  sessionState: string | null;
  isSending: boolean;
}

export function SessionInput({
  isDark,
  insetsBottom,
  keyboardPadding,
  messageInput,
  setMessageInput,
  t,
  handleSend,
  sessionState,
  isSending,
}: SessionInputProps) {
  const needsReply = sessionState === 'AWAITING_USER_FEEDBACK';
  const colors = isDark ? Colors.dark : Colors.light;
  return (
    <Animated.View
      style={[
        styles.inputContainer,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
        { paddingBottom: 12 + insetsBottom },
        Platform.OS === 'android' && { marginBottom: keyboardPadding },
      ]}
    >
      {needsReply && <Text style={[styles.replyLabel, { color: colors.warning }]}>{t('jobFeedbackAction')}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }, needsReply && { borderColor: colors.warning }]}
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder={t(needsReply ? 'feedbackReplyPlaceholder' : 'additionalInstructionPlaceholder')}
          placeholderTextColor={colors.icon}
          multiline
          maxLength={50000}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, (!messageInput.trim() || isSending) && { backgroundColor: colors.border }]}
          onPress={handleSend}
          disabled={!messageInput.trim() || isSending}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityHint="Send message"
        >
          <IconSymbol name="paperplane.fill" size={18} color={colors.surface} />
        </TouchableOpacity>
      </View>
      {needsReply && <TouchableOpacity
        style={[styles.completeButton, { backgroundColor: colors.success, opacity: isSending ? 0.55 : 1 }]}
        onPress={() => handleSend(true)}
        disabled={isSending}
        accessibilityLabel={t('requestCompletion')}
        accessibilityRole="button"
        accessibilityHint={t('requestCompletionHint')}
      >
        <IconSymbol name="checkmark.circle.fill" size={18} color={colors.surface} />
        <Text style={[styles.completeButtonText, { color: colors.surface }]}>{t('requestCompletion')}</Text>
      </TouchableOpacity>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyLabel: { fontSize: 12, fontWeight: '700', marginBottom: 9 },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButton: { minHeight: 46, borderRadius: 16, marginTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  completeButtonText: { fontSize: 14, fontWeight: '800' },
});
