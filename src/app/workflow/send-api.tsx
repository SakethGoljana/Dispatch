import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
} from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { renderStudentMessage } from '../../core/template/templateCompiler';
import {
  CampaignRecord,
  PersistentRecipient,
  saveCampaignRecord,
} from '../../core/campaign/campaignStorage';
import {
  getStoredMetaCredentials,
  saveStoredMetaCredentials,
  sendMetaTextMessage,
  testMetaConnection,
} from '../../core/whatsapp/metaClient';

type ApiStep = 'CONFIG' | 'PREVIEW' | 'DISPATCHING' | 'COMPLETED';

export default function SendApiScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { records, templateText, mappingConfig, fileInfo, clearDataset } = useDataset();

  const [step, setStep] = useState<ApiStep>('CONFIG');

  // Credentials State
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    name?: string;
    number?: string;
    error?: string;
  } | null>(null);

  // Dispatch State
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [dispatchedCount, setDispatchedCount] = useState(0);
  const [dispatchedRecipients, setDispatchedRecipients] = useState<PersistentRecipient[]>([]);
  const [liveLog, setLiveLog] = useState<string[]>([]);

  const totalCount = records.length;
  const totalBalanceDue = records.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0);

  // Load stored credentials on mount
  useEffect(() => {
    getStoredMetaCredentials().then((creds) => {
      if (creds) {
        setPhoneNumberId(creds.phoneNumberId);
        setAccessToken(creds.accessToken);
        if (creds.verifiedName) {
          setTestResult({
            success: true,
            name: creds.verifiedName,
            number: creds.verifiedNumber,
          });
        }
        // If credentials already exist and are populated, default to preview step
        if (creds.phoneNumberId && creds.accessToken) {
          setStep('PREVIEW');
        }
      }
    });
  }, []);

  // Handle testing connection with Meta Graph API
  const handleTestConnection = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      Alert.alert('Required', 'Please enter both Phone Number ID and Access Token.');
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    const res = await testMetaConnection(phoneNumberId, accessToken);
    setIsTestingConnection(false);

    if (res.success) {
      setTestResult({
        success: true,
        name: res.verifiedName,
        number: res.displayNumber,
      });
      // Save valid credentials
      await saveStoredMetaCredentials({
        phoneNumberId: phoneNumberId.trim(),
        accessToken: accessToken.trim(),
        verifiedName: res.verifiedName,
        verifiedNumber: res.displayNumber,
      });
    } else {
      setTestResult({
        success: false,
        error: res.error,
      });
    }
  };

  const handleProceedToPreview = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      Alert.alert('Required', 'Please enter your Meta Phone Number ID and Access Token.');
      return;
    }

    // Save credentials to local storage
    await saveStoredMetaCredentials({
      phoneNumberId: phoneNumberId.trim(),
      accessToken: accessToken.trim(),
      verifiedName: testResult?.name,
      verifiedNumber: testResult?.number,
    });

    setStep('PREVIEW');
  };

  // Execute real bulk batch dispatch via Meta Graph API
  const handleStartDispatch = async () => {
    setIsConfirmModalVisible(false);
    setStep('DISPATCHING');
    setDispatchedCount(0);
    setLiveLog([]);

    const results: PersistentRecipient[] = [];

    for (let i = 0; i < records.length; i++) {
      const student = records[i];
      const { renderedText } = renderStudentMessage(templateText, student, [], mappingConfig);
      const studentPhone = student.parentPhone || student.rawPhone;

      // Real HTTP call to Meta Cloud API
      const sendRes = await sendMetaTextMessage(
        phoneNumberId,
        accessToken,
        studentPhone,
        renderedText
      );

      const recipient: PersistentRecipient = {
        studentId: student.id,
        studentName: student.studentName,
        parentPhone: studentPhone,
        balance: student.outstandingBalance,
        renderedMessage: renderedText,
        status: sendRes.success ? 'API_SENT' : 'API_FAILED',
        providerMessageId: sendRes.messageId || '',
        timestamp: new Date().toISOString(),
      };

      results.push(recipient);
      setDispatchedCount(i + 1);

      // Add to live log
      const logEntry = sendRes.success
        ? `✓ ${student.studentName} → Sent (${sendRes.messageId?.slice(-8)})`
        : `⚠ ${student.studentName} → ${sendRes.error}`;
      setLiveLog((prev) => [logEntry, ...prev.slice(0, 4)]);

      // Gentle pause to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setDispatchedRecipients(results);

    // Save to Campaign History
    const campId = `camp-api-${Date.now()}`;
    const title = fileInfo?.name
      ? `${fileInfo.name.replace(/\.[^/.]+$/, '')} (Cloud API)`
      : 'WhatsApp Business API Campaign';

    const sentCount = results.filter((r) => r.status === 'API_SENT').length;
    const failedCount = results.filter((r) => r.status === 'API_FAILED').length;

    const campaignRecord: CampaignRecord = {
      id: campId,
      title,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalCount: records.length,
      confirmedSentCount: sentCount,
      skippedCount: failedCount,
      status: 'COMPLETED',
      method: 'official_api',
      recipients: results,
    };

    await saveCampaignRecord(campaignRecord);
    setStep('COMPLETED');

    // EPHEMERAL DATA MANDATE:
    // Raw student data is wiped from active memory and lives exclusively in History!
    clearDataset();
  };

  // If no records loaded and not completed
  if (totalCount === 0 && step !== 'COMPLETED') {
    return (
      <ScreenContainer safeTop={false} safeBottom={false}>
        <Header title="WhatsApp Cloud API" onBack={() => router.back()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={54} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Contacts Loaded</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Import a spreadsheet first to begin Cloud API dispatch.
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

  // -------------------------------------------------------------
  // STEP 4: CAMPAIGN COMPLETED
  // -------------------------------------------------------------
  if (step === 'COMPLETED') {
    const sentCount = dispatchedRecipients.filter((r) => r.status === 'API_SENT').length;
    const failedCount = dispatchedRecipients.filter((r) => r.status === 'API_FAILED').length;

    return (
      <ScreenContainer safeTop={false} safeBottom={false} scrollable>
        <Header title="API Campaign Completed" />

        <View style={styles.completionContainer}>
          <View style={styles.cloudSuccessCircle}>
            <Ionicons name="cloud-done" size={48} color={colors.primary} />
          </View>

          <Text style={[styles.completedHeading, { color: colors.textPrimary }]}>
            Batch Dispatched via Meta API!
          </Text>
          <Text style={[styles.completedSubheading, { color: colors.textSecondary }]}>
            All messages have been submitted directly to Meta's WhatsApp Cloud servers.
          </Text>

          {/* Metrics Card */}
          <Card style={styles.statsCard}>
            <View style={styles.statMetricRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#059669' }]}>{sentCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Delivered</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: failedCount > 0 ? colors.error : colors.textSecondary }]}>
                  {failedCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Failed / Skipped</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {dispatchedRecipients.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
            </View>
          </Card>

          {/* Privacy Box */}
          <View style={[styles.privacyBox, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.privacyNoticeText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
              Spreadsheet data has been wiped from active memory and is securely archived exclusively in your Campaign History.
            </Text>
          </View>

          <View style={styles.actionButtonGroup}>
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

  // -------------------------------------------------------------
  // STEP 3: DISPATCHING IN PROGRESS
  // -------------------------------------------------------------
  if (step === 'DISPATCHING') {
    const progressPercent = Math.round((dispatchedCount / totalCount) * 100);

    return (
      <ScreenContainer safeTop={false} safeBottom={false}>
        <Header title="Dispatching via Meta API..." />
        <View style={styles.dispatchingContainer}>
          <View style={styles.pulseIconWrap}>
            <Ionicons name="paper-plane" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.dispatchingHeading, { color: colors.textPrimary }]}>
            Sending Messages to WhatsApp...
          </Text>
          <Text style={[styles.dispatchingSub, { color: colors.textSecondary }]}>
            {dispatchedCount} of {totalCount} completed ({progressPercent}%)
          </Text>

          <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>

          {/* Live Activity Feed */}
          <Card style={styles.logCard}>
            <Text style={[styles.logTitle, { color: colors.textSecondary }]}>Live Activity:</Text>
            {liveLog.map((log, idx) => (
              <Text key={idx} style={[styles.logText, { color: colors.textPrimary }]}>
                {log}
              </Text>
            ))}
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  const handleUseSandbox = async () => {
    const sandboxId = 'SANDBOX_TEST_9059478739';
    const sandboxToken = 'EAAG_SANDBOX_DEMO_TOKEN';
    setPhoneNumberId(sandboxId);
    setAccessToken(sandboxToken);
    setTestResult({
      success: true,
      name: 'Dispatch Meta Cloud Sandbox',
      number: '+91 90594 78739 (Test Mode)',
    });
    await saveStoredMetaCredentials({
      phoneNumberId: sandboxId,
      accessToken: sandboxToken,
      verifiedName: 'Dispatch Meta Cloud Sandbox',
      verifiedNumber: '+91 90594 78739 (Test Mode)',
    });
  };

  // -------------------------------------------------------------
  // STEP 1: CREDENTIALS SETUP SCREEN
  // -------------------------------------------------------------
  if (step === 'CONFIG') {
    return (
      <ScreenContainer scrollable safeTop={false} safeBottom={false}>
        <Header
          title="Meta WhatsApp API Setup"
          subtitle="Self-Service • Enter your Meta Cloud API credentials"
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          {/* Quick Sandbox Banner for users without Facebook / 2nd number */}
          <Button
            title="⚡ Use Instant Test Sandbox (No Facebook Account Needed)"
            variant="secondary"
            size="md"
            onPress={handleUseSandbox}
            icon={<Ionicons name="flash-outline" size={18} color={colors.primary} />}
          />

          {/* Guide Card */}
          <Card
            style={[
              styles.guideCard,
              { backgroundColor: isDark ? '#1E293B' : '#EEF2FF', borderColor: colors.primaryBorder },
            ]}
          >
            <View style={styles.guideHeader}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
                How to get your free Meta credentials:
              </Text>
            </View>
            <Text style={[styles.guideBody, { color: colors.textSecondary }]}>
              1. Open <Text style={styles.boldText}>developers.facebook.com</Text> and select your WhatsApp App.{'\n'}
              2. Go to <Text style={styles.boldText}>WhatsApp → API Setup</Text>.{'\n'}
              3. Copy your <Text style={styles.boldText}>Phone Number ID</Text> and <Text style={styles.boldText}>Access Token</Text> below.{'\n'}
              <Text style={{ fontStyle: 'italic', marginTop: 4 }}>Don't have a Facebook account yet? Tap the Sandbox button above to test right now!</Text>
            </Text>
          </Card>

          {/* Credentials Form */}
          <Card style={styles.formCard}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Meta Phone Number ID *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. 104829104820194"
              placeholderTextColor={colors.textTertiary}
              value={phoneNumberId}
              onChangeText={setPhoneNumberId}
              keyboardType="numeric"
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              WhatsApp Access Token (Permanent or Test) *
            </Text>
            <View style={styles.tokenInputWrap}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Bearer token (starts with EAAG...)"
                placeholderTextColor={colors.textTertiary}
                value={accessToken}
                onChangeText={setAccessToken}
                secureTextEntry={!showToken}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowToken(!showToken)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showToken ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Test Connection Button */}
            <Button
              title={isTestingConnection ? 'Testing with Meta...' : 'Test Connection with Meta'}
              variant="outline"
              size="md"
              loading={isTestingConnection}
              onPress={handleTestConnection}
              icon={<Ionicons name="pulse-outline" size={16} color={colors.primary} />}
              style={styles.testBtn}
            />

            {/* Test Result Feedback Banner */}
            {testResult && (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: testResult.success
                      ? isDark ? '#064E3B' : '#ECFDF5'
                      : isDark ? '#450A0A' : '#FEF2F2',
                    borderColor: testResult.success ? '#059669' : '#DC2626',
                  },
                ]}
              >
                <Ionicons
                  name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={testResult.success ? '#059669' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    { color: testResult.success ? (isDark ? '#A7F3D0' : '#065F46') : (isDark ? '#FCA5A5' : '#991B1B') },
                  ]}
                >
                  {testResult.success
                    ? `Connected! Account: ${testResult.name} (${testResult.number})`
                    : `Meta Error: ${testResult.error}`}
                </Text>
              </View>
            )}
          </Card>

          {/* Continue Action */}
          <Button
            title="Continue to Preview & Dispatch →"
            variant="primary"
            size="lg"
            onPress={handleProceedToPreview}
            style={styles.proceedBtn}
          />
        </View>
      </ScreenContainer>
    );
  }

  // -------------------------------------------------------------
  // STEP 2: PREVIEW & 1-CLICK DISPATCH STATION
  // -------------------------------------------------------------
  const sampleStudent = records[0];
  const sampleRendered = sampleStudent
    ? renderStudentMessage(templateText, sampleStudent, [], mappingConfig).renderedText
    : '';

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="WhatsApp Business API"
        subtitle="Review batch & dispatch in one single click"
        onBack={() => setStep('CONFIG')}
      />

      <View style={styles.body}>
        {/* Connected Account Bar */}
        <Card
          style={[
            styles.connectedBar,
            { backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderColor: '#A7F3D0' },
          ]}
        >
          <View style={styles.connectedRow}>
            <View style={styles.checkCircleSmall}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.connectedTitle, { color: colors.textPrimary }]}>
                {testResult?.name || 'Meta WhatsApp Account'}
              </Text>
              <Text style={[styles.connectedSubtitle, { color: colors.textSecondary }]}>
                ID: {phoneNumberId.slice(0, 5)}...{phoneNumberId.slice(-4)} • Connected
              </Text>
            </View>
            <Pressable onPress={() => setStep('CONFIG')} style={styles.editCredsBtn} hitSlop={8}>
              <Text style={[styles.editCredsText, { color: colors.primary }]}>Change</Text>
            </Pressable>
          </View>
        </Card>

        {/* Batch Summary */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Batch Summary</Text>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Eligible Recipients</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {totalCount} Contacts
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Balance Due</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                ₹{totalBalanceDue.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Dispatch Mode</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                1-Click API
              </Text>
            </View>
          </View>
        </Card>

        {/* Sample Message Preview */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Sample Message Preview ({sampleStudent?.studentName || 'Recipient'})
        </Text>
        <Card
          style={[
            styles.previewCard,
            { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.borderSubtle },
          ]}
        >
          <Text style={[styles.previewText, { color: colors.textPrimary }]}>
            {sampleRendered}
          </Text>
        </Card>

        {/* 1-CLICK DISPATCH BUTTON */}
        <Button
          title="Dispatch Campaign via WhatsApp API 🚀"
          variant="primary"
          size="lg"
          onPress={() => setIsConfirmModalVisible(true)}
          style={styles.dispatchBtn}
        />
      </View>

      {/* CONFIRMATION SAFETY MODAL */}
      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.confirmIconWrap}>
              <Ionicons name="paper-plane" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>
              Confirm Bulk Dispatch
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              You are about to send {totalCount} personalized WhatsApp messages through your Meta Business Account in one single click.
            </Text>

            <View style={styles.confirmButtonRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setIsConfirmModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Start 1-Click Send 🚀"
                variant="primary"
                size="md"
                onPress={handleStartDispatch}
                style={{ flex: 1 }}
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
    gap: spacing.base,
  },
  guideCard: {
    padding: spacing.base,
    borderWidth: 1,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  guideTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  guideBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: typography.weights.bold,
  },
  formCard: {
    padding: spacing.base,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  tokenInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  testBtn: {
    marginTop: spacing.xs,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  feedbackText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  proceedBtn: {
    marginTop: spacing.xs,
  },
  // Preview Screen Styles
  connectedBar: {
    padding: spacing.sm,
    borderWidth: 1,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircleSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  connectedSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  editCredsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editCredsText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryCard: {
    padding: spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryCol: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  previewCard: {
    padding: spacing.base,
    borderWidth: 1,
  },
  previewText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  dispatchBtn: {
    marginTop: spacing.md,
  },
  // Dispatching Screen Styles
  dispatchingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  pulseIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dispatchingHeading: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  dispatchingSub: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.lg,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  logCard: {
    width: '100%',
    padding: spacing.base,
  },
  logTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  logText: {
    fontSize: 11,
    lineHeight: 18,
  },
  // Completion Screen Styles
  completionContainer: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  cloudSuccessCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EEF2FF',
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
  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
});
