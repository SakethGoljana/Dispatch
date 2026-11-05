import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, Header, ScreenContainer } from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Privacy Policy"
        subtitle="Last Updated: October 12, 2026 • Effective Worldwide"
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {/* Executive Transparency Card */}
        <Card style={styles.card}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIconBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={26} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Zero-Knowledge Privacy
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Dispatch is architected with strict client-side ephemeral processing. Your spreadsheets never leave your device.
              </Text>
            </View>
          </View>
        </Card>

        {/* Section 1: Overview */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          1. Introduction & Overview
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Welcome to <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Dispatch</Text> (&quot;the App&quot;), created and maintained by independent developer <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Saketh Goljana</Text> (&quot;Developer&quot;, &quot;we&quot;, &quot;our&quot;).
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, marginTop: 8 }]}>
            We believe you should have complete control over your data. This Privacy Policy outlines how Dispatch handles spreadsheet records, contact information, and messaging credentials.
          </Text>
        </Card>

        {/* Section 2: Data Collection & Processing */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          2. Information We Process
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.subTitle, { color: colors.textPrimary }]}>
            A. Ephemeral Spreadsheet Data
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • When you import an Excel (.xlsx, .xls) or CSV file, the parsing occurs entirely within local volatile RAM memory on your smartphone.
            {'\n'}• We do not operate proprietary tracking servers or cloud databases that ingest your contacts, names, grades, or outstanding balances.
            {'\n'}• When a campaign ends or when you tap &quot;Clear Dataset&quot;, active records are purged from RAM immediately.
          </Text>

          <Text style={[styles.subTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            B. WhatsApp API Credentials
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • If you utilize Method B (Official WhatsApp Business API), your Meta System User Access Token and Phone Number ID are stored strictly on your local device using Android SharedPreferences / Encrypted Device Storage.
            {'\n'}• HTTP requests to the Meta Graph API are dispatched directly from your phone to Meta&apos;s verified endpoints (&quot;graph.facebook.com&quot;) via TLS encryption. No third-party proxy intercepts your keys.
          </Text>

          <Text style={[styles.subTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            C. Local Campaign History
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • Sent and skipped campaign records are persisted exclusively in offline local app storage so you can review delivery statistics and audit past runs. You can wipe this at any time in Settings.
          </Text>
        </Card>

        {/* Section 3: Device Permissions */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          3. Device Permissions
        </Text>
        <Card style={styles.card}>
          <View style={styles.permissionItem}>
            <Ionicons name="folder-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.permTitle, { color: colors.textPrimary }]}>
                File & Storage Access (SAF Document Picker)
              </Text>
              <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
                Used exclusively to let you choose an Excel or CSV file to import. Dispatch only reads files you explicitly select.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.permissionItem}>
            <Ionicons name="wifi-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.permTitle, { color: colors.textPrimary }]}>
                Internet Connectivity
              </Text>
              <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
                Required solely when you choose to dispatch messages via Meta Graph Cloud API or open external WhatsApp links.
              </Text>
            </View>
          </View>
        </Card>

        {/* Section 4: Third-Party Services */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          4. Third-Party Integrations
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>WhatsApp / Meta Platforms Inc.:</Text> When you trigger a WhatsApp Personal link, the app invokes the official WhatsApp application installed on your device. When you use the WhatsApp Business API, data is transmitted directly to Meta under their Business Terms of Service.
            {'\n'}• <Text style={{ fontWeight: '700', color: colors.textPrimary }}>No Analytics Trackers:</Text> Dispatch does not embed Google AdMob, Facebook Pixel, or tracking SDKs.
          </Text>
        </Card>

        {/* Section 5: Children's Privacy */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          5. Children&apos;s Online Privacy (COPPA / GDPR)
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Dispatch is intended for school administrators, educators, business owners, and account managers. We do not knowingly collect or solicit personal information from children under 13. Any student or client information contained in your spreadsheets remains strictly on your device.
          </Text>
        </Card>

        {/* Section 6: Data Controller & Contact */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          6. Developer & Contact Information
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            For inquiries, data questions, or privacy feedback, please contact the developer directly:
          </Text>

          <View style={styles.contactCard}>
            <Text style={[styles.contactName, { color: colors.textPrimary }]}>
              Saketh Goljana
            </Text>
            <Text style={[styles.contactRole, { color: isDark ? '#34D399' : '#059669' }]}>
              Independent Software Engineer & Creator of Dispatch
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

            <Pressable
              onPress={() => Linking.openURL('https://sakethgoljana.tech')}
              style={styles.contactRow}
            >
              <Ionicons name="globe-outline" size={16} color={colors.primary} />
              <Text style={[styles.contactLink, { color: colors.primary }]}>
                sakethgoljana.tech
              </Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://www.linkedin.com/in/saketh-goljana/')}
              style={styles.contactRow}
            >
              <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
              <Text style={[styles.contactLink, { color: colors.primary }]}>
                linkedin.com/in/saketh-goljana
              </Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://github.com/SakethGoljana')}
              style={styles.contactRow}
            >
              <Ionicons name="logo-github" size={16} color={colors.textPrimary} />
              <Text style={[styles.contactLink, { color: colors.primary }]}>
                github.com/SakethGoljana
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
  subTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: typography.sizes.xs,
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  permTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  permDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  contactCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(150,150,150,0.06)',
    gap: 6,
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
