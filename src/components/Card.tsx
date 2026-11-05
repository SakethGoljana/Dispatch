import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { radii, shadows, spacing, useTheme } from '../tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  subtle?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  subtle = false,
}) => {
  const { colors, isDark } = useTheme();

  const dynamicCardStyle: ViewStyle = {
    backgroundColor: subtle ? colors.surfaceSubtle : colors.surface,
    borderColor: isDark ? (subtle ? colors.borderSubtle : 'rgba(255, 255, 255, 0.08)') : (subtle ? colors.borderSubtle : colors.border),
    ...(isDark ? {} : shadows.card),
  };

  const containerStyle = [
    styles.card,
    dynamicCardStyle,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && {
            opacity: 0.92,
            backgroundColor: colors.surfaceHover,
            transform: [{ scale: 0.985 }],
          },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.cardPadding,
    borderWidth: 1,
  },
});
