import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { radii, shadows, spacing, useTheme } from '../tokens';
import { useDataset } from '../core/state/DatasetStore';

export const FloatingQuickMenu: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { loadSyntheticBlueprintData } = useDataset();
  const [modalVisible, setModalVisible] = useState(false);

  const handleAction = (callback: () => void) => {
    setModalVisible(false);
    callback();
  };

  const handleContactSupport = async () => {
    setModalVisible(false);
    const waUrl = `https://wa.me/919059478739?text=${encodeURIComponent('Hello Dispatch Support! I have a question about spreadsheet bulk messaging.')}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      Alert.alert('Support Contact', 'Email us at support@dispatchsender.app or reach out on WhatsApp.');
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: isDark ? '#10B981' : '#0F172A',
            borderColor: isDark ? '#34D399' : '#334155',
          },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Quick Actions Menu"
      >
        <Ionicons name="apps" size={20} color="#FFFFFF" />
      </Pressable>

      {/* Quick Actions Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.sheetContent,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={18} color="#10B981" />
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  Dispatch Quick Menu
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
              </Pressable>
            </View>

            {/* Menu Items */}
            <View style={styles.menuList}>
              <Pressable
                onPress={() => handleAction(() => router.push('/workflow/import'))}
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: colors.surfaceSubtle },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                  <Ionicons name="rocket-outline" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                    New Campaign
                  </Text>
                  <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                    Upload Excel/CSV and start sending
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              <Pressable
                onPress={() =>
                  handleAction(() => {
                    loadSyntheticBlueprintData();
                    router.push('/workflow/import');
                  })
                }
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: colors.surfaceSubtle },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                  <Ionicons name="sparkles-outline" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                    Try Demo Ledger
                  </Text>
                  <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                    Instant sample dataset with 5 contacts
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              <Pressable
                onPress={() => handleAction(() => router.push('/(tabs)/templates'))}
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: colors.surfaceSubtle },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
                  <Ionicons name="bookmark-outline" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                    Message Templates
                  </Text>
                  <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                    Create and customize reusable templates
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              <Pressable
                onPress={() => handleAction(() => router.push('/(tabs)/campaigns'))}
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: colors.surfaceSubtle },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Ionicons name="layers-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                    Campaign Activity
                  </Text>
                  <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                    Past dispatches & delivery history
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              <Pressable
                onPress={handleContactSupport}
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: '#10B981', borderWidth: 1 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                    Instant WhatsApp Support
                  </Text>
                  <Text style={[styles.menuItemSub, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                    Need assistance? Chat directly with support
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#10B981" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    ...shadows.card,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 24,
  },
  sheetContent: {
    borderRadius: radii.xxl,
    padding: spacing.base,
    borderWidth: 1,
    ...shadows.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.lg,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  menuItemSub: {
    fontSize: 11,
  },
});
