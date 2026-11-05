import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { radii, spacing, typography, useTheme } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'whatsapp';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const isDisabled = disabled || loading;

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let bg: string = colors.primary;
    let borderColor: string = colors.primary;
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        bg = pressed ? colors.primaryLight : colors.primary;
        break;
      case 'secondary':
        bg = pressed ? colors.surfaceHover : colors.surfaceSubtle;
        borderColor = colors.border;
        borderWidth = 1;
        break;
      case 'outline':
        bg = pressed ? colors.surfaceHover : 'transparent';
        borderColor = isDark ? colors.borderFocus : colors.border;
        borderWidth = 1.5;
        break;
      case 'danger':
        bg = pressed ? '#7F1D1D' : colors.error;
        break;
      case 'whatsapp':
        bg = pressed ? colors.whatsappDark : colors.whatsapp;
        break;
    }

    if (isDisabled) {
      bg = variant === 'outline' ? 'transparent' : isDark ? '#1F2937' : '#E5E7EB';
      borderColor = isDark ? '#374151' : '#E5E7EB';
    }

    let height: number = spacing.buttonHeight;
    let paddingHorizontal: number = spacing.base;

    if (size === 'sm') {
      height = spacing.buttonHeightSm;
      paddingHorizontal = spacing.md;
    } else if (size === 'lg') {
      height = spacing.buttonHeightLg;
      paddingHorizontal = spacing.xl;
    }

    return {
      backgroundColor: bg,
      borderColor,
      borderWidth,
      height,
      paddingHorizontal,
      borderRadius: radii.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: pressed && !isDisabled ? 0.9 : 1,
      transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
    };
  };

  const getTextColor = (): string => {
    if (isDisabled) return colors.textTertiary;
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'whatsapp':
        return colors.textInverse;
      case 'secondary':
        return colors.textPrimary;
      case 'outline':
        return isDark ? colors.textPrimary : colors.primary;
      default:
        return colors.textInverse;
    }
  };

  const getFontSize = (): number => {
    if (size === 'sm') return typography.sizes.sm;
    if (size === 'lg') return typography.sizes.md;
    return typography.sizes.base;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' ? colors.primary : colors.textInverse}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? spacing.sm : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});
