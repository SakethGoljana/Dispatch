import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
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
import { colors, radii, spacing, typography } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { renderStudentMessage } from '../../core/template/templateCompiler';
import { BUILT_IN_TEMPLATES } from '../../core/template/templateLibrary';

export default function ComposeScreen() {
  const router = useRouter();
  const {
    parsedResult,
    records,
    mappingConfig,
    templateText,
    setTemplateText,
    requiredTokens,
    setRequiredTokens,
    selectTemplatePreset,
  } = useDataset();

  // Preview student index
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState({ start: templateText.length, end: templateText.length });

  // Fallback to sample student if no dataset loaded yet
  const currentStudent = records.length > 0 ? records[previewStudentIndex] : undefined;

  // Render message live using the single shared compiler
  const previewRender = currentStudent
    ? renderStudentMessage(templateText, currentStudent, requiredTokens, mappingConfig)
    : {
        renderedText: templateText
          .replace(/\{\{STUDENT_NAME\}\}/g, 'AARAV')
          .replace(/\{\{CLASS\}\}/g, '2')
          .replace(/\{\{SECTION\}\}/g, 'A')
          .replace(/\{\{BALANCE\}\}/g, '11,500'),
        isValid: true,
        missingRequiredFields: [],
        resolvedVariables: {},
      };

  const handleInsertVariable = (token: string) => {
    const insertStr = `{{${token}}}`;
    const start = cursorPos.start || templateText.length;
    const end = cursorPos.end || templateText.length;

    const nextText =
      templateText.substring(0, start) +
      insertStr +
      templateText.substring(end);

    setTemplateText(nextText);
    setCursorPos({
      start: start + insertStr.length,
      end: start + insertStr.length,
    });
  };

  // Compile list of available variable chips
  const standardTokens = [
    { token: 'STUDENT_NAME', label: 'Student Name' },
    { token: 'SUR_NAME', label: 'Surname' },
    { token: 'CLASS', label: 'Class' },
    { token: 'SECTION', label: 'Section' },
    { token: 'BALANCE', label: 'Fee Balance' },
    { token: 'PHONE', label: 'Parent Phone' },
  ];

  const customTokens = (parsedResult?.headers || []).map((h) => ({
    token: h,
    label: h,
  }));

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Step 3: Compose Template"
        subtitle="Insert spreadsheet tokens & preview live student data"
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {/* Preset Selector */}
        <View style={styles.presetsHeader}>
          <Text style={styles.sectionTitle}>Template Presets</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {BUILT_IN_TEMPLATES.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => selectTemplatePreset(preset.id)}
              style={styles.presetPill}
            >
              <Text style={styles.presetPillText}>{preset.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Variable Insertion Pills */}
        <Text style={styles.sectionTitle}>Insert Spreadsheet Variables (Tap to add)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {standardTokens.map((chip) => (
            <Pressable
              key={chip.token}
              onPress={() => handleInsertVariable(chip.token)}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.chipText}>{chip.label}</Text>
            </Pressable>
          ))}
          {customTokens.map((chip) => (
            <Pressable
              key={`custom-${chip.token}`}
              onPress={() => handleInsertVariable(chip.token)}
              style={({ pressed }) => [
                styles.chip,
                styles.customChip,
                pressed && styles.chipPressed,
              ]}
            >
              <Ionicons name="add" size={14} color={colors.textSecondary} />
              <Text style={styles.customChipText}>{chip.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Message Editor */}
        <Text style={styles.sectionTitle}>Message Template Editor</Text>
        <Card style={styles.editorCard}>
          <RNTextInput
            style={styles.textEditor}
            value={templateText}
            onChangeText={setTemplateText}
            onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection)}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholder="Compose message with {{VARIABLE}} tokens..."
            placeholderTextColor={colors.textTertiary}
          />
          <View style={styles.editorFooter}>
            <Text style={styles.charCount}>
              {templateText.length} characters • {templateText.split('\n').length} lines
            </Text>
          </View>
        </Card>

        {/* Live Student Preview Card */}
        <View style={styles.previewHeader}>
          <Text style={styles.sectionTitle}>Live Student Preview</Text>
          <Badge
            label={previewRender.isValid ? 'Validation Passed' : 'Missing Required Variable'}
            variant={previewRender.isValid ? 'success' : 'error'}
            size="sm"
          />
        </View>

        {/* Student Switcher Controls */}
        {records.length > 1 ? (
          <View style={styles.cyclerRow}>
            <Pressable
              onPress={() =>
                setPreviewStudentIndex((prev) => (prev > 0 ? prev - 1 : records.length - 1))
              }
              style={styles.cycleButton}
            >
              <Text style={styles.cycleButtonText}>‹ Previous</Text>
            </Pressable>

            <Text style={styles.cycleLabel}>
              Student {previewStudentIndex + 1} of {records.length}:{' '}
              <Text style={styles.bold}>{currentStudent?.studentName}</Text>
            </Text>

            <Pressable
              onPress={() =>
                setPreviewStudentIndex((prev) => (prev < records.length - 1 ? prev + 1 : 0))
              }
              style={styles.cycleButton}
            >
              <Text style={styles.cycleButtonText}>Next ›</Text>
            </Pressable>
          </View>
        ) : null}

        <Card subtle style={styles.previewCard}>
          <View style={styles.whatsappBubble}>
            <Text style={styles.previewText}>{previewRender.renderedText}</Text>
            <View style={styles.timeTag}>
              <Text style={styles.timeText}>10:45 AM ✓✓</Text>
            </View>
          </View>

          {!previewRender.isValid ? (
            <View style={styles.errorNotice}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorNoticeText}>
                Missing required variables: {previewRender.missingRequiredFields.join(', ')}
              </Text>
            </View>
          ) : null}
        </Card>

        <Button
          title="Proceed to Recipient Selection →"
          onPress={() => router.push('/workflow/recipients')}
          variant="primary"
          style={styles.nextButton}
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
  presetsHeader: {
    marginBottom: spacing.xs,
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
  presetScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  presetPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  presetPillText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fontFamily,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: spacing.base,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    gap: 3,
    marginRight: spacing.xs,
  },
  chipPressed: {
    backgroundColor: colors.primarySubtle,
  },
  chipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  customChip: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  customChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  editorCard: {
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  textEditor: {
    minHeight: 130,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    lineHeight: typography.lineHeights.base,
    fontFamily: typography.fontFamily,
  },
  editorFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontFamily: typography.fontFamily,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cyclerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cycleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
  },
  cycleButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  cycleLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  bold: {
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  previewCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  whatsappBubble: {
    backgroundColor: '#DCF8C6',
    padding: spacing.md,
    borderRadius: radii.md,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#C7E8AC',
  },
  previewText: {
    fontSize: typography.sizes.sm,
    color: '#075E54',
    lineHeight: typography.lineHeights.sm,
    fontFamily: typography.fontFamily,
  },
  timeTag: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: 10,
    color: '#4B7355',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.errorBg,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  errorNoticeText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontFamily: typography.fontFamily,
    flex: 1,
  },
  nextButton: {
    width: '100%',
  },
});
