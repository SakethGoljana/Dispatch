import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { radii, spacing, typography, useTheme } from '../tokens';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  style,
  icon,
}) => {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: colors.primarySubtle,
          text: colors.primary,
          border: colors.primaryBorder,
        };
      case 'success':
        return {
          bg: colors.successBg,
          text: colors.success,
          border: colors.successBorder,
        };
      case 'warning':
        return {
          bg: colors.warningBg,
          text: colors.warning,
          border: colors.warningBorder,
        };
      case 'error':
        return {
          bg: colors.errorBg,
          text: colors.error,
          border: colors.errorBorder,
        };
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          border: colors.border,
        };
    }
  };

  const scheme = getColors();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? spacing.xs : spacing.sm,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          {
            color: scheme.text,
            fontSize: isSmall ? typography.sizes.xs : typography.sizes.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
  },
});
