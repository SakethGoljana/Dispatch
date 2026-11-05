import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { SEMANTIC_FIELDS } from '../../core/mapper/columnMapper';
import { SemanticFieldKey } from '../../types';

export default function MappingScreen() {
  const router = useRouter();
  const {
    parsedResult,
    mappingConfig,
    isBalanceAmbiguous,
    candidateBalanceColumns,
    records,
    summary,
    setFieldMapping,
    setBalanceColumn,
  } = useDataset();

  // Column re-assignment modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<SemanticFieldKey | null>(null);

  if (!parsedResult || !summary) {
    return (
      <ScreenContainer safeTop={false} safeBottom={false}>
        <Header title="Step 2: Map Columns" onBack={() => router.back()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Spreadsheet Loaded</Text>
          <Text style={styles.emptySubtitle}>
            Please select an Excel or CSV file in Step 1 before mapping columns.
          </Text>
          <Button
            title="Go to Step 1: Import"
            onPress={() => router.push('/workflow/import')}
            variant="primary"
            style={styles.emptyButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  const selectedBalanceCol =
    mappingConfig.balanceColumnKey ||
    mappingConfig.mappings.outstandingBalance ||
    candidateBalanceColumns[0];

  const handleOpenPicker = (fieldKey: SemanticFieldKey) => {
    setActiveFieldKey(fieldKey);
    setModalVisible(true);
  };

  const handleSelectColumn = (columnName: string) => {
    if (activeFieldKey) {
      if (activeFieldKey === 'outstandingBalance') {
        setBalanceColumn(columnName);
      } else {
        setFieldMapping(activeFieldKey, columnName);
      }
    }
    setModalVisible(false);
  };

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Step 2: Map Columns"
        subtitle={`${parsedResult.headers.length} columns detected in spreadsheet`}
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {/* Ambiguous Balance Resolution Alert */}
        {isBalanceAmbiguous && candidateBalanceColumns.length > 1 ? (
          <Card style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.alertTitle}>Multiple Balance Columns Found</Text>
            </View>
            <Text style={styles.alertDesc}>
              This spreadsheet has {candidateBalanceColumns.length} balance columns. Tap the column representing the outstanding fee for this campaign:
            </Text>

            <View style={styles.radioList}>
              {candidateBalanceColumns.map((colName) => {
                const isSelected = selectedBalanceCol === colName;
                const sampleVal = records[0]?.customFields[colName] ?? '₹0';
                return (
                  <Pressable
                    key={colName}
                    onPress={() => setBalanceColumn(colName)}
                    style={[
                      styles.radioItem,
                      isSelected && styles.radioItemSelected,
                    ]}
                  >
                    <View style={styles.radioRow}>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <View style={styles.radioTextContainer}>
                        <Text style={styles.radioLabel}>{colName}</Text>
                        <Text style={styles.radioSample}>
                          Sample row 1 value: {String(sampleVal)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ) : null}

        {/* Semantic Field Mappings Card */}
        <Text style={styles.sectionTitle}>Field Mappings</Text>
        <Card style={styles.mappingCard}>
          {SEMANTIC_FIELDS.map((field, index) => {
            const mappedHeader =
              field.key === 'outstandingBalance'
                ? selectedBalanceCol
                : mappingConfig.mappings[field.key];

            const isMapped = !!mappedHeader;

            return (
              <View key={field.key}>
                <View style={styles.mappingRow}>
                  <View style={styles.fieldLeft}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <Badge
                      label={
                        field.required
                          ? isMapped
                            ? 'Mapped'
                            : 'Required'
                          : isMapped
                          ? 'Optional'
                          : 'Not Mapped'
                      }
                      variant={
                        field.required
                          ? isMapped
                            ? 'success'
                            : 'error'
                          : isMapped
                          ? 'neutral'
                          : 'neutral'
                      }
                      size="sm"
                    />
                  </View>

                  <Pressable
                    onPress={() => handleOpenPicker(field.key)}
                    style={styles.pickerPill}
                  >
                    <Text
                      style={[
                        styles.pickerPillText,
                        !isMapped && styles.pickerPillTextUnmapped,
                      ]}
                      numberOfLines={1}
                    >
                      {mappedHeader || 'Choose column...'}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
                {index < SEMANTIC_FIELDS.length - 1 ? (
                  <View style={styles.rowDivider} />
                ) : null}
              </View>
            );
          })}
        </Card>

        {/* Validation Summary Card */}
        <Text style={styles.sectionTitle}>Import Validation Report</Text>
        <Card subtle style={styles.summaryCard}>
          <View style={styles.statGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary.totalRecords}</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {summary.validPhoneCount}
              </Text>
              <Text style={styles.statLabel}>Valid Numbers</Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  summary.invalidPhoneCount > 0 && { color: colors.error },
                ]}
              >
                {summary.invalidPhoneCount}
              </Text>
              <Text style={styles.statLabel}>Blocked / Invalid</Text>
            </View>
          </View>

          <View style={styles.summaryNotes}>
            <View style={styles.noteRow}>
              <Ionicons
                name="wallet-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.noteText}>
                {summary.positiveBalanceCount} students with dues &gt; 0 • {summary.zeroBalanceCount} zero balance • {summary.negativeBalanceCount} credit advances.
              </Text>
            </View>

            {summary.sharedPhoneGroupCount > 0 ? (
              <View style={styles.noteRow}>
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.noteText}>
                  {summary.sharedPhoneGroupCount} shared phone groups identified (siblings).
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Unmapped Custom Variables for Templates */}
        <Text style={styles.sectionTitle}>
          Additional Columns (Usable in Templates)
        </Text>
        <Card subtle style={styles.customVarsCard}>
          <Text style={styles.customVarsDesc}>
            All other columns from this spreadsheet are automatically available as message tokens:
          </Text>
          <View style={styles.varChipsWrap}>
            {parsedResult.headers.map((h) => (
              <View key={h} style={styles.varChip}>
                <Text style={styles.varChipText}>{`{{${h}}}`}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button
          title="Confirm & Proceed to Template Compose →"
          onPress={() => router.push('/workflow/compose')}
          variant="primary"
          style={styles.nextButton}
        />
      </View>

      {/* Column Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Column</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Pressable
                onPress={() => handleSelectColumn('')}
                style={styles.modalOption}
              >
                <Text style={styles.modalOptionNone}>[ Unmapped / Do not map ]</Text>
              </Pressable>

              {parsedResult.headers.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => handleSelectColumn(h)}
                  style={styles.modalOption}
                >
                  <Text style={styles.modalOptionText}>{h}</Text>
                  <Text style={styles.modalOptionSample}>
                    Sample: {String(records[0]?.customFields[h] ?? '')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    fontFamily: typography.fontFamily,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    fontFamily: typography.fontFamily,
  },
  emptyButton: {
    minWidth: 180,
  },
  alertCard: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    marginBottom: spacing.base,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  alertTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.warning,
    fontFamily: typography.fontFamily,
  },
  alertDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    lineHeight: typography.lineHeights.xs,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
  },
  radioList: {
    gap: spacing.xs,
  },
  radioItem: {
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  radioSample: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  mappingCard: {
    padding: spacing.cardPadding,
    marginBottom: spacing.base,
  },
  mappingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  pickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    maxWidth: 150,
    gap: 4,
  },
  pickerPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  pickerPillTextUnmapped: {
    color: colors.textTertiary,
    fontWeight: typography.weights.regular,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  summaryCard: {
    padding: spacing.cardPadding,
    marginBottom: spacing.base,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.fontFamily,
  },
  summaryNotes: {
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noteText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    flex: 1,
  },
  customVarsCard: {
    padding: spacing.cardPadding,
    marginBottom: spacing.xl,
  },
  customVarsDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  varChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  varChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  varChipText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
  },
  nextButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '60%',
    padding: spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  modalScroll: {
    marginTop: spacing.sm,
  },
  modalOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalOptionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  modalOptionSample: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.fontFamily,
  },
  modalOptionNone: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontFamily: typography.fontFamily,
  },
});
