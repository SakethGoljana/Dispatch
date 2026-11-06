import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  ExpandableFAQ,
  Header,
  ScreenContainer,
  TextInput,
} from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';
import {
  clearStoredMetaCredentials,
  getStoredMetaCredentials,
  MetaCredentials,
} from '../../core/whatsapp/metaClient';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, themePreference, setThemePreference } = useTheme();
  const [countryCode, setCountryCode] = useState('+91');
  const [organizationName, setOrganizationName] = useState('My Organization / Business');
  const [metaCreds, setMetaCreds] = useState<MetaCredentials | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    getStoredMetaCredentials().then(setMetaCreds);
  }, []);

  const handleClearMeta = async () => {
    await clearStoredMetaCredentials();
    setMetaCreds(null);
  };

  const handleCheckForUpdates = async () => {
    try {
      setCheckingUpdates(true);
      if (__DEV__ || !Updates.isEnabled) {
        Alert.alert(
          'Over-The-Air Updates',
          'Live cloud updates are active in release APK builds. In development mode, changes reload via Metro directly.'
        );
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new live update was found. Downloading now...',
          [
            {
              text: 'Download & Apply',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                Alert.alert(
                  'Update Ready',
                  'The new update has been downloaded! Tap restart to load it now.',
                  [
                    {
                      text: 'Restart App',
                      onPress: async () => {
                        await Updates.reloadAsync();
                      },
                    },
                  ]
                );
              },
            },
          ]
        );
      } else {
        Alert.alert('Up to Date', 'You are running the latest version of Dispatch.');
      }
    } catch (err: any) {
      Alert.alert('Update Check Failed', err?.message || 'Unable to contact update server.');
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Settings & Configuration"
        subtitle="Manage messaging modes, theme preferences, and profile settings"
      />

      <View style={styles.body}>
        {/* Appearance & Theme Mode */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Appearance & Theme
        </Text>
        <Card style={styles.card}>
          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as const).map((pref) => {
              const active = themePreference === pref;
              return (
                <Pressable
                  key={pref}
                  onPress={() => setThemePreference(pref)}
                  style={[
                    styles.themePill,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      pref === 'light'
                        ? 'sunny-outline'
                        : pref === 'dark'
                        ? 'moon-outline'
                        : 'phone-portrait-outline'
                    }
                    size={16}
                    color={active ? colors.textInverse : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.themePillText,
                      { color: active ? colors.textInverse : colors.textPrimary },
                    ]}
                  >
                    {pref === 'system' ? 'System' : pref === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* WhatsApp Business Cloud API Self-Service Credentials */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          WhatsApp Official Business API
        </Text>
        <Card style={styles.card}>
          <View style={styles.adapterItem}>
            <View style={styles.adapterHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.adapterTitle, { color: colors.textPrimary }]}>
                  Meta Cloud API Connection
                </Text>
                <Text style={[styles.adapterSub, { color: colors.textSecondary }]}>
                  {metaCreds
                    ? `Connected: ${metaCreds.verifiedName || metaCreds.phoneNumberId}`
                    : 'No Meta credentials saved on this device'}
                </Text>
              </View>
              <Badge
                label={metaCreds ? 'Configured ✓' : 'Not Set'}
                variant={metaCreds ? 'success' : 'neutral'}
                size="sm"
              />
            </View>

            <View style={styles.metaActionsRow}>
              <Button
                title={metaCreds ? 'Update Meta Credentials' : 'Configure Meta Credentials'}
                variant="outline"
                size="sm"
                onPress={() => router.push('/workflow/send-api')}
                icon={<Ionicons name="key-outline" size={14} color={colors.primary} />}
              />
              {metaCreds && (
                <Button
                  title="Clear"
                  variant="secondary"
                  size="sm"
                  onPress={handleClearMeta}
                />
              )}
            </View>
          </View>
        </Card>

        {/* Business / Organization Profile */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Business / Organization Profile
        </Text>
        <Card style={styles.card}>
          <TextInput
            label="Organization / Business Name"
            value={organizationName}
            onChangeText={setOrganizationName}
            placeholder="Enter organization or business name"
          />
          <TextInput
            label="Default International Country Code"
            value={countryCode}
            onChangeText={setCountryCode}
            placeholder="+91"
            helperText="Applied automatically to 10-digit Indian numbers without country code."
          />
        </Card>

        {/* Messaging Adapters Overview */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Sending Adapters Overview
        </Text>
        <Card style={styles.card}>
          <View style={styles.adapterItem}>
            <View style={styles.adapterHeader}>
              <Text style={[styles.adapterTitle, { color: colors.textPrimary }]}>
                Method A — WhatsApp Personal (Link Mode)
              </Text>
              <Badge label="Active / Free" variant="success" size="sm" />
            </View>
            <Text style={[styles.adapterDescription, { color: colors.textSecondary }]}>
              Generates personalized click-to-chat links. Opens WhatsApp with text prefilled, rolls cards physically on tap. Zero setup required.
            </Text>
          </View>

          <View style={[styles.adapterDivider, { backgroundColor: colors.border }]} />

          <View style={styles.adapterItem}>
            <View style={styles.adapterHeader}>
              <Text style={[styles.adapterTitle, { color: colors.textPrimary }]}>
                Method B — Official Business Platform API
              </Text>
              <Badge label="1-Click Bulk" variant="primary" size="sm" />
            </View>
            <Text style={[styles.adapterDescription, { color: colors.textSecondary }]}>
              Dispatches bulk messages directly through Meta Graph API v21.0 in one single click using your WhatsApp Business credentials.
            </Text>
          </View>
        </Card>

        {/* Data Privacy & Protection */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Data Privacy & Protection
        </Text>
        <Card subtle style={styles.card}>
          <View style={styles.privacyRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Spreadsheet records are processed in ephemeral memory. Once a campaign completes, active records are wiped and archived solely in your offline Campaign History.
            </Text>
          </View>
        </Card>

        {/* Over-The-Air (OTA) Updates Card */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Over-The-Air (OTA) Live Updates
        </Text>
        <Card style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cloud-download-outline" size={18} color="#10B981" />
              <Text style={[styles.adapterTitle, { color: colors.textPrimary }]}>Live Cloud Updates</Text>
            </View>
            <Badge label={Updates.channel || 'preview'} variant="success" size="sm" />
          </View>
          <Text style={[styles.privacyText, { color: colors.textSecondary, marginBottom: 12 }]}>
            Dispatch supports instant over-the-air updates. UI enhancements, animations, and features are delivered seamlessly without reinstalling APKs.
          </Text>
          <Button
            title={checkingUpdates ? 'Checking for Updates...' : 'Check for Live Updates'}
            variant="secondary"
            size="sm"
            loading={checkingUpdates}
            icon={<Ionicons name="refresh" size={16} color={colors.textPrimary} />}
            onPress={handleCheckForUpdates}
          />
        </Card>

        {/* Expandable FAQ Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Frequently Asked Questions (FAQ)
        </Text>
        <ExpandableFAQ />

        {/* Creator & Developer Portfolio Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Creator & Developer Portfolio
        </Text>
        <Card style={styles.card}>
          <View style={styles.portfolioHeaderRow}>
            <View
              style={[
                styles.portfolioAvatarBox,
                {
                  backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                  borderColor: isDark ? '#6366F1' : '#C7D2FE',
                },
              ]}
            >
              <Text style={[styles.portfolioInitials, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                SG
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.portfolioName, { color: colors.textPrimary }]}>
                  Saketh Goljana
                </Text>
                <Badge label="Creator" variant="primary" size="sm" />
              </View>
              <Text style={[styles.portfolioRole, { color: isDark ? '#34D399' : '#059669' }]}>
                Full-Stack Mobile Engineer & Product Designer
              </Text>
            </View>
          </View>

          <Text style={[styles.portfolioBio, { color: colors.textSecondary }]}>
            Crafted and architected Dispatch — high-performance bulk WhatsApp automation engine, dynamic Excel token compiler, and cross-platform mobile studio.
          </Text>

          <View style={[styles.portfolioDivider, { backgroundColor: colors.border }]} />

          {/* Social & Contact Links Grid */}
          <View style={styles.portfolioLinksGrid}>
            {/* Portfolio Website */}
            <Pressable
              onPress={() => {
                Linking.openURL('https://sakethgoljana.tech').catch(() => {
                  Alert.alert('Unable to Open Link', 'Visit: https://sakethgoljana.tech');
                });
              }}
              style={({ pressed }) => [
                styles.portfolioLinkBtn,
                {
                  backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                  borderColor: isDark ? '#4338CA' : '#C7D2FE',
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.linkIconCircle, { backgroundColor: '#4F46E5' }]}>
                <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkBtnTitle, { color: colors.textPrimary }]}>
                  Personal Portfolio
                </Text>
                <Text style={[styles.linkBtnSubtitle, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                  sakethgoljana.tech
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={isDark ? '#A5B4FC' : '#4F46E5'} />
            </Pressable>

            {/* LinkedIn Profile */}
            <Pressable
              onPress={() => {
                Linking.openURL('https://www.linkedin.com/in/saketh-goljana/').catch(() => {
                  Alert.alert('Unable to Open Link', 'Visit: https://www.linkedin.com/in/saketh-goljana/');
                });
              }}
              style={({ pressed }) => [
                styles.portfolioLinkBtn,
                {
                  backgroundColor: isDark ? '#0A192F' : '#EFF6FF',
                  borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.linkIconCircle, { backgroundColor: '#0A66C2' }]}>
                <Ionicons name="logo-linkedin" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkBtnTitle, { color: colors.textPrimary }]}>
                  LinkedIn Profile
                </Text>
                <Text style={[styles.linkBtnSubtitle, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
                  linkedin.com/in/saketh-goljana
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={isDark ? '#93C5FD' : '#2563EB'} />
            </Pressable>

            {/* GitHub Profile */}
            <Pressable
              onPress={() => {
                Linking.openURL('https://github.com/SakethGoljana').catch(() => {
                  Alert.alert('Unable to Open Link', 'Visit: https://github.com/SakethGoljana');
                });
              }}
              style={({ pressed }) => [
                styles.portfolioLinkBtn,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.linkIconCircle, { backgroundColor: isDark ? '#1E293B' : '#0F172A' }]}>
                <Ionicons name="logo-github" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkBtnTitle, { color: colors.textPrimary }]}>
                  GitHub
                </Text>
                <Text style={[styles.linkBtnSubtitle, { color: colors.textTertiary }]}>
                  github.com/SakethGoljana
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
            </Pressable>

            {/* Email Contact */}
            <Pressable
              onPress={() => {
                Linking.openURL('mailto:hello@sakethgoljana.tech?subject=Dispatch%20App%20Inquiry').catch(() => {
                  Alert.alert('Email Client Not Found', 'Email: hello@sakethgoljana.tech');
                });
              }}
              style={({ pressed }) => [
                styles.portfolioLinkBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.linkIconCircle, { backgroundColor: isDark ? '#334155' : '#475569' }]}>
                <Ionicons name="mail" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkBtnTitle, { color: colors.textPrimary }]}>
                  Direct Email
                </Text>
                <Text style={[styles.linkBtnSubtitle, { color: colors.textSecondary }]}>
                  hello@sakethgoljana.tech
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>

            {/* WhatsApp Direct Chat */}
            <Pressable
              onPress={() => {
                const url = 'https://wa.me/919059478739?text=Hi%20Saketh!%20Connecting%20from%20Dispatch%20app.';
                Linking.openURL(url).catch(() => {
                  Alert.alert('Unable to Open WhatsApp', 'Reach out on WhatsApp at +91 90594 78739');
                });
              }}
              style={({ pressed }) => [
                styles.portfolioLinkBtn,
                {
                  backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                  borderColor: isDark ? '#059669' : '#A7F3D0',
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.linkIconCircle, { backgroundColor: '#059669' }]}>
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkBtnTitle, { color: isDark ? '#34D399' : '#065F46' }]}>
                  Chat on WhatsApp
                </Text>
                <Text style={[styles.linkBtnSubtitle, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  +91 90594 78739 • Direct Connect
                </Text>
              </View>
              <Ionicons name="chatbubble-ellipses" size={16} color="#059669" />
            </Pressable>
          </View>

          {/* Connect Tagline Note */}
          <View
            style={[
              styles.portfolioFooterBox,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="sparkles" size={13} color={isDark ? '#FBBF24' : '#D97706'} />
            <Text style={[styles.portfolioFooterText, { color: colors.textSecondary }]}>
              Open for software consulting, feature collaborations & product engineering.
            </Text>
          </View>
        </Card>

        {/* Legal, Privacy & Documentation Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Legal, Privacy & Documentation
        </Text>
        <Card style={styles.card}>
          <Pressable
            onPress={() => router.push('/legal/privacy')}
            style={({ pressed }) => [
              styles.legalRowItem,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.legalIconBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.legalRowTitle, { color: colors.textPrimary }]}>
                Privacy Policy
              </Text>
              <Text style={[styles.legalRowSub, { color: colors.textSecondary }]}>
                Zero-knowledge data disclosure & ephemeral processing policy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          <View style={[styles.legalDivider, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={() => router.push('/legal/terms')}
            style={({ pressed }) => [
              styles.legalRowItem,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.legalIconBox, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
              <Ionicons name="document-text-outline" size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.legalRowTitle, { color: colors.textPrimary }]}>
                Terms of Service
              </Text>
              <Text style={[styles.legalRowSub, { color: colors.textSecondary }]}>
                Acceptable use policy, anti-spam agreement & liability limits
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          <View style={[styles.legalDivider, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={() => router.push('/legal/docs')}
            style={({ pressed }) => [
              styles.legalRowItem,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.legalIconBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name="book-outline" size={18} color={isDark ? '#38BDF8' : '#0284C7'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.legalRowTitle, { color: colors.textPrimary }]}>
                User Manual & Setup Guide
              </Text>
              <Text style={[styles.legalRowSub, { color: colors.textSecondary }]}>
                Excel column formulas, tokens & Meta API onboarding tutorial
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </Card>

        {/* App Version Info */}
        <View style={styles.versionFooter}>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>
            Dispatch v1.1.0 • Bulk WhatsApp Studio
          </Text>
          <Text style={[styles.subVersionText, { color: colors.textTertiary }]}>
            Expo SDK 57 • React Native 0.86
          </Text>
        </View>
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
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    padding: spacing.cardPadding,
    marginBottom: spacing.base,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  themePillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  adapterItem: {
    paddingVertical: spacing.xs,
  },
  adapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  adapterTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    flex: 1,
    marginRight: spacing.sm,
  },
  adapterSub: {
    fontSize: 11,
    marginTop: 2,
  },
  adapterDescription: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  adapterDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  metaActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  privacyText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  portfolioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  portfolioAvatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioInitials: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  portfolioName: {
    fontSize: 16,
    fontWeight: '800',
  },
  portfolioRole: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  portfolioBio: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  portfolioDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  portfolioLinksGrid: {
    gap: spacing.sm,
  },
  portfolioLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  linkIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkBtnSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  portfolioFooterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  portfolioFooterText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  legalRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  legalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  legalRowSub: {
    fontSize: 11,
    marginTop: 1,
    lineHeight: 15,
  },
  legalDivider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  versionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  subVersionText: {
    fontSize: 11,
    marginTop: 2,
  },
});
