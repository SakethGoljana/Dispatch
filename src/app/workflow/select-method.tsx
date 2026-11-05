import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  Header,
  ScreenContainer,
} from '../../components';
import { radii, shadows, spacing, typography, useTheme } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { exportWhatsAppWebExcel } from '../../core/export/whatsappWebCompanion';

export default function SelectMethodScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { records, templateText } = useDataset();

  const [exportingWeb, setExportingWeb] = useState(false);
  const [desktopModalVisible, setDesktopModalVisible] = useState(false);

  const totalDue = records.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0);

  const handleExportDesktopCompanion = async () => {
    try {
      setExportingWeb(true);
      await exportWhatsAppWebExcel(records, templateText);
      setDesktopModalVisible(false);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export desktop companion sheet.');
    } finally {
      setExportingWeb(false);
    }
  };

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Select Channel"
        subtitle="Choose how Dispatch sends your messages"
        onBack={() => router.back()}
      />

      {/* TOP STEP TRACKER */}
      <View style={[styles.stepperBar, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
        <View style={styles.stepItemDone}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={[styles.stepItemLabelDone, { color: isDark ? '#34D399' : '#059669' }]}>
            Data
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />

        <View style={styles.stepItemActive}>
          <View style={styles.stepNumberCircleActive}>
            <Text style={styles.stepNumberTextActive}>2</Text>
          </View>
          <Text style={[styles.stepItemLabelActive, { color: isDark ? '#34D399' : '#059669' }]}>
            Choose Channel
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />

        <View style={styles.stepItemInactive}>
          <View style={[styles.stepNumberCircleInactive, { borderColor: colors.border }]}>
            <Text style={[styles.stepNumberTextInactive, { color: colors.textTertiary }]}>3</Text>
          </View>
          <Text style={[styles.stepItemLabelInactive, { color: colors.textTertiary }]}>
            Dispatch
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Campaign Snapshot Telemetry Banner */}
        <View
          style={[
            styles.snapshotBanner,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
        >
          <View style={styles.snapshotMetric}>
            <Text style={[styles.snapshotLabel, { color: colors.textSecondary }]}>
              TARGET AUDIENCE
            </Text>
            <Text style={[styles.snapshotValue, { color: colors.textPrimary }]}>
              {records.length} Contacts
            </Text>
          </View>

          <View style={[styles.snapshotDivider, { backgroundColor: colors.border }]} />

          <View style={styles.snapshotMetric}>
            <Text style={[styles.snapshotLabel, { color: colors.textSecondary }]}>
              TOTAL BALANCE
            </Text>
            <Text style={[styles.snapshotValue, { color: '#10B981' }]}>
              ₹{totalDue.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <Text style={[styles.channelChoosePrompt, { color: colors.textPrimary }]}>
          Choose Your Dispatch Channel
        </Text>

        {/* DECISION CARD 1: WHATSAPP PERSONAL SENDER */}
        <Pressable
          onPress={() => router.push('/workflow/send-personal')}
          style={({ pressed }) => [
            styles.channelSelectCard,
            {
              backgroundColor: isDark ? '#06281E' : '#F0FDF4',
              borderColor: isDark ? '#059669' : '#BBF7D0',
            },
            pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 },
          ]}
        >
          <View style={styles.channelHeaderRow}>
            <View style={styles.channelIconEmerald}>
              <Ionicons name="logo-whatsapp" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.channelName, { color: colors.textPrimary }]}>
                  Personal WhatsApp Sender
                </Text>
                <Badge label="Free • Ban-Safe" variant="success" size="sm" />
              </View>
              <Text style={[styles.channelTagline, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                Method A • 1-Click Review & Send on Device
              </Text>
            </View>
          </View>

          <Text style={[styles.channelDescription, { color: colors.textSecondary }]}>
            Dispatch auto-generates each contact's custom message with their respective data (name, dues, date). Opens WhatsApp prefilled so you review & send in 1 click. Zero manual typing, complete privacy, and zero risk of spam bans.
          </Text>

          <View style={styles.featurePillList}>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                Auto-fills each contact's unique data (dues, dates, names)
              </Text>
            </View>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                1-Click Send: Opens prefilled WhatsApp ready to tap send
              </Text>
            </View>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                100% Ban-Safe (Genuine 1-to-1 human review & dispatch)
              </Text>
            </View>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                Zero Facebook setup, API tokens, or server fees required
              </Text>
            </View>
          </View>

          <View style={styles.actionPromptRowEmerald}>
            <Text style={styles.actionPromptTextEmerald}>Launch Personal Sender Station →</Text>
          </View>
        </Pressable>

        {/* DECISION CARD 2: WHATSAPP BUSINESS CLOUD API */}
        <Pressable
          onPress={() => router.push('/workflow/send-api')}
          style={({ pressed }) => [
            styles.channelSelectCard,
            {
              backgroundColor: isDark ? '#111827' : '#EFF6FF',
              borderColor: isDark ? '#4338CA' : '#BFDBFE',
            },
            pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 },
          ]}
        >
          <View style={styles.channelHeaderRow}>
            <View style={styles.channelIconIndigo}>
              <Ionicons name="cloud-upload" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.channelName, { color: colors.textPrimary }]}>
                  Meta Cloud Platform API
                </Text>
                <Badge label="1-Click Bulk" variant="primary" size="sm" />
              </View>
              <Text style={[styles.channelTagline, { color: isDark ? '#A5B4FC' : '#3B82F6' }]}>
                Method B • Automated Background Queue
              </Text>
            </View>
          </View>

          <Text style={[styles.channelDescription, { color: colors.textSecondary }]}>
            Dispatches all messages simultaneously in the background through the official Meta WhatsApp Cloud API with instant live progress tracking and webhook delivery receipts.
          </Text>

          <View style={styles.featurePillList}>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#6366F1" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                One-tap send to 100s of contacts in seconds
              </Text>
            </View>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#6366F1" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                Includes Instant Test Sandbox (No Facebook account needed)
              </Text>
            </View>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#6366F1" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                Delivery receipts & duplicate protection built-in
              </Text>
            </View>
          </View>

          <View style={styles.actionPromptRowIndigo}>
            <Text style={styles.actionPromptTextIndigo}>Launch Cloud API Station →</Text>
          </View>
        </Pressable>

        {/* DECISION CARD 3: WHATSAPP WEB & DESKTOP COMPANION */}
        <Pressable
          onPress={() => setDesktopModalVisible(true)}
          style={({ pressed }) => [
            styles.channelSelectCard,
            {
              backgroundColor: isDark ? '#1E1B4B20' : '#FAF5FF',
              borderColor: isDark ? '#6366F1' : '#DDD6FE',
            },
            pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 },
          ]}
        >
          <View style={styles.channelHeaderRow}>
            <View style={styles.channelIconPurple}>
              <Ionicons name="desktop" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.channelName, { color: colors.textPrimary }]}>
                  WhatsApp Web Companion
                </Text>
                <Badge label="PC / Mac Export" variant="primary" size="sm" />
              </View>
              <Text style={[styles.channelTagline, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>
                Method C • Export Direct Web Links for Desktop
              </Text>
            </View>
          </View>

          <Text style={[styles.channelDescription, { color: colors.textSecondary }]}>
            Prefer sending from your computer? Export an Excel file pre-loaded with clickable direct WhatsApp Web launch links for every contact.
          </Text>

          <View style={styles.featurePillList}>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                Includes direct `web.whatsapp.com` links for each person
              </Text>
            </View>
            <View style={styles.featurePillItem}>
              <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
              <Text style={[styles.featurePillText, { color: colors.textPrimary }]}>
                Ideal for school clerks and office desks with large monitors
              </Text>
            </View>
          </View>

          <View style={styles.actionPromptRowPurple}>
            <Text style={styles.actionPromptTextPurple}>Open Desktop Companion Options →</Text>
          </View>
        </Pressable>
      </View>

      {/* DESKTOP COMPANION MODAL */}
      <Modal
        visible={desktopModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDesktopModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="desktop-outline" size={20} color="#8B5CF6" />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Desktop & WhatsApp Web
                </Text>
              </View>
              <Pressable onPress={() => setDesktopModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Export an Excel spreadsheet formatted specifically for WhatsApp Web on computer. Each row includes the recipient's phone number, customized message, and a 1-click launch URL.
            </Text>

            <View style={[styles.desktopTipCard, { backgroundColor: isDark ? '#1E1B4B40' : '#F5F3FF' }]}>
              <Text style={[styles.desktopTipHeading, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                How to Use on PC / Mac:
              </Text>
              <Text style={[styles.desktopTipText, { color: colors.textSecondary }]}>
                1. Tap "Export WhatsApp Web Sheet" below to share or save the `.xlsx` file.{'\n'}
                2. Open the file on your computer in Excel or Google Sheets.{'\n'}
                3. Click any link in the "Direct WhatsApp Web Link" column to launch WhatsApp Web and send in 1 click!
              </Text>
            </View>

            <View style={styles.modalActionGroup}>
              <Button
                title={exportingWeb ? 'Exporting...' : '📊 Export WhatsApp Web Sheet (.xlsx)'}
                variant="primary"
                size="md"
                onPress={handleExportDesktopCompanion}
                loading={exportingWeb}
                style={{ width: '100%', marginBottom: spacing.sm, backgroundColor: '#8B5CF6' }}
              />
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setDesktopModalVisible(false)}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  stepItemDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepItemLabelDone: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepNumberCircleActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepItemLabelActive: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepItemInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepNumberCircleInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberTextInactive: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepItemLabelInactive: {
    fontSize: 12,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  snapshotBanner: {
    flexDirection: 'row',
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    ...shadows.subtle,
  },
  snapshotMetric: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  snapshotDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  channelChoosePrompt: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  channelSelectCard: {
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 1.5,
    ...shadows.card,
  },
  channelHeaderRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  channelIconEmerald: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIconIndigo: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  channelTagline: {
    fontSize: 12,
    fontWeight: '700',
  },
  channelDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  featurePillList: {
    gap: 6,
    marginBottom: spacing.md,
  },
  featurePillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionPromptRowEmerald: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPromptTextEmerald: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionPromptRowIndigo: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPromptTextIndigo: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  channelIconPurple: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPromptRowPurple: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPromptTextPurple: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.screenPaddingHorizontal,
  },
  modalCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  desktopTipCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  desktopTipHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  desktopTipText: {
    fontSize: 11,
    lineHeight: 16,
  },
  modalActionGroup: {
    width: '100%',
  },
});
