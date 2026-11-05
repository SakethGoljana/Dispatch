import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Card,
  Header,
  ScreenContainer,
} from '../../components';
import { colors, radii, spacing, typography } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { PreparedRecipient } from '../../core/filters/recipientFilter';

export default function RecipientsScreen() {
  const router = useRouter();
  const {
    filterCriteria,
    setFilterCriteria,
    filterResult,
    toggleStudentExclusion,
  } = useDataset();

  const [activeTab, setActiveTab] = useState<'eligible' | 'excluded'>('eligible');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const {
    eligibleRecipients,
    excludedRecipients,
    totalRecords,
    eligibleCount,
    excludedCount,
    sharedPhoneGroupCount,
    availableSections,
  } = filterResult;

  const maskPhone = (phone: string) => {
    if (phone.length <= 6) return phone;
    return `${phone.slice(0, 5)} *** ${phone.slice(-2)}`;
  };

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Step 4: Recipient Selection"
        subtitle={`${eligibleCount} of ${totalRecords} students eligible for campaign`}
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {/* Filter Controls Card */}
        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filter by Section</Text>
          <View style={styles.sectionPills}>
            <Pressable
              onPress={() => setFilterCriteria({ selectedSection: 'ALL' })}
              style={[
                styles.secPill,
                filterCriteria.selectedSection === 'ALL' && styles.secPillActive,
              ]}
            >
              <Text
                style={[
                  styles.secPillText,
                  filterCriteria.selectedSection === 'ALL' && styles.secPillTextActive,
                ]}
              >
                All Sections
              </Text>
            </Pressable>

            {availableSections.map((sec) => (
              <Pressable
                key={sec}
                onPress={() => setFilterCriteria({ selectedSection: sec })}
                style={[
                  styles.secPill,
                  filterCriteria.selectedSection === sec && styles.secPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.secPillText,
                    filterCriteria.selectedSection === sec && styles.secPillTextActive,
                  ]}
                >
                  Section {sec}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          <Pressable
            onPress={() =>
              setFilterCriteria({
                onlyPositiveBalance: !filterCriteria.onlyPositiveBalance,
              })
            }
            style={styles.checkboxRow}
          >
            <View
              style={[
                styles.checkbox,
                filterCriteria.onlyPositiveBalance && styles.checkboxActive,
              ]}
            >
              {filterCriteria.onlyPositiveBalance ? (
                <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Only remind students with outstanding dues (Balance &gt; 0)
            </Text>
          </Pressable>
        </Card>

        {/* Sibling Sharing Notification */}
        {sharedPhoneGroupCount > 0 ? (
          <Card subtle style={styles.siblingNotice}>
            <View style={styles.siblingNoticeRow}>
              <Ionicons name="people" size={18} color={colors.primary} />
              <Text style={styles.siblingNoticeText}>
                {sharedPhoneGroupCount} shared parent numbers detected (siblings). Each student receives their own personalized message.
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Tab Switcher: Eligible vs Excluded */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab('eligible')}
            style={[styles.tab, activeTab === 'eligible' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'eligible' && styles.tabTextActive,
              ]}
            >
              Eligible ({eligibleCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('excluded')}
            style={[styles.tab, activeTab === 'excluded' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'excluded' && styles.tabTextActive,
              ]}
            >
              Excluded / Blocked ({excludedCount})
            </Text>
          </Pressable>
        </View>

        {/* Recipient Cards */}
        {activeTab === 'eligible' ? (
          <View style={styles.list}>
            {eligibleRecipients.map((item) => {
              const { student, renderedMessage, isSharedPhone } = item;
              const isExpanded = expandedStudentId === student.id;
              const bal = student.outstandingBalance ?? 0;

              return (
                <Card key={student.id} style={styles.recipientCard}>
                  <View style={styles.cardTopRow}>
                    <Pressable
                      onPress={() => toggleStudentExclusion(student.id)}
                      style={styles.checkSelectRow}
                    >
                      <View style={[styles.checkbox, styles.checkboxActive]}>
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.textInverse}
                        />
                      </View>
                      <View>
                        <Text style={styles.studentName}>
                          {student.surname ? `${student.surname} ` : ''}
                          {student.studentName}
                        </Text>
                        <Text style={styles.studentMeta}>
                          Class {student.class || 'N/A'}-{student.section || 'N/A'} • {maskPhone(student.parentPhone)}
                        </Text>
                      </View>
                    </Pressable>

                    <View style={styles.cardRightCol}>
                      <View style={styles.balanceBadge}>
                        <Text style={styles.balanceText}>₹{bal.toLocaleString('en-IN')}</Text>
                      </View>
                      {isSharedPhone ? (
                        <Badge label="Sibling" variant="neutral" size="sm" style={styles.siblingBadge} />
                      ) : null}
                    </View>
                  </View>

                  {/* Expand preview toggle */}
                  <Pressable
                    onPress={() =>
                      setExpandedStudentId(isExpanded ? null : student.id)
                    }
                    style={styles.expandToggle}
                  >
                    <Text style={styles.expandToggleText}>
                      {isExpanded ? 'Hide message preview ▲' : 'View personalized message ▼'}
                    </Text>
                  </Pressable>

                  {isExpanded ? (
                    <View style={styles.expandedBubble}>
                      <Text style={styles.expandedMessageText}>{renderedMessage}</Text>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : (
          /* Excluded Students Tab */
          <View style={styles.list}>
            {excludedRecipients.map((item) => {
              const { student, exclusionReason } = item;
              return (
                <Card key={student.id} subtle style={styles.excludedCard}>
                  <View style={styles.excludedTopRow}>
                    <View>
                      <Text style={styles.excludedName}>
                        {student.surname ? `${student.surname} ` : ''}
                        {student.studentName || 'Unnamed Record'}
                      </Text>
                      <Text style={styles.studentMeta}>
                        Row {student.rowNumber} • Phone: {student.rawPhone || 'None'}
                      </Text>
                    </View>
                    <Badge label="Blocked" variant="error" size="sm" />
                  </View>

                  <View style={styles.reasonBox}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.error} />
                    <Text style={styles.reasonText}>{exclusionReason}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <Button
          title={`Proceed to Review & Send (${eligibleCount} Students) →`}
          onPress={() => router.push('/workflow/review')}
          disabled={eligibleCount === 0}
          variant="primary"
          style={styles.proceedButton}
        />
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
  filterCard: {
    padding: spacing.cardPadding,
    marginBottom: spacing.base,
  },
  filterTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  sectionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  secPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secPillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
  },
  secPillText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fontFamily,
  },
  secPillTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    flex: 1,
  },
  siblingNotice: {
    padding: spacing.sm,
    marginBottom: spacing.base,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
  },
  siblingNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  siblingNoticeText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: typography.fontFamily,
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.base,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: spacing.sm,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  recipientCard: {
    padding: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  checkSelectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  studentName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  studentMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.fontFamily,
  },
  cardRightCol: {
    alignItems: 'flex-end',
  },
  balanceBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  balanceText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  siblingBadge: {
    marginTop: 4,
  },
  expandToggle: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  expandToggleText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fontFamily,
  },
  expandedBubble: {
    backgroundColor: '#DCF8C6',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#C7E8AC',
  },
  expandedMessageText: {
    fontSize: typography.sizes.xs,
    color: '#075E54',
    lineHeight: typography.lineHeights.xs,
    fontFamily: typography.fontFamily,
  },
  excludedCard: {
    padding: spacing.md,
  },
  excludedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  excludedName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorBg,
    padding: spacing.xs,
    borderRadius: radii.xs,
  },
  reasonText: {
    fontSize: 11,
    color: colors.error,
    fontFamily: typography.fontFamily,
  },
  proceedButton: {
    width: '100%',
  },
});
