import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SessionInputProps {
  isDark: boolean;
  insetsBottom: number;
  keyboardPadding: Animated.Value;
  messageInput: string;
  setMessageInput: (text: string) => void;
  t: (key: string) => string;
  handleSend: () => void;
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
  return (
    <Animated.View
      style={[
        styles.inputContainer,
        isDark && styles.inputContainerDark,
        { paddingBottom: 12 + insetsBottom },
        Platform.OS === 'android' && { marginBottom: keyboardPadding },
      ]}
    >
      {needsReply && <Text style={[styles.replyLabel, isDark && styles.replyLabelDark]}>{t('jobFeedbackAction')}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isDark && styles.inputDark, needsReply && styles.inputNeedsReply]}
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder={t(needsReply ? 'feedbackReplyPlaceholder' : 'additionalInstructionPlaceholder')}
          placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
          multiline
          maxLength={50000}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageInput.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageInput.trim() || isSending}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityHint="Send message"
        >
          <IconSymbol name="paperplane.fill" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputContainerDark: {
    backgroundColor: '#1e293b',
    borderTopColor: '#334155',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyLabel: { color: '#7c3aed', fontSize: 12, fontWeight: '700', marginBottom: 9 },
  replyLabelDark: { color: '#c4b5fd' },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 15,
    color: '#0f172a',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
  },
  inputNeedsReply: { borderWidth: 2, borderColor: '#8b5cf6' },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
});
