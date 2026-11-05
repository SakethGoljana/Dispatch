import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  Badge,
  Button,
  Card,
  Header,
  ScreenContainer,
} from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { renderStudentMessage } from '../../core/template/templateCompiler';
import {
  CampaignRecord,
  PersistentRecipient,
  saveCampaignRecord,
} from '../../core/campaign/campaignStorage';
import { exportCampaignToExcel } from '../../core/export/exportService';

export default function SendPersonalScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    records,
    filterResult,
    templateText,
    mappingConfig,
    fileInfo,
    clearDataset,
  } = useDataset();

  const activeRecords = useMemo(() => {
    if (filterResult && filterResult.eligibleRecipients && filterResult.eligibleRecipients.length > 0) {
      return filterResult.eligibleRecipients.map((r) => r.student);
    }
    return records;
  }, [filterResult, records]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentList, setSentList] = useState<PersistentRecipient[]>([]);
  const [skippedList, setSkippedList] = useState<PersistentRecipient[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [completedCampaign, setCompletedCampaign] = useState<CampaignRecord | null>(null);

  // Turbo Mode & Status Confirmation state
  const [turboMode, setTurboMode] = useState(false);
  const [turboStatusModalVisible, setTurboStatusModalVisible] = useState(false);
  const [accessibilityModalVisible, setAccessibilityModalVisible] = useState(false);
  const waitingForReturn = useRef(false);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  // Card physics animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const currentStudent = activeRecords[currentIndex];
  const totalCount = activeRecords.length;

  const rotate = translateX.interpolate({
    inputRange: [-400, 0, 400],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  // Format phone number for WhatsApp link
  const formatPhoneForWhatsApp = (rawPhone: string) => {
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10) {
      digits = `91${digits}`;
    }
    return digits;
  };

  const handleOpenWhatsApp = async (phone: string, message: string) => {
    if (!phone) {
      Alert.alert('Missing Phone', 'This contact record does not have a phone number.');
      return;
    }
    const cleanPhone = formatPhoneForWhatsApp(phone);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (turboMode) {
      waitingForReturn.current = true;
    }

    try {
      await Linking.openURL(waUrl);
    } catch {
      waitingForReturn.current = false;
      Alert.alert(
        'WhatsApp Not Available',
        'Could not open WhatsApp. Please check if WhatsApp is installed on this device.'
      );
    }
  };

  const handleOpenSMS = async (phone: string, message: string) => {
    if (!phone) {
      Alert.alert('Missing Phone', 'This contact record does not have a phone number.');
      return;
    }
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const smsUrl = `sms:${cleanDigits}?body=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(smsUrl);
    } catch {
      Alert.alert('SMS Not Available', 'Could not launch native SMS application.');
    }
  };

  const finalizeCampaign = async (
    finalSent: PersistentRecipient[],
    finalSkipped: PersistentRecipient[]
  ) => {
    const allRecipients = [...finalSent, ...finalSkipped];
    const newCampId = `camp-${Date.now()}`;
    const title = fileInfo?.name
      ? `${fileInfo.name.replace(/\.[^/.]+$/, '')} (Personal WhatsApp)`
      : 'Personal WhatsApp Campaign';

    const campaignRecord: CampaignRecord = {
      id: newCampId,
      title,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalCount: activeRecords.length,
      confirmedSentCount: finalSent.length,
      skippedCount: finalSkipped.length,
      status: 'COMPLETED',
      method: 'link_mode',
      recipients: allRecipients,
    };

    await saveCampaignRecord(campaignRecord);
    setSavedCampaignId(newCampId);
    setCompletedCampaign(campaignRecord);
    setIsCompleted(true);

    // SECURE EPHEMERAL DATA MANDATE:
    // Student data is wiped from active memory and lives solely in Campaign History!
    clearDataset();
  };

  const advanceCard = (wasSent: boolean) => {
    if (isAnimating || !currentStudent) return;
    setIsAnimating(true);

    const { renderedText } = renderStudentMessage(templateText, currentStudent, [], mappingConfig);
    const recipientData: PersistentRecipient = {
      studentId: currentStudent.id,
      studentName: currentStudent.studentName,
      parentPhone: currentStudent.parentPhone || currentStudent.rawPhone,
      balance: currentStudent.outstandingBalance,
      renderedMessage: renderedText,
      status: wasSent ? 'CONFIRMED_SENT_BY_USER' : 'SKIPPED',
      timestamp: new Date().toISOString(),
    };

    const nextSent = wasSent ? [...sentList, recipientData] : sentList;
    const nextSkipped = !wasSent ? [...skippedList, recipientData] : skippedList;

    if (wasSent) setSentList(nextSent);
    else setSkippedList(nextSkipped);

    // Roll physical card to the left with dynamic tilt and fade
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -520,
        duration: 250,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalCount) {
        setIsAnimating(false);
        finalizeCampaign(nextSent, nextSkipped);
      } else {
        setCurrentIndex(nextIndex);
        // Prepare next card from the right and slide smoothly into center
        translateX.setValue(180);
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsAnimating(false);
        });
      }
    });
  };

  const advanceCardRef = useRef(advanceCard);
  advanceCardRef.current = advanceCard;

  // TURBO MODE LISTENER: Trigger confirmation popup when user returns from WhatsApp
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (waitingForReturn.current && turboMode) {
          waitingForReturn.current = false;
          // Pop up is ONLY visible if turbo mode is toggled on!
          setTurboStatusModalVisible(true);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [turboMode]);

  const handleTurboAction = (wasSent: boolean) => {
    setTurboStatusModalVisible(false);
    advanceCard(wasSent);
  };

  const handleTurboClose = () => {
    setTurboStatusModalVisible(false);
  };

  // If no records in store and not completed
  if (totalCount === 0 && !isCompleted) {
    return (
      <ScreenContainer safeTop={false} safeBottom={false}>
        <Header title="Send Personal WhatsApp" onBack={() => router.back()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={54} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Contacts Loaded</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Import a spreadsheet first to begin dispatching personal messages.
          </Text>
          <Button
            title="Import Spreadsheet"
            onPress={() => router.push('/workflow/import')}
            variant="primary"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScreenContainer>
    );
  }

  // CAMPAIGN COMPLETED SCREEN
  if (isCompleted) {
    const totalSent = sentList.length;
    const totalSkipped = skippedList.length;

    return (
      <ScreenContainer safeTop={false} safeBottom={false} scrollable>
        <Header title="Campaign Completed" />

        <View style={styles.completionContainer}>
          <View style={styles.trophyCircle}>
            <Ionicons name="checkmark-done" size={48} color="#059669" />
          </View>

          <Text style={[styles.completedHeading, { color: colors.textPrimary }]}>
            All Messages Dispatched!
          </Text>
          <Text style={[styles.completedSubheading, { color: colors.textSecondary }]}>
            Your WhatsApp personal messaging session has finished successfully.
          </Text>

          {/* Metrics Card */}
          <Card style={styles.statsCard}>
            <View style={styles.statMetricRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#059669' }]}>{totalSent}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sent</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textSecondary }]}>{totalSkipped}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Skipped</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{totalCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
            </View>
          </Card>

          {/* Ephemeral Privacy Notice */}
          <View style={[styles.privacyBox, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <Text style={[styles.privacyNoticeText, { color: isDark ? '#86EFAC' : '#065F46' }]}>
              Spreadsheet data has been cleared from active memory and is securely archived exclusively in your Campaign History.
            </Text>
          </View>

          <View style={styles.actionButtonGroup}>
            {completedCampaign && (
              <Button
                title="📊 Export Audit to Excel (.xlsx)"
                variant="secondary"
                size="lg"
                onPress={() => exportCampaignToExcel(completedCampaign)}
                style={{ width: '100%', marginBottom: spacing.sm, borderColor: '#10B981' }}
              />
            )}
            <Button
              title="View in Campaign History →"
              variant="primary"
              size="lg"
              onPress={() => router.replace('/(tabs)/campaigns')}
              style={{ width: '100%' }}
            />
            <Button
              title="Return to Home"
              variant="secondary"
              size="md"
              onPress={() => router.replace('/(tabs)')}
              style={{ width: '100%', marginTop: spacing.sm }}
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ACTIVE CARD DECK SCREEN
  const { renderedText } = renderStudentMessage(templateText, currentStudent, [], mappingConfig);
  const progressPercent = Math.round(((currentIndex + 1) / totalCount) * 100);
  const displayPhone = currentStudent.parentPhone || currentStudent.rawPhone || 'N/A';

  return (
    <ScreenContainer safeTop={false} safeBottom={false}>
      <Header
        title="WhatsApp Personal Sender"
        subtitle={`Card ${currentIndex + 1} of ${totalCount}`}
        onBack={() => router.back()}
      />

      {/* Progress Track & Turbo Mode Bar */}
      <View style={styles.progressBarWrapper}>
        <View style={styles.topUtilityRow}>
          <Pressable
            onPress={() => setTurboMode((prev) => !prev)}
            style={({ pressed }) => [
              styles.speedModeToggle,
              {
                backgroundColor: turboMode
                  ? (isDark ? '#064E3B' : '#ECFDF5')
                  : (isDark ? '#1E293B' : '#F1F5F9'),
                borderColor: turboMode ? '#10B981' : colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name={turboMode ? 'flash' : 'flash-outline'}
              size={14}
              color={turboMode ? '#10B981' : colors.textSecondary}
            />
            <Text
              style={[
                styles.speedModeToggleText,
                { color: turboMode ? (isDark ? '#34D399' : '#059669') : colors.textSecondary },
              ]}
            >
              Turbo Mode: {turboMode ? 'ON ⚡' : 'OFF'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAccessibilityModalVisible(true)}
            style={styles.speedInfoBtn}
            hitSlop={8}
          >
            <Ionicons name="help-circle-outline" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle, marginTop: 8 }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: '#059669' },
            ]}
          />
        </View>
        <View style={styles.progressCounterRow}>
          <Text style={[styles.progressMetaText, { color: colors.textSecondary }]}>
            Contact {currentIndex + 1} of {totalCount} ({progressPercent}%)
          </Text>
          <Text style={[styles.progressMetaText, { color: '#059669', fontWeight: typography.weights.bold }]}>
            {sentList.length} Sent • {skippedList.length} Skipped
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.deckScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* PHYSICAL CARD CONTAINER WITH ROLL ANIMATION */}
        <Animated.View
          style={[
            styles.animatedCardWrapper,
            {
              transform: [{ translateX }, { rotate }],
              opacity,
            },
          ]}
        >
          <Card
            style={[
              styles.physicalCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? colors.border : '#E2E8F0',
                shadowColor: '#000',
              },
            ]}
          >
            {/* Student Info Card Header */}
            <View style={styles.cardTopRow}>
              <View style={styles.studentInfoWrap}>
                <Text style={[styles.studentNameText, { color: colors.textPrimary }]}>
                  {currentStudent.studentName}
                </Text>
                <View style={styles.studentMetaRow}>
                  {currentStudent.class ? (
                    <Badge
                      label={`Class ${currentStudent.class}${currentStudent.section ? `-${currentStudent.section}` : ''}`}
                      variant="neutral"
                      size="sm"
                    />
                  ) : null}
                  <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
                    📱 {displayPhone}
                  </Text>
                </View>
              </View>

              {currentStudent.outstandingBalance !== undefined ? (
                <View
                  style={[
                    styles.balanceTag,
                    {
                      backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                      borderColor: isDark ? '#B45309' : '#FDE68A',
                    },
                  ]}
                >
                  <Text style={[styles.balanceLabel, { color: isDark ? '#FCD34D' : '#92400E' }]}>Due</Text>
                  <Text style={[styles.balanceValue, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                    ₹{currentStudent.outstandingBalance.toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Message Bubble Preview */}
            <View
              style={[
                styles.messageBubbleBox,
                {
                  backgroundColor: isDark ? '#064E3B' : '#E8F5E9',
                  borderColor: isDark ? '#059669' : '#C8E6C9',
                },
              ]}
            >
              <View style={styles.bubbleHeaderRow}>
                <Ionicons name="logo-whatsapp" size={16} color="#059669" />
                <Text style={[styles.bubbleHeaderTitle, { color: isDark ? '#A7F3D0' : '#2E7D32' }]}>
                  Message to Send
                </Text>
              </View>
              <Text
                style={[
                  styles.messageContentText,
                  { color: isDark ? '#ECFDF5' : '#1B5E20' },
                ]}
              >
                {renderedText}
              </Text>
            </View>

            {/* PRIMARY ACTION BUTTON: 1-CLICK SEND DIRECTLY IN WHATSAPP */}
            <Pressable
              onPress={() => handleOpenWhatsApp(displayPhone, renderedText)}
              style={({ pressed }) => [
                styles.openWhatsappBtn,
                pressed && styles.openWhatsappBtnPressed,
              ]}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
              <Text style={styles.openWhatsappText}>
                {turboMode ? '⚡ Send via WhatsApp (Turbo)' : 'Open in WhatsApp'}
              </Text>
            </Pressable>

            {/* ACTION BUTTON: SMS FALLBACK */}
            <Pressable
              onPress={() => handleOpenSMS(displayPhone, renderedText)}
              style={({ pressed }) => [
                styles.smsFallbackBtn,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : '#F0F9FF',
                  borderColor: isDark ? '#0284C7' : '#BAE6FD',
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color="#0284C7" />
              <Text style={[styles.smsFallbackText, { color: isDark ? '#38BDF8' : '#0369A1' }]}>
                Or Send via SMS Fallback
              </Text>
            </Pressable>

            {/* ACTION BUTTON 2: MARK SENT & ROLL CARD */}
            <View style={styles.decisionRow}>
              <Pressable
                onPress={() => advanceCard(false)}
                disabled={isAnimating}
                style={({ pressed }) => [
                  styles.skipBtn,
                  { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip</Text>
              </Pressable>

              <Pressable
                onPress={() => advanceCard(true)}
                disabled={isAnimating}
                style={({ pressed }) => [
                  styles.markSentBtn,
                  { backgroundColor: isDark ? '#4F46E5' : '#1E293B' },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.markSentText}>Mark Sent ✓</Text>
              </Pressable>
            </View>
          </Card>
        </Animated.View>

        {/* Visual Tip Box */}
        <View style={styles.tipBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.tipText, { color: colors.textTertiary }]}>
            Tip: Dispatch auto-filled this message with this recipient's exact details. Tap above to open WhatsApp and send in 1 click, then tap "Mark Sent ✓" to roll to the next card.
          </Text>
        </View>
      </ScrollView>

      {/* TURBO MODE RETURN CONFIRMATION POPUP (ONLY VISIBLE IF TURBO MODE IS ON) */}
      <Modal
        visible={turboStatusModalVisible && turboMode}
        transparent
        animationType="fade"
        onRequestClose={handleTurboClose}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.turboModalCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
              },
            ]}
          >
            {/* Header with Title and Close Button (✕) */}
            <View style={styles.turboModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.turboIconBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                  <Ionicons name="flash" size={16} color="#10B981" />
                </View>
                <Text style={[styles.turboModalTitle, { color: colors.textPrimary }]}>
                  Is message sent?
                </Text>
              </View>
              <Pressable
                onPress={handleTurboClose}
                hitSlop={12}
                style={[styles.turboCloseBtn, { backgroundColor: colors.surfaceSubtle }]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Recipient Details */}
            <View style={[styles.turboRecipientBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.turboRecipientName, { color: colors.textPrimary }]} numberOfLines={1}>
                {currentStudent?.studentName || 'Recipient'}
              </Text>
              <Text style={[styles.turboRecipientPhone, { color: colors.textSecondary }]}>
                📱 {displayPhone}
              </Text>
            </View>

            <Text style={[styles.turboPromptSubtext, { color: colors.textSecondary }]}>
              Confirm if you dispatched the WhatsApp message for this contact.
            </Text>

            {/* Actions: Skip vs Done */}
            <View style={styles.turboActionRow}>
              <Pressable
                onPress={() => handleTurboAction(false)}
                style={({ pressed }) => [
                  styles.turboSkipBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSubtle,
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                <Text style={[styles.turboSkipBtnText, { color: colors.textSecondary }]}>
                  Skip
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleTurboAction(true)}
                style={({ pressed }) => [
                  styles.turboDoneBtn,
                  { backgroundColor: isDark ? '#059669' : '#10B981' },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.turboDoneBtnText}>Done ✓</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ACCESSIBILITY & TURBO MODE GUIDE MODAL */}
      <Modal
        visible={accessibilityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccessibilityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={20} color="#10B981" />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Turbo & Speed Guide</Text>
              </View>
              <Pressable onPress={() => setAccessibilityModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <View style={styles.featureGuideRow}>
                <View style={styles.featureGuideNum}>
                  <Text style={styles.featureGuideNumText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureGuideHeading, { color: colors.textPrimary }]}>
                    Turbo Confirmation on Return
                  </Text>
                  <Text style={[styles.featureGuideDesc, { color: colors.textSecondary }]}>
                    When Turbo Mode is switched ON, Dispatch detects when you press Back in WhatsApp and immediately prompts "Is message sent?" with Done and Skip options.
                  </Text>
                </View>
              </View>

              <View style={styles.featureGuideRow}>
                <View style={styles.featureGuideNum}>
                  <Text style={styles.featureGuideNumText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureGuideHeading, { color: colors.textPrimary }]}>
                    Universal Document Attachment
                  </Text>
                  <Text style={[styles.featureGuideDesc, { color: colors.textSecondary }]}>
                    Attach any existing school circular, timetable, catalog, or brochure PDF directly from your device to share alongside your customized message.
                  </Text>
                </View>
              </View>

              <View style={styles.featureGuideRow}>
                <View style={styles.featureGuideNum}>
                  <Text style={styles.featureGuideNumText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureGuideHeading, { color: colors.textPrimary }]}>
                    100% Hands-Free Automation
                  </Text>
                  <Text style={[styles.featureGuideDesc, { color: colors.textSecondary }]}>
                    On Android, install any free Auto-Clicker app (e.g. "Auto Clicker" on Google Play). Place 1 tap target over WhatsApp's green send button. Dispatch opens WhatsApp → Auto-Clicker taps send → you press back → confirm Done to roll! 100+ contacts dispatched in under 2 minutes.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Button
              title="Got It!"
              onPress={() => setAccessibilityModalVisible(false)}
              variant="primary"
              size="md"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressBarWrapper: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMetaText: {
    fontSize: 11,
  },
  deckScroll: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  animatedCardWrapper: {
    width: '100%',
  },
  physicalCard: {
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  studentInfoWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  studentNameText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  studentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneText: {
    fontSize: 12,
  },
  balanceTag: {
    alignItems: 'flex-end',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  balanceLabel: {
    fontSize: 9,
    color: '#92400E',
    fontWeight: typography.weights.semibold,
  },
  balanceValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#B45309',
  },
  messageBubbleBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bubbleHeaderTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageContentText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  openWhatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: radii.md,
    gap: 8,
    marginBottom: spacing.sm,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  openWhatsappBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  openWhatsappText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  smsFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  smsFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 6,
  },
  skipBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  markSentBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: radii.md,
    gap: 6,
  },
  markSentText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tipText: {
    fontSize: 11,
    textAlign: 'center',
  },
  // Completion Styles
  completionContainer: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  trophyCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  completedHeading: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  completedSubheading: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  statsCard: {
    width: '100%',
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  statMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xl,
    width: '100%',
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
  },
  actionButtonGroup: {
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  topUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  speedModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  speedModeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  speedInfoBtn: {
    padding: 4,
  },
  attachedBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  attachedDocIconSmall: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedDocNameLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  attachedDocSizeLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  removeDocLinkText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  addDocPlaceholderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  addDocPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  textOnlyFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  textOnlyFallbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  turboModalCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    maxWidth: 360,
    width: '90%',
    alignSelf: 'center',
  },
  turboModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  turboIconBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turboModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  turboCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turboRecipientBox: {
    padding: 10,
    borderRadius: radii.md,
    marginVertical: spacing.sm,
  },
  turboRecipientName: {
    fontSize: 14,
    fontWeight: '700',
  },
  turboRecipientPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  turboPromptSubtext: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  turboActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  turboSkipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  turboSkipBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  turboDoneBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.lg,
  },
  turboDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  featureGuideRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
  },
  featureGuideNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureGuideNumText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  featureGuideHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureGuideDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
