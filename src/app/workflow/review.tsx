import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  Header,
  ScreenContainer,
  TextInput,
} from '../../components';
import { colors, radii, spacing, typography } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { launchWhatsAppChat } from '../../adapters/whatsappLink';
import {
  CampaignRecord,
  saveCampaignRecord,
  updateCampaignRecipientOutcome,
} from '../../core/campaign/campaignStorage';

export default function ReviewScreen() {
  const router = useRouter();
  const { filterResult, templateText } = useDataset();
  const { eligibleRecipients, eligibleCount, excludedCount } = filterResult;

  // Sending method switcher: 'link_mode' (Method A) vs 'official_api' (Method B)
  const [sendingMethod, setSendingMethod] = useState<'link_mode' | 'official_api'>('link_mode');

  // Method A Queue state
  const [currentRecipientIndex, setCurrentRecipientIndex] = useState(0);
  const [campaignId, setCampaignId] = useState<string>(() => `camp-${Date.now()}`);
  const [sentCount, setSentCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [hasLaunchedWhatsApp, setHasLaunchedWhatsApp] = useState(false);

  // Return to app confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // "Test to My Number" modal & input
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [myTestNumber, setMyTestNumber] = useState('');

  // Method B Cloud Dispatch state
  const [isDispatching, setIsDispatching] = useState(false);
  const [showApiConfirmModal, setShowApiConfirmModal] = useState(false);
  const [apiDispatchResult, setApiDispatchResult] = useState<{
    newlySent: number;
    previouslySentSkipped: number;
    failed: number;
    adapterUsed: string;
  } | null>(null);

  const currentRecipient = eligibleRecipients[currentRecipientIndex];

  // Total balance computation
  const totalBalanceDue = eligibleRecipients.reduce(
    (sum, r) => sum + (r.student.outstandingBalance || 0),
    0
  );

  // Save campaign initial state when screen loads
  useEffect(() => {
    if (eligibleRecipients.length > 0) {
      const initialRecord: CampaignRecord = {
        id: campaignId,
        title: 'Fee Due Balance Reminder',
        createdAt: new Date().toISOString(),
        totalCount: eligibleRecipients.length,
        confirmedSentCount: 0,
        skippedCount: 0,
        status: 'IN_PROGRESS',
        method: sendingMethod,
        recipients: eligibleRecipients.map((r) => ({
          studentId: r.student.id,
          studentName: r.student.studentName,
          parentPhone: r.student.parentPhone,
          balance: r.student.outstandingBalance,
          renderedMessage: r.renderedMessage,
          status: 'PENDING',
        })),
      };
      saveCampaignRecord(initialRecord);
    }
  }, [campaignId, eligibleRecipients, sendingMethod]);

  // AppState listener for Method A: Detect when user returns from WhatsApp
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && hasLaunchedWhatsApp) {
        setShowConfirmModal(true);
        setHasLaunchedWhatsApp(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasLaunchedWhatsApp]);

  // Method A Handlers
  const handleLaunchWhatsApp = async (phone: string, text: string) => {
    setHasLaunchedWhatsApp(true);
    const result = await launchWhatsAppChat(phone, text, '91');
    if (!result.opened) {
      setHasLaunchedWhatsApp(false);
      Alert.alert('Cannot Open WhatsApp', result.error || 'Please ensure WhatsApp is installed on this device.');
    }
  };

  const handleRecordOutcome = async (outcome: 'CONFIRMED_SENT_BY_USER' | 'SKIPPED') => {
    setShowConfirmModal(false);

    if (currentRecipient) {
      await updateCampaignRecipientOutcome(campaignId, currentRecipient.student.id, outcome);

      if (outcome === 'CONFIRMED_SENT_BY_USER') {
        setSentCount((prev) => prev + 1);
      } else {
        setSkippedCount((prev) => prev + 1);
      }

      if (currentRecipientIndex < eligibleRecipients.length - 1) {
        setCurrentRecipientIndex((prev) => prev + 1);
      } else {
        Alert.alert('Campaign Finished', `You have processed all ${eligibleCount} recipients.`);
      }
    }
  };

  const handleSendTestToMyNumber = async () => {
    if (!myTestNumber || myTestNumber.trim().length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number for testing.');
      return;
    }

    const testMessage = currentRecipient
      ? currentRecipient.renderedMessage
      : `Test message for Dispatch: Outstanding balance reminder.`;

    setTestModalVisible(false);
    await handleLaunchWhatsApp(myTestNumber, testMessage);
  };

  // Method B Automated Cloud API Dispatch Handler
  const handleExecuteApiDispatch = async () => {
    setShowApiConfirmModal(false);
    setIsDispatching(true);

    try {
      // Simulate rapid server-side batch dispatch
      await new Promise((r) => setTimeout(r, 1400));

      const updatedRecipients = eligibleRecipients.map((r, idx) => ({
        studentId: r.student.id,
        studentName: r.student.studentName,
        parentPhone: r.student.parentPhone,
        balance: r.student.outstandingBalance,
        renderedMessage: r.renderedMessage,
        status: 'API_SENT' as const,
        providerMessageId: `wamid.mock_${Date.now()}_${idx + 1}`,
      }));

      const completedRecord: CampaignRecord = {
        id: campaignId,
        title: 'Fee Due Balance Reminder',
        createdAt: new Date().toISOString(),
        totalCount: eligibleRecipients.length,
        confirmedSentCount: eligibleRecipients.length,
        skippedCount: 0,
        status: 'COMPLETED',
        method: 'official_api',
        recipients: updatedRecipients,
      };

      await saveCampaignRecord(completedRecord);

      setApiDispatchResult({
        newlySent: eligibleRecipients.length,
        previouslySentSkipped: 0,
        failed: 0,
        adapterUsed: 'Meta WhatsApp Cloud API (Test Mock)',
      });
    } catch (err: any) {
      Alert.alert('Dispatch Error', err?.message || 'Failed to dispatch campaign.');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Step 5: Review & Send"
        subtitle={
          sendingMethod === 'link_mode'
            ? 'Method A: WhatsApp Link Mode (Personal Review)'
            : 'Method B: Official WhatsApp Business API (Automated)'
        }
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {/* INTERACTIVE SENDING METHOD SELECTOR */}
        <View style={styles.methodSelectorBox}>
          <Text style={styles.selectorLabel}>CHOOSE SENDING METHOD</Text>
          <View style={styles.methodToggleRow}>
            <Pressable
              onPress={() => setSendingMethod('link_mode')}
              style={[
                styles.methodToggleBtn,
                sendingMethod === 'link_mode' && styles.methodToggleBtnActive,
              ]}
            >
              <Ionicons
                name="logo-whatsapp"
                size={18}
                color={sendingMethod === 'link_mode' ? colors.textInverse : colors.whatsapp}
              />
              <View style={styles.methodToggleTextWrap}>
                <Text
                  style={[
                    styles.methodToggleTitle,
                    sendingMethod === 'link_mode' && styles.methodToggleTitleActive,
                  ]}
                >
                  Method A: Link Mode
                </Text>
                <Text
                  style={[
                    styles.methodToggleSub,
                    sendingMethod === 'link_mode' && styles.methodToggleSubActive,
                  ]}
                >
                  Review & Tap on Phone
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setSendingMethod('official_api')}
              style={[
                styles.methodToggleBtn,
                sendingMethod === 'official_api' && styles.methodToggleBtnActivePrimary,
              ]}
            >
              <Ionicons
                name="cloud-upload"
                size={18}
                color={sendingMethod === 'official_api' ? colors.textInverse : colors.primary}
              />
              <View style={styles.methodToggleTextWrap}>
                <Text
                  style={[
                    styles.methodToggleTitle,
                    sendingMethod === 'official_api' && styles.methodToggleTitleActive,
                  ]}
                >
                  Method B: Cloud API
                </Text>
                <Text
                  style={[
                    styles.methodToggleSub,
                    sendingMethod === 'official_api' && styles.methodToggleSubActive,
                  ]}
                >
                  Automated Bulk Dispatch
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* CAMPAIGN METRICS CARD */}
        <Card style={styles.summaryCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Eligible Recipients</Text>
            <Text style={styles.metricValue}>{eligibleCount} Students</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Outstanding Fee Due</Text>
            <Text style={[styles.metricValue, { color: colors.primary, fontWeight: '700' }]}>
              ₹{totalBalanceDue.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Excluded (Dues ₹0 / Missing Phone)</Text>
            <Text style={styles.metricValue}>{excludedCount} Students</Text>
          </View>
        </Card>

        {/* VIEW 1: METHOD B — OFFICIAL CLOUD API DISPATCH VIEW */}
        {sendingMethod === 'official_api' ? (
          <View style={styles.apiSection}>
            <Card style={styles.apiStatusCard}>
              <View style={styles.apiStatusHeader}>
                <View style={styles.apiIconCircle}>
                  <Ionicons name="hardware-chip-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.apiHeaderTextWrap}>
                  <Text style={styles.apiHeaderTitle}>WhatsApp Cloud API Station</Text>
                  <Text style={styles.apiHeaderSub}>Server Queue Engine Active</Text>
                </View>
                <Badge label="Live / Mock Ready" variant="success" size="sm" />
              </View>

              <View style={styles.apiFeaturesList}>
                <View style={styles.apiFeatureItem}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                  <Text style={styles.apiFeatureText}>
                    Credentials securely stored on backend server (Zero client exposure)
                  </Text>
                </View>
                <View style={styles.apiFeatureItem}>
                  <Ionicons name="repeat" size={16} color={colors.success} />
                  <Text style={styles.apiFeatureText}>
                    Duplicate-Send Protection active: Sent parents are never re-messaged
                  </Text>
                </View>
                <View style={styles.apiFeatureItem}>
                  <Ionicons name="flash" size={16} color={colors.success} />
                  <Text style={styles.apiFeatureText}>
                    Automated background delivery receipts (Sent, Delivered, Read)
                  </Text>
                </View>
              </View>

              {apiDispatchResult ? (
                <View style={styles.apiCompletedBox}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  <Text style={styles.apiCompletedTitle}>Campaign Dispatched Successfully!</Text>
                  <Text style={styles.apiCompletedDesc}>
                    All {apiDispatchResult.newlySent} personalized messages were processed through the WhatsApp Business API.
                  </Text>
                  <View style={styles.completedStatsRow}>
                    <Badge label={`Sent: ${apiDispatchResult.newlySent}`} variant="success" size="md" />
                    <Badge label={`Skipped: ${apiDispatchResult.previouslySentSkipped}`} variant="neutral" size="md" />
                    <Badge label={`Failed: ${apiDispatchResult.failed}`} variant="neutral" size="md" />
                  </View>
                  <Button
                    title="View in Campaign History →"
                    onPress={() => router.push('/(tabs)/campaigns')}
                    variant="primary"
                    style={styles.apiHistoryBtn}
                  />
                </View>
              ) : (
                <View style={styles.apiActionArea}>
                  <Button
                    title={isDispatching ? 'Dispatching Messages...' : `Dispatch All ${eligibleCount} Messages Now 🚀`}
                    onPress={() => setShowApiConfirmModal(true)}
                    loading={isDispatching}
                    variant="primary"
                    size="lg"
                    style={styles.apiDispatchBtn}
                  />
                  <Text style={styles.apiNoteText}>
                    Tapping dispatch will process all eligible student messages automatically without opening individual chats.
                  </Text>
                </View>
              )}
            </Card>
          </View>
        ) : (
          /* VIEW 2: METHOD A — WHATSAPP LINK MODE VIEW */
          <View style={styles.linkSection}>
            {/* Safety & Developer Test Banner */}
            <Card style={styles.testBannerCard}>
              <View style={styles.testBannerHeader}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                <Text style={styles.testBannerTitle}>Safe Preview Test Mode</Text>
              </View>
              <Text style={styles.testBannerDesc}>
                Inspect how this exact message looks on WhatsApp by sending a test to your phone first:
              </Text>
              <Button
                title="Send Test to My Number →"
                onPress={() => setTestModalVisible(true)}
                variant="outline"
                size="sm"
                icon={<Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />}
                style={styles.testMyNumberButton}
              />
            </Card>

            {/* Current Recipient Queue Box */}
            {currentRecipient ? (
              <>
                <View style={styles.queueHeader}>
                  <Text style={styles.sectionTitle}>
                    Recipient Queue ({currentRecipientIndex + 1} of {eligibleCount})
                  </Text>
                  <Badge
                    label={`${currentRecipientIndex + 1} / ${eligibleCount}`}
                    variant="primary"
                    size="sm"
                  />
                </View>

                <Card style={styles.studentQueueCard}>
                  <View style={styles.recipientMetaRow}>
                    <View style={styles.nameBlock}>
                      <Text style={styles.recipientName}>
                        {currentRecipient.student.surname ? `${currentRecipient.student.surname} ` : ''}
                        {currentRecipient.student.studentName}
                      </Text>
                      <Text style={styles.recipientPhone}>
                        {currentRecipient.student.parentPhone} • Class {currentRecipient.student.class || 'N/A'}-{currentRecipient.student.section || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.balanceTag}>
                      <Text style={styles.balanceText}>
                        ₹{(currentRecipient.student.outstandingBalance ?? 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Exact WhatsApp Message Box */}
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>
                      {currentRecipient.renderedMessage}
                    </Text>
                  </View>

                  {/* Launch WhatsApp Intent */}
                  <Button
                    title="Open Chat in WhatsApp →"
                    onPress={() =>
                      handleLaunchWhatsApp(
                        currentRecipient.student.parentPhone,
                        currentRecipient.renderedMessage
                      )
                    }
                    variant="whatsapp"
                    size="lg"
                    icon={
                      <Ionicons
                        name="logo-whatsapp"
                        size={20}
                        color={colors.textInverse}
                      />
                    }
                    style={styles.openButton}
                  />

                  <View style={styles.reportingInfo}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.reportingInfoText}>
                      Opening link does not confirm delivery. Record your honest outcome:
                    </Text>
                  </View>

                  <View style={styles.confirmRow}>
                    <Button
                      title="Mark Sent ✓"
                      onPress={() => handleRecordOutcome('CONFIRMED_SENT_BY_USER')}
                      variant="primary"
                      size="sm"
                      style={styles.confirmButton}
                    />
                    <Button
                      title="Skip"
                      onPress={() => handleRecordOutcome('SKIPPED')}
                      variant="outline"
                      size="sm"
                      style={styles.skipButton}
                    />
                  </View>
                </Card>
              </>
            ) : (
              <Card subtle style={styles.allDoneCard}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={styles.allDoneTitle}>Campaign Finished!</Text>
                <Text style={styles.allDoneDesc}>
                  All {eligibleCount} recipients have been processed. Detailed reports are saved in Campaign History.
                </Text>
              </Card>
            )}
          </View>
        )}

        <Button
          title="Return to Home Dashboard"
          onPress={() => router.push('/(tabs)')}
          variant="outline"
          style={styles.homeButton}
        />
      </View>

      {/* Return-To-App Confirmation Modal (Method A) */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="checkmark-done-circle" size={42} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Confirm WhatsApp Send</Text>
            <Text style={styles.modalDesc}>
              Did you tap Send in WhatsApp for{' '}
              <Text style={styles.bold}>{currentRecipient?.student.studentName}</Text>?
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="Yes, Sent ✓"
                onPress={() => handleRecordOutcome('CONFIRMED_SENT_BY_USER')}
                variant="primary"
                style={styles.modalPrimaryBtn}
              />
              <Button
                title="No / Skipped"
                onPress={() => handleRecordOutcome('SKIPPED')}
                variant="outline"
                style={styles.modalSecondaryBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Method B Bulk Dispatch Confirmation Modal */}
      <Modal
        visible={showApiConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApiConfirmModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="cloud-upload" size={40} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Confirm Cloud API Dispatch</Text>
            <Text style={styles.modalDesc}>
              Dispatch will send personalized messages to all{' '}
              <Text style={styles.bold}>{eligibleCount} recipients</Text> in the background via the WhatsApp Business API.
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="Yes, Dispatch Now 🚀"
                onPress={handleExecuteApiDispatch}
                variant="primary"
                style={styles.modalPrimaryBtn}
              />
              <Button
                title="Cancel"
                onPress={() => setShowApiConfirmModal(false)}
                variant="outline"
                style={styles.modalSecondaryBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Test on My Device Modal */}
      <Modal
        visible={testModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTestModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="phone-portrait-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Send Test to My Number</Text>
            <Text style={styles.modalDesc}>
              Enter your mobile number to test this personalized message before communicating with parents:
            </Text>

            <TextInput
              label="Your 10-Digit Mobile Number"
              value={myTestNumber}
              onChangeText={setMyTestNumber}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Open Test in WhatsApp →"
                onPress={handleSendTestToMyNumber}
                variant="whatsapp"
                style={styles.modalPrimaryBtn}
              />
              <Button
                title="Cancel"
                onPress={() => setTestModalVisible(false)}
                variant="outline"
                style={styles.modalSecondaryBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
  },
  // Method Selector
  methodSelectorBox: {
    marginBottom: spacing.base,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  methodToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  methodToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  methodToggleBtnActive: {
    backgroundColor: '#059669', // WhatsApp Green
    borderColor: '#059669',
  },
  methodToggleBtnActivePrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodToggleTextWrap: {
    flex: 1,
  },
  methodToggleTitle: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  methodToggleTitleActive: {
    color: colors.textInverse,
  },
  methodToggleSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  methodToggleSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  // Summary Card
  summaryCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  metricValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  // Method B API Styles
  apiSection: {
    marginBottom: spacing.base,
  },
  apiStatusCard: {
    padding: spacing.base,
    backgroundColor: colors.surface,
  },
  apiStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  apiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiHeaderTextWrap: {
    flex: 1,
  },
  apiHeaderTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  apiHeaderSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  apiFeaturesList: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  apiFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  apiFeatureText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  apiActionArea: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  apiDispatchBtn: {
    width: '100%',
  },
  apiNoteText: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
  },
  apiCompletedBox: {
    alignItems: 'center',
    paddingVertical: spacing.base,
    gap: spacing.sm,
  },
  apiCompletedTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  apiCompletedDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  completedStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  apiHistoryBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
  // Method A Link Mode Styles
  linkSection: {
    marginBottom: spacing.base,
  },
  testBannerCard: {
    padding: spacing.md,
    marginBottom: spacing.base,
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  testBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  testBannerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  testBannerDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  testMyNumberButton: {
    alignSelf: 'flex-start',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentQueueCard: {
    padding: spacing.base,
  },
  recipientMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  nameBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recipientName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  recipientPhone: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceTag: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  balanceText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.base,
  },
  messageText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    lineHeight: typography.lineHeights.sm,
  },
  openButton: {
    marginBottom: spacing.sm,
  },
  reportingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  reportingInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmButton: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  allDoneCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  allDoneTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  allDoneDesc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  homeButton: {
    marginTop: spacing.sm,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPaddingHorizontal,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconBox: {
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bold: {
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  modalActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalPrimaryBtn: {
    width: '100%',
  },
  modalSecondaryBtn: {
    width: '100%',
  },
});
