import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, Header, ScreenContainer } from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';

export default function AppDocsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="App Documentation & Guide"
        subtitle="Complete manual for Excel bulk WhatsApp messaging"
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {/* Quick Intro */}
        <Card style={styles.card}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Mastering Dispatch
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, marginTop: 4 }]}>
            Dispatch turns any Excel or CSV spreadsheet into personalized WhatsApp messages. Dispatch auto-fills each recipient's personal data into custom templates — ready for you to review and send in 1 click with zero manual typing and zero spam bans.
          </Text>
        </Card>

        {/* Guide 1: Spreadsheet Preparation */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          1. Spreadsheet Best Practices
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.subTitle, { color: colors.textPrimary }]}>
            A. Column Headers in Row 1
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • Ensure your column names are placed in the very first row of your spreadsheet.
            {'\n'}• Supported file formats: <Text style={{ fontWeight: '700' }}>.xlsx, .xls, and .csv</Text>.
            {'\n'}• If your workbook has multiple sheets, Dispatch automatically lets you select the desired tab.
          </Text>

          <Text style={[styles.subTitle, { color: colors.textPrimary, marginTop: 12 }]}>
            B. Mobile Number Formatting
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • Indian 10-digit mobile numbers (e.g. 9876543210) are automatically formatted with +91.
            {'\n'}• Numbers with spaces, dashes, or parentheses (e.g. +91 98765-43210) are sanitized automatically.
            {'\n'}• Landlines or invalid numbers are flagged in the recipient inspector before sending.
          </Text>
        </Card>

        {/* Guide 2: Personalization & Token Compiler */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          2. Variable Tokens & Auto-Matching
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Every column header in your spreadsheet becomes an instantly usable variable token enclosed in double curly braces:
          </Text>

          <View style={[styles.codeBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
            <Text style={[styles.codeText, { color: isDark ? '#34D399' : '#059669' }]}>
              Hello &#123;&#123;Name&#125;&#125;, pending fee is ₹&#123;&#123;25-26 Bal&#125;&#125;. Route: &#123;&#123;Bus No&#125;&#125;.
            </Text>
          </View>

          <Text style={[styles.subTitle, { color: colors.textPrimary, marginTop: 12 }]}>
            Smart Auto-Match Feature
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            • Tap the <Text style={{ fontWeight: '700' }}>&quot;Auto-Match To My Columns&quot;</Text> button in the Message Studio to automatically align generic template tokens (like &#123;&#123;Balance&#125;&#125; or &#123;&#123;Class&#125;&#125;) to your sheet&apos;s specific column headers (e.g. &#123;&#123;25-26 Bal&#125;&#125; or &#123;&#123;C&#125;&#125;).
            {'\n'}• Fallback values are supported: &#123;&#123;Remarks | default: &apos;None&apos;&#125;&#125;.
          </Text>
        </Card>

        {/* Guide 3: Sending Methods Comparison */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          3. Choosing Your Sending Method
        </Text>
        <Card style={styles.card}>
          <View style={styles.methodRow}>
            <View style={[styles.methodBadgeBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                Method A: Personal Sender Mode (100% Free & Ban-Safe)
              </Text>
              <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                Generates each contact's custom message with their respective data. Presents an interactive swipeable card roll. Opens native WhatsApp with recipient and text prefilled so 1 tap sends each. 100% ban-safe, zero setup, zero Meta fees.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.methodRow}>
            <View style={[styles.methodBadgeBox, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
              <Ionicons name="flash" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                Method B: Official Meta Business API (1-Click Bulk)
              </Text>
              <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                Dispatches high-volume batches in 1 click through the official WhatsApp Business Platform (Meta Graph API v21.0). Requires a free Meta Developer Account.
              </Text>
            </View>
          </View>
        </Card>

        {/* Guide 4: Meta WhatsApp API Setup Guide */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          4. How to Get WhatsApp API Credentials
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Follow these 3 simple steps on your computer:
          </Text>
          <View style={styles.stepItem}>
            <Text style={[styles.stepNum, { color: colors.primary }]}>Step 1</Text>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Visit <Text style={{ fontWeight: '700', color: colors.textPrimary }}>developers.facebook.com</Text> and create a free App under &quot;Business&quot; type.
            </Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={[styles.stepNum, { color: colors.primary }]}>Step 2</Text>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Add the <Text style={{ fontWeight: '700', color: colors.textPrimary }}>WhatsApp</Text> product. Meta provides a free Test Phone Number ID and temporary access token.
            </Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={[styles.stepNum, { color: colors.primary }]}>Step 3</Text>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Enter your <Text style={{ fontWeight: '700' }}>Phone Number ID</Text> and <Text style={{ fontWeight: '700' }}>Access Token</Text> into Dispatch. Test the connection with 1 click, then start bulk dispatching!
            </Text>
          </View>

          <Pressable
            onPress={() => Linking.openURL('https://developers.facebook.com/docs/whatsapp/cloud-api/get-started')}
            style={styles.docsLinkRow}
          >
            <Ionicons name="open-outline" size={16} color={colors.primary} />
            <Text style={[styles.docsLinkText, { color: colors.primary }]}>
              Official Meta Cloud API Documentation ↗
            </Text>
          </Pressable>
        </Card>

        {/* Developer Assistance */}
        <Card style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="help-circle" size={24} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.subTitle, { color: colors.textPrimary }]}>
                Need Help Setting Up?
              </Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                Developer Saketh Goljana is available to help you configure Excel formulas or WhatsApp Business API credentials.
              </Text>
            </View>
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
  heroTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
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
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  codeBox: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  methodBadgeBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  methodDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '800',
    width: 44,
  },
  stepText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  docsLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  docsLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
