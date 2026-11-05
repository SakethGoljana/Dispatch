import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing, typography, useTheme } from '../tokens';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  showThemeToggle = true,
  showLogo = false,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const shouldRenderLogo = showLogo || title === 'Dispatch';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
        ) : null}

        {shouldRenderLogo && (
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {rightAction}

        {showThemeToggle && (
          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [
              styles.themeToggleBtn,
              {
                backgroundColor: isDark ? '#1E293B' : colors.surfaceSubtle,
                borderColor: colors.border,
              },
              pressed && { transform: [{ scale: 0.9 }] },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Toggle Theme"
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={16}
              color={isDark ? '#FBBF24' : '#4F46E5'}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.sm,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 7,
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    fontFamily: typography.fontFamily,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: spacing.sm,
  },
  themeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
