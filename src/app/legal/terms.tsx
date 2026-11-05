import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, Header, ScreenContainer } from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Terms of Service"
        subtitle="Last Updated: October 12, 2026 • Acceptable Use Policy"
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {/* Anti-Spam Agreement Banner */}
        <Card style={styles.card}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIconBox, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
              <Ionicons name="document-text" size={24} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Fair & Lawful Messaging
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Dispatch is a productivity software utility. By using this app, you agree to comply with WhatsApp terms and all anti-spam regulations.
              </Text>
            </View>
          </View>
        </Card>

        {/* Section 1: Agreement */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          1. Acceptance of Terms
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            By installing, accessing, or using Dispatch, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
          </Text>
        </Card>

        {/* Section 2: Permitted Use & Anti-Spam */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          2. Permitted Use & Anti-Spam Policy
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Recipient Consent:</Text> You affirm that you possess prior lawful consent or an existing commercial/educational relationship with all contacts contained in your imported spreadsheets.
            {'\n'}• <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Strict Anti-Spam Prohibition:</Text> You agree NOT to use Dispatch for unsolicited marketing, phishing, harassment, distribution of fraudulent schemes, or sending messages to purchased phone lists.
            {'\n'}• <Text style={{ fontWeight: '700', color: colors.textPrimary }}>WhatsApp Terms of Service:</Text> You agree to adhere strictly to WhatsApp&apos;s Terms of Service and WhatsApp Business Messaging Policies. Any account penalties or phone number bans imposed by WhatsApp due to spamming are the sole responsibility of the user.
          </Text>
        </Card>

        {/* Section 3: User Data Ownership */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          3. Ownership of Data
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            You retain 100% ownership and intellectual property rights over all spreadsheets, contact numbers, personalized message text, and customer records processed through Dispatch. The developer does not claim any ownership over your content.
          </Text>
        </Card>

        {/* Section 4: Limitation of Liability */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          4. Disclaimers & Limitation of Liability
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • Dispatch is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind.
            {'\n'}• The developer (<Text style={{ fontWeight: '700', color: colors.textPrimary }}>Saketh Goljana</Text>) shall not be held liable for any indirect, incidental, special, or consequential damages resulting from message delivery delays, Meta API service interruptions, carrier network faults, or account bans resulting from user misuse.
          </Text>
        </Card>

        {/* Section 5: Governing Law & Contact */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          5. Contact Information
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            For legal inquiries, intellectual property concerns, or licensing requests:
          </Text>
          <View style={styles.contactCard}>
            <Text style={[styles.contactName, { color: colors.textPrimary }]}>
              Saketh Goljana
            </Text>
            <Text style={[styles.contactRole, { color: colors.textSecondary }]}>
              Creator & Developer of Dispatch
            </Text>
            <Pressable
              onPress={() => Linking.openURL('mailto:sakethgoljana098@gmail.com')}
              style={styles.contactRow}
            >
              <Ionicons name="mail" size={16} color={colors.primary} />
              <Text style={[styles.contactLink, { color: colors.primary }]}>
                sakethgoljana098@gmail.com
              </Text>
            </Pressable>
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
  },
  card: {
    padding: spacing.cardPadding,
    marginBottom: spacing.base,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  heroSub: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: typography.sizes.xs,
    lineHeight: 20,
  },
  contactCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(150,150,150,0.06)',
    gap: 4,
  },
  contactName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  contactRole: {
    fontSize: 11,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contactLink: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
