import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Header,
  ScreenContainer,
} from '../../components';
import { radii, spacing, typography, useTheme } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { CampaignRecord, getSavedCampaigns } from '../../core/campaign/campaignStorage';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { loadSyntheticBlueprintData } = useDataset();

  const [recentCampaigns, setRecentCampaigns] = useState<CampaignRecord[]>([]);

  const fetchCampaigns = useCallback(async () => {
    const list = await getSavedCampaigns();
    setRecentCampaigns(list.slice(0, 3));
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleLaunchDemoLedger = () => {
    loadSyntheticBlueprintData();
    router.push('/workflow/import');
  };

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      {/* Clean Brand Header */}
      <Header
        title="Dispatch"
        subtitle="Personalized WhatsApp from Excel"
      />

      <View style={styles.body}>
        {/* MAIN HERO CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
        >
          <View style={styles.heroIconBox}>
            <Image
              source={require('../../../assets/icon.png')}
              style={{ width: 44, height: 44, borderRadius: 10 }}
              resizeMode="cover"
            />
          </View>

          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Send Personalized WhatsApp
          </Text>
          <Text style={[styles.heroSubhead, { color: colors.textSecondary }]}>
            Upload your Excel or CSV sheet. Dispatch auto-fills each person's dues, dates, and details ready for you to send in 1 click.
          </Text>

          <Pressable
            onPress={() => router.push('/workflow/import')}
            style={({ pressed }) => [
              styles.heroPrimaryBtn,
              pressed && styles.heroBtnPressed,
            ]}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.heroPrimaryBtnText}>Start New Campaign</Text>
          </Pressable>

          <Pressable
            onPress={handleLaunchDemoLedger}
            style={({ pressed }) => [
              styles.heroSecondaryLink,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="sparkles" size={14} color="#10B981" />
            <Text style={[styles.heroSecondaryLinkText, { color: isDark ? '#34D399' : '#059669' }]}>
              Or try with sample data
            </Text>
          </Pressable>
        </View>

        {/* 3-STEP FLOW CHIP BAR */}
        <View
          style={[
            styles.stepsContainer,
            {
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.stepItem}>
            <View style={[styles.stepNumBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <Text style={[styles.stepNumText, { color: colors.textPrimary }]}>1</Text>
            </View>
            <View>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Pick File</Text>
              <Text style={[styles.stepSub, { color: colors.textTertiary }]}>Excel or CSV</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />

          <View style={styles.stepItem}>
            <View style={[styles.stepNumBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <Text style={[styles.stepNumText, { color: colors.textPrimary }]}>2</Text>
            </View>
            <View>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Auto-Fill</Text>
              <Text style={[styles.stepSub, { color: colors.textTertiary }]}>Custom dues</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />

          <View style={styles.stepItem}>
            <View style={[styles.stepNumBadge, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
              <Text style={[styles.stepNumText, { color: '#10B981' }]}>3</Text>
            </View>
            <View>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>1-Tap Send</Text>
              <Text style={[styles.stepSub, { color: colors.textTertiary }]}>100% ban-safe</Text>
            </View>
          </View>
        </View>

        {/* RECENT CAMPAIGNS SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Campaigns
          </Text>
          {recentCampaigns.length > 0 && (
            <Pressable onPress={() => router.push('/(tabs)/campaigns')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>View All →</Text>
            </Pressable>
          )}
        </View>

        {recentCampaigns.length > 0 ? (
          <View style={styles.recentStack}>
            {recentCampaigns.map((camp) => (
              <Pressable
                key={camp.id}
                onPress={() => router.push('/(tabs)/campaigns')}
                style={({ pressed }) => [
                  styles.recentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                  },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
                ]}
              >
                <View style={styles.recentTopRow}>
                  <Text style={[styles.recentTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {camp.title}
                  </Text>
                  <Badge
                    label={camp.status === 'COMPLETED' ? 'Completed ✓' : 'In Progress'}
                    variant={camp.status === 'COMPLETED' ? 'success' : 'neutral'}
                    size="sm"
                  />
                </View>

                {/* Progress Track */}
                <View style={[styles.miniProgressTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${Math.round(((camp.confirmedSentCount || 0) / (camp.totalCount || 1)) * 100)}%`,
                        backgroundColor: '#10B981',
                      },
                    ]}
                  />
                </View>

                <View style={styles.recentMetaRow}>
                  <Text style={[styles.recentMetaText, { color: colors.textSecondary }]}>
                    {camp.confirmedSentCount} of {camp.totalCount} sent
                  </Text>
                  <Text style={[styles.recentMetaText, { color: colors.textTertiary }]}>
                    {new Date(camp.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? '#11182740' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.borderSubtle,
              },
            ]}
          >
            <Ionicons name="folder-open-outline" size={28} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No Campaigns Yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              Your past campaigns and message receipts will appear here.
            </Text>
          </View>
        )}

        {/* CALM REASSURANCE FOOTER */}
        <View style={styles.safetyFooter}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.safetyFooterText}>
            100% Private • Data stays on your phone • Zero spam bans
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubhead: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: 8,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radii.lg,
    width: '100%',
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  heroSecondaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  heroSecondaryLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepSub: {
    fontSize: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentStack: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  recentCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  recentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  miniProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  recentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentMetaText: {
    fontSize: 11,
  },
  emptyCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
  },
  safetyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  safetyFooterText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});
