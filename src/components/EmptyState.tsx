import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography, useTheme } from '../tokens';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionTitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionTitle,
  actionLabel,
  onAction,
  icon,
  style,
}) => {
  const { colors } = useTheme();
  const buttonTitle = actionTitle || actionLabel;

  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSubtle }]}>{icon}</View> : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      {buttonTitle && onAction ? (
        <Button
          title={buttonTitle}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.base,
    padding: spacing.md,
    borderRadius: 9999,
    backgroundColor: colors.surfaceSubtle,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  description: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.base,
    maxWidth: 320,
    marginBottom: spacing.xl,
    fontFamily: typography.fontFamily,
  },
  button: {
    minWidth: 160,
  },
});
