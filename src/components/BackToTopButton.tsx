import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, shadows, useTheme } from '../tokens';

interface BackToTopButtonProps {
  visible: boolean;
  onPress: () => void;
  bottomOffset?: number;
}

export const BackToTopButton: React.FC<BackToTopButtonProps> = ({
  visible,
  onPress,
  bottomOffset = 24,
}) => {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          bottom: bottomOffset,
          backgroundColor: isDark ? '#1E293B' : '#0F172A',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Scroll to top"
    >
      <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
      <Text style={styles.text}>Top</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    ...shadows.card,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
