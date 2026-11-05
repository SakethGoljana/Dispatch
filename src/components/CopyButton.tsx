import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { radii, useTheme } from '../tokens';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label = 'Copy',
  size = 'sm',
}) => {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!textToCopy) return;
    await Clipboard.setStringAsync(textToCopy);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const isSmall = size === 'sm';

  return (
    <Pressable
      onPress={handleCopy}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: copied
            ? (isDark ? '#064E3B' : '#ECFDF5')
            : (isDark ? '#1E293B' : colors.surfaceSubtle),
          borderColor: copied ? '#10B981' : colors.border,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 4 : 6,
        },
        pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Copied' : label}
    >
      <Ionicons
        name={copied ? 'checkmark' : 'copy-outline'}
        size={isSmall ? 13 : 15}
        color={copied ? '#10B981' : colors.textSecondary}
      />
      <Text
        style={[
          styles.text,
          {
            color: copied ? '#10B981' : colors.textSecondary,
            fontSize: isSmall ? 11 : 12,
            fontWeight: copied ? '700' : '600',
          },
        ]}
      >
        {copied ? 'Copied! ✓' : label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  text: {
    letterSpacing: 0.2,
  },
});
