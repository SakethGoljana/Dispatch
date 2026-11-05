import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Header,
  ScreenContainer,
} from '../../components';
import { radii, shadows, spacing, typography, useTheme } from '../../tokens';
import { useDataset } from '../../core/state/DatasetStore';
import { BUILT_IN_TEMPLATES } from '../../core/template/templateLibrary';
import { getAllTemplates } from '../../core/template/templateStorage';
import { renderStudentMessage } from '../../core/template/templateCompiler';
import { autoMatchTemplate } from '../../core/template/templateAutoMatcher';
import {
  extractTextFromPDFBytes,
  inspectPDFDocument,
  PDFInspectionResult,
} from '../../core/parsers/pdfTableParser';
import { CustomFilterRule } from '../../core/filters/recipientFilter';
import {
  fetchLiveGoogleSheet,
  getLastSyncedGoogleSheet,
} from '../../core/parsers/googleSheetsSync';
import {
  REGIONAL_LANGUAGES,
  REGIONAL_TEMPLATES,
  getRegionalPresets,
} from '../../core/template/regionalTemplates';
import { MessageTemplate } from '../../types';

async function readFileAsBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    if (typeof file.base64 === 'function') {
      const b64 = await file.base64();
      if (b64 && b64.length > 0) return b64;
    }
  } catch (_err) {
    // fallback
  }

  return new Promise((resolve, reject) => {
    fetch(uri)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('FileReader failed to read document'));
        reader.readAsDataURL(blob);
      })
      .catch((err) => reject(new Error(`Failed to read file: ${err?.message || err}`)));
  });
}

export default function ImportScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    fileInfo,
    parsedResult,
    records,
    mappingConfig,
    filterCriteria,
    setFilterCriteria,
    filterResult,
    loadSpreadsheetData,
    loadTextOrPDFData,
    loadSyntheticBlueprintData,
    selectWorksheet,
    templateText,
    setTemplateText,
    isLoading,
  } = useDataset();

  const [availableTemplates, setAvailableTemplates] = useState<MessageTemplate[]>(BUILT_IN_TEMPLATES);
  const [activeTab, setActiveTab] = useState<'DATA' | 'STUDIO'>('DATA');
  const [pickingFile, setPickingFile] = useState(false);
  const [pasteModalVisible, setPasteModalVisible] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [dataRowIndex, setDataRowIndex] = useState(0);

  // Custom Audience Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterRuleCol, setFilterRuleCol] = useState('');
  const [filterRuleOp, setFilterRuleOp] = useState<'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_empty'>('equals');
  const [filterRuleVal, setFilterRuleVal] = useState('');
  const [cursorSelection, setCursorSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [previewIndex, setPreviewIndex] = useState(0);

  // Regional Language & Google Sheets Sync State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [gSheetsModalVisible, setGSheetsModalVisible] = useState(false);
  const [gSheetUrl, setGSheetUrl] = useState('');
  const [isSyncingGSheet, setIsSyncingGSheet] = useState(false);
  const [lastSyncedGSheet, setLastSyncedGSheet] = useState<{ url: string; title: string } | null>(null);

  // PDF Diagnostic & Assistance State
  const [pdfDiagnostic, setPdfDiagnostic] = useState<PDFInspectionResult | null>(null);
  const [pdfDiagnosticModalVisible, setPdfDiagnosticModalVisible] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');

  useEffect(() => {
    getLastSyncedGoogleSheet().then((saved) => {
      if (saved) {
        setLastSyncedGSheet(saved);
        setGSheetUrl(saved.url);
      }
    });
  }, []);

  useEffect(() => {
    getAllTemplates().then((tpls) => {
      if (tpls && tpls.length > 0) setAvailableTemplates(tpls);
    });
  }, []);

  const availableColumns = parsedResult?.headers || [];

  // When a file or demo ledger is loaded, automatically adapt tokens to actual column names
  useEffect(() => {
    if (records.length > 0 && !templateText) {
      const match = autoMatchTemplate(BUILT_IN_TEMPLATES[0].body, availableColumns, mappingConfig);
      setTemplateText(match.updatedTemplate);
    } else if (records.length > 0 && availableColumns.length > 0 && templateText.includes('{{Balance}}')) {
      const match = autoMatchTemplate(templateText, availableColumns, mappingConfig);
      if (match.matchedCount > 0) {
        setTemplateText(match.updatedTemplate);
      }
    }
  }, [records, availableColumns, mappingConfig, templateText, setTemplateText]);

  const handlePickDocument = async () => {
    try {
      setPickingFile(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'text/csv', // .csv
          'text/comma-separated-values',
          'application/pdf', // .pdf
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        setPickingFile(false);
        return;
      }

      const file = res.assets[0];
      const uri = file.uri;
      const fileName = file.name || 'imported_sheet.xlsx';

      const base64Content = await readFileAsBase64(uri);

      if (fileName.toLowerCase().endsWith('.pdf')) {
        // Decode base64 to binary bytes for PDF stream extraction
        const binaryStr = atob(base64Content);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const inspection = inspectPDFDocument(bytes);
        if (inspection.hasTextLayer) {
          loadTextOrPDFData(inspection.rawText, fileName);
          setActiveTab('DATA');
        } else {
          setPdfFileName(fileName);
          setPdfDiagnostic(inspection);
          setPdfDiagnosticModalVisible(true);
        }
      } else {
        loadSpreadsheetData(base64Content, fileName, 'base64');
        setActiveTab('DATA');
      }
    } catch (err: any) {
      Alert.alert('Import Failed', err?.message || 'Unable to read selected spreadsheet file.');
    } finally {
      setPickingFile(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      Alert.alert('Empty Input', 'Please paste some text with phone numbers and names.');
      return;
    }
    try {
      loadTextOrPDFData(pastedText, 'Pasted Roster');
      setPasteModalVisible(false);
      setPastedText('');
      setActiveTab('DATA');
    } catch (err: any) {
      Alert.alert('Parse Failed', err?.message || 'Could not find valid phone numbers in this text.');
    }
  };

  const handleAddCustomFilterRule = () => {
    if (!filterRuleCol) {
      Alert.alert('Select Column', 'Please select a column to filter by.');
      return;
    }
    const newRule: CustomFilterRule = {
      id: `rule-${Date.now()}`,
      column: filterRuleCol,
      operator: filterRuleOp,
      value: filterRuleVal,
    };
    const currentRules = filterCriteria.customRules || [];
    setFilterCriteria({ customRules: [...currentRules, newRule] });
    setFilterModalVisible(false);
    setFilterRuleVal('');
  };

  const handleRemoveCustomFilterRule = (ruleId: string) => {
    const updated = (filterCriteria.customRules || []).filter((r) => r.id !== ruleId);
    setFilterCriteria({ customRules: updated });
  };

  const handleSyncGoogleSheet = async () => {
    if (!gSheetUrl.trim()) {
      Alert.alert('URL Required', 'Please paste a valid Google Sheets URL.');
      return;
    }
    try {
      setIsSyncingGSheet(true);
      const { csvText, title } = await fetchLiveGoogleSheet(gSheetUrl);
      loadSpreadsheetData(csvText, title, 'string');
      setGSheetsModalVisible(false);
      setLastSyncedGSheet({ url: gSheetUrl, title });
      setActiveTab('DATA');
      Alert.alert('Sync Successful', `Loaded ${title} in real-time from Google Sheets.`);
    } catch (err: any) {
      Alert.alert('Google Sheets Sync Failed', err?.message || 'Unable to fetch sheet data.');
    } finally {
      setIsSyncingGSheet(false);
    }
  };

  const handleSelectLanguage = (langCode: string) => {
    setSelectedLanguage(langCode);
    const presets = getRegionalPresets(langCode);
    if (presets && presets.length > 0) {
      const firstPreset = presets[0].text;
      const matched = availableColumns.length > 0
        ? autoMatchTemplate(firstPreset, availableColumns, mappingConfig).updatedTemplate
        : firstPreset;
      setTemplateText(matched);
    }
  };

  const handleInsertVariable = (colName: string) => {
    const token = `{{${colName}}}`;
    const start = cursorSelection.start ?? templateText.length;
    const end = cursorSelection.end ?? templateText.length;
    const newText = templateText.slice(0, start) + token + templateText.slice(end);
    setTemplateText(newText);
    const nextCursor = start + token.length;
    setCursorSelection({ start: nextCursor, end: nextCursor });
  };

  const handleMatchSheetColumns = () => {
    if (availableColumns.length === 0) return;

    const result = autoMatchTemplate(templateText, availableColumns, mappingConfig);

    if (result.matchedCount > 0) {
      setTemplateText(result.updatedTemplate);
      const details = result.replacements
        .map((r) => `• {{${r.originalToken}}} → {{${r.matchedColumn}}} (${r.reason})`)
        .join('\n');
      Alert.alert(
        'Columns Aligned Successfully',
        `Matched ${result.matchedCount} variable(s) to your spreadsheet:\n\n${details}`
      );
    } else if (result.alreadyMatchedCount > 0) {
      Alert.alert(
        'All Tokens Aligned',
        'All variables in your message already match your spreadsheet columns perfectly!'
      );
    } else {
      Alert.alert(
        'No Matching Columns Found',
        'No matching spreadsheet columns were detected for your custom tokens. You can tap any column chip above to insert them directly.'
      );
    }
  };

  const currentPreviewRecord = records[previewIndex];
  const renderedPreview = currentPreviewRecord
    ? renderStudentMessage(templateText, currentPreviewRecord, [], mappingConfig).renderedText
    : '';

  const handleNextStep = () => {
    if (!parsedResult || records.length === 0) {
      Alert.alert('Spreadsheet Required', 'Please import a spreadsheet or load demo data first.');
      return;
    }

    if (!templateText || templateText.trim().length === 0) {
      Alert.alert('Message Required', 'Please compose your message or choose a template.');
      return;
    }

    router.push('/workflow/select-method');
  };

  return (
    <ScreenContainer scrollable safeTop={false} safeBottom={false}>
      <Header
        title="Campaign Studio"
        subtitle="Spreadsheet Inspector & WhatsApp Composer"
        onBack={() => router.back()}
      />

      {/* TOP WORKFLOW STEP TRACKER */}
      <View style={[styles.stepperBar, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
        <View style={styles.stepItemActive}>
          <View style={styles.stepNumberCircleActive}>
            <Text style={styles.stepNumberTextActive}>1</Text>
          </View>
          <Text style={[styles.stepItemLabelActive, { color: isDark ? '#34D399' : '#059669' }]}>
            Data & Message
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />

        <View style={styles.stepItemInactive}>
          <View style={[styles.stepNumberCircleInactive, { borderColor: colors.border }]}>
            <Text style={[styles.stepNumberTextInactive, { color: colors.textTertiary }]}>2</Text>
          </View>
          <Text style={[styles.stepItemLabelInactive, { color: colors.textTertiary }]}>
            Method
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />

        <View style={styles.stepItemInactive}>
          <View style={[styles.stepNumberCircleInactive, { borderColor: colors.border }]}>
            <Text style={[styles.stepNumberTextInactive, { color: colors.textTertiary }]}>3</Text>
          </View>
          <Text style={[styles.stepItemLabelInactive, { color: colors.textTertiary }]}>
            Dispatch
          </Text>
        </View>
      </View>

      {/* SEGMENTED STUDIO CONTROLLER */}
      <View style={styles.tabContainer}>
        <View
          style={[
            styles.segmentTrack,
            { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab('DATA')}
            style={[
              styles.segmentPill,
              activeTab === 'DATA' && [
                styles.segmentPillActive,
                { backgroundColor: colors.surface },
              ],
            ]}
          >
            <Ionicons
              name="grid"
              size={15}
              color={activeTab === 'DATA' ? (isDark ? '#34D399' : '#059669') : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'DATA' ? colors.textPrimary : colors.textSecondary,
                  fontWeight: activeTab === 'DATA' ? '700' : '500',
                },
              ]}
            >
              Spreadsheet Data {records.length > 0 ? `(${records.length})` : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('STUDIO')}
            style={[
              styles.segmentPill,
              activeTab === 'STUDIO' && [
                styles.segmentPillActive,
                { backgroundColor: colors.surface },
              ],
            ]}
          >
            <Ionicons
              name="chatbox-ellipses"
              size={15}
              color={activeTab === 'STUDIO' ? (isDark ? '#34D399' : '#059669') : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'STUDIO' ? colors.textPrimary : colors.textSecondary,
                  fontWeight: activeTab === 'STUDIO' ? '700' : '500',
                },
              ]}
            >
              Message Studio
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {/* ======================================================== */}
        {/* TAB 1: SPREADSHEET DATA INSPECTOR                        */}
        {/* ======================================================== */}
        {activeTab === 'DATA' && (
          <View style={styles.tabSection}>
            {parsedResult && fileInfo ? (
              <>
                {/* File Telemetry Header */}
                <View
                  style={[
                    styles.fileCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                    },
                  ]}
                >
                  <View style={styles.fileCardHeader}>
                    <View style={[styles.fileIconBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                      <Ionicons name="document-text" size={24} color="#10B981" />
                    </View>
                    <View style={styles.fileDetailsWrap}>
                      <Text style={[styles.fileTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {fileInfo.name}
                      </Text>
                      <Text style={[styles.fileSub, { color: colors.textSecondary }]}>
                        {records.length} contacts • {availableColumns.length} columns detected
                      </Text>
                    </View>
                    <Pressable
                      onPress={handlePickDocument}
                      style={({ pressed }) => [
                        styles.replaceBtn,
                        { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
                      <Text style={[styles.replaceBtnText, { color: colors.textSecondary }]}>Change</Text>
                    </Pressable>
                  </View>

                  {/* Multi-Worksheet Selector (if available) */}
                  {fileInfo.sheetNames && fileInfo.sheetNames.length > 1 && (
                    <View style={styles.worksheetRow}>
                      <Text style={[styles.worksheetLabel, { color: colors.textTertiary }]}>Sheet:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sheetScroll}>
                        {fileInfo.sheetNames.map((name) => {
                          const isSelected = parsedResult.selectedSheet === name;
                          return (
                            <Pressable
                              key={name}
                              onPress={() => selectWorksheet(name)}
                              style={[
                                styles.sheetPill,
                                {
                                  backgroundColor: isSelected ? (isDark ? '#064E3B' : '#ECFDF5') : colors.surfaceSubtle,
                                  borderColor: isSelected ? '#10B981' : colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sheetPillText,
                                  { color: isSelected ? '#10B981' : colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                                ]}
                              >
                                {name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Detected Dynamic Columns Tag Cloud */}
                <View style={styles.columnTagsBox}>
                  <Text style={[styles.subHeading, { color: colors.textPrimary }]}>
                    Auto-Mapped Columns ({availableColumns.length})
                  </Text>
                  <View style={styles.columnPillWrap}>
                    {availableColumns.map((col) => (
                      <View
                        key={col}
                        style={[
                          styles.columnPill,
                          {
                            backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                            borderColor: isDark ? '#4338CA' : '#C7D2FE',
                          },
                        ]}
                      >
                        <Ionicons name="pricetag" size={11} color={isDark ? '#A5B4FC' : '#4F46E5'} />
                        <Text style={[styles.columnPillText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                          {col}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* UNIVERSAL AUDIENCE FILTERS CARD */}
                <View
                  style={[
                    styles.audienceFilterCard,
                    {
                      backgroundColor: isDark ? '#111827' : colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.audienceFilterHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="filter-circle" size={18} color="#10B981" />
                      <Text style={[styles.subHeading, { color: colors.textPrimary }]}>
                        Audience & Contact Filters
                      </Text>
                    </View>
                    <Badge
                      label={`${filterResult.eligibleCount} of ${records.length} Selected (${Math.round((filterResult.eligibleCount / (records.length || 1)) * 100)}%)`}
                      variant="success"
                      size="sm"
                    />
                  </View>

                  <Text style={[styles.audienceFilterSub, { color: colors.textSecondary }]}>
                    All valid phone numbers are selected by default. Add custom rules to filter by any column.
                  </Text>

                  {/* Filter Action Pills */}
                  <View style={styles.filterChipRow}>
                    <Pressable
                      onPress={() => setFilterCriteria({ customRules: [], onlyPositiveBalance: false })}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor:
                            (!filterCriteria.customRules || filterCriteria.customRules.length === 0) && !filterCriteria.onlyPositiveBalance
                              ? '#10B981'
                              : isDark ? '#1E293B' : colors.surface,
                          borderColor:
                            (!filterCriteria.customRules || filterCriteria.customRules.length === 0) && !filterCriteria.onlyPositiveBalance
                              ? '#10B981'
                              : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color:
                              (!filterCriteria.customRules || filterCriteria.customRules.length === 0) && !filterCriteria.onlyPositiveBalance
                                ? '#FFFFFF'
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        All Contacts ({records.length})
                      </Text>
                    </Pressable>

                    {records.some((r) => (r.outstandingBalance || 0) > 0) && (
                      <Pressable
                        onPress={() => setFilterCriteria({ onlyPositiveBalance: !filterCriteria.onlyPositiveBalance })}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: filterCriteria.onlyPositiveBalance
                              ? '#10B981'
                              : isDark ? '#1E293B' : colors.surface,
                            borderColor: filterCriteria.onlyPositiveBalance ? '#10B981' : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={13}
                          color={filterCriteria.onlyPositiveBalance ? '#FFFFFF' : '#10B981'}
                        />
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: filterCriteria.onlyPositiveBalance ? '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          With Balance Only ({records.filter((r) => (r.outstandingBalance || 0) > 0).length})
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => {
                        if (availableColumns.length > 0 && !filterRuleCol) {
                          setFilterRuleCol(availableColumns[0]);
                        }
                        setFilterModalVisible(true);
                      }}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isDark ? '#312E8140' : '#EEF2FF',
                          borderColor: '#6366F1',
                        },
                      ]}
                    >
                      <Ionicons name="add" size={14} color="#6366F1" />
                      <Text style={[styles.filterChipText, { color: '#6366F1', fontWeight: '700' }]}>
                        + Add Custom Filter
                      </Text>
                    </Pressable>
                  </View>

                  {/* ACTIVE CUSTOM RULES LIST */}
                  {filterCriteria.customRules && filterCriteria.customRules.length > 0 && (
                    <View style={styles.activeRulesContainer}>
                      {filterCriteria.customRules.map((rule) => (
                        <View
                          key={rule.id}
                          style={[
                            styles.activeRulePill,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Ionicons name="funnel" size={12} color="#10B981" />
                          <Text style={[styles.activeRuleText, { color: colors.textPrimary }]}>
                            <Text style={{ fontWeight: '700' }}>{rule.column}</Text>{' '}
                            {rule.operator === 'equals'
                              ? '='
                              : rule.operator === 'not_equals'
                              ? '≠'
                              : rule.operator === 'greater_than'
                              ? '>'
                              : rule.operator === 'less_than'
                              ? '<'
                              : rule.operator}{' '}
                            <Text style={{ fontWeight: '700' }}>"{rule.value}"</Text>
                          </Text>
                          <Pressable
                            onPress={() => handleRemoveCustomFilterRule(rule.id)}
                            hitSlop={8}
                            style={{ marginLeft: 4 }}
                          >
                            <Ionicons name="close-circle" size={15} color={colors.textTertiary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Interactive Real Spreadsheet Row Carousel */}
                <View style={styles.dataInspectorCard}>
                  <View style={styles.rowInspectorHeader}>
                    <Text style={[styles.subHeading, { color: colors.textPrimary }]}>
                      Spreadsheet Row Inspector
                    </Text>
                    <View style={styles.cyclerControls}>
                      <Pressable
                        onPress={() => setDataRowIndex((p) => Math.max(0, p - 1))}
                        disabled={dataRowIndex === 0}
                        style={[
                          styles.cycleBtn,
                          { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                          dataRowIndex === 0 && { opacity: 0.3 },
                        ]}
                      >
                        <Ionicons name="chevron-back" size={15} color={colors.textPrimary} />
                      </Pressable>
                      <Text style={[styles.cyclerText, { color: colors.textSecondary }]}>
                        {dataRowIndex + 1} / {records.length}
                      </Text>
                      <Pressable
                        onPress={() => setDataRowIndex((p) => Math.min(records.length - 1, p + 1))}
                        disabled={dataRowIndex === records.length - 1}
                        style={[
                          styles.cycleBtn,
                          { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                          dataRowIndex === records.length - 1 && { opacity: 0.3 },
                        ]}
                      >
                        <Ionicons name="chevron-forward" size={15} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>

                  {records[dataRowIndex] ? (
                    <View
                      style={[
                        styles.recordRowCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.recordMainRow}>
                        <View style={styles.recordAvatarBox}>
                          <Text style={styles.recordAvatarText}>
                            {(records[dataRowIndex].studentName || 'C').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.recordName, { color: colors.textPrimary }]}>
                            {records[dataRowIndex].studentName || 'Unnamed Record'}
                          </Text>
                          <Text style={[styles.recordPhone, { color: colors.textSecondary }]}>
                            📱 {records[dataRowIndex].parentPhone || records[dataRowIndex].rawPhone || 'No Phone'}
                          </Text>
                        </View>
                        {records[dataRowIndex].outstandingBalance !== undefined ? (
                          <Badge
                            label={`₹${records[dataRowIndex].outstandingBalance?.toLocaleString('en-IN')}`}
                            variant="warning"
                            size="sm"
                          />
                        ) : null}
                      </View>

                      {/* Attribute Pills */}
                      <View style={styles.rawAttributesWrap}>
                        {records[dataRowIndex].class ? (
                          <View style={[styles.attrChip, { backgroundColor: colors.surfaceSubtle }]}>
                            <Text style={[styles.attrChipText, { color: colors.textSecondary }]}>
                              Class: {records[dataRowIndex].class}
                            </Text>
                          </View>
                        ) : null}
                        {records[dataRowIndex].section ? (
                          <View style={[styles.attrChip, { backgroundColor: colors.surfaceSubtle }]}>
                            <Text style={[styles.attrChipText, { color: colors.textSecondary }]}>
                              Sec: {records[dataRowIndex].section}
                            </Text>
                          </View>
                        ) : null}
                        <View style={[styles.attrChip, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={[styles.attrChipText, { color: colors.textSecondary }]}>
                            Row #{records[dataRowIndex].rowNumber}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Switch to Message Studio CTA */}
                  <Pressable
                    onPress={() => setActiveTab('STUDIO')}
                    style={({ pressed }) => [
                      styles.switchToStudioBtn,
                      { backgroundColor: isDark ? '#10B98125' : '#ECFDF5', borderColor: '#10B981' },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Ionicons name="chatbox-ellipses" size={16} color="#10B981" />
                    <Text style={styles.switchToStudioText}>Ready! Switch to Message Studio →</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              /* EMPTY DROPZONE */
              <View
                style={[
                  styles.dropZoneContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
                  },
                ]}
              >
                <View style={[styles.dropZoneCircle, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                  <Ionicons name="cloud-upload" size={36} color="#10B981" />
                </View>
                <Text style={[styles.dropZoneTitle, { color: colors.textPrimary }]}>
                  Import Contacts or Document
                </Text>
                <Text style={[styles.dropZoneSub, { color: colors.textSecondary }]}>
                  Upload any Excel or CSV spreadsheet, sync live Google Sheets, or paste text. All data stays 100% private on your device.
                </Text>

                <Button
                  title={pickingFile || isLoading ? 'Parsing Document...' : 'Choose Excel or PDF Document'}
                  onPress={handlePickDocument}
                  loading={pickingFile || isLoading}
                  variant="primary"
                  icon={<Ionicons name="document-attach" size={18} color="#FFFFFF" />}
                  style={{ width: '100%', marginBottom: spacing.sm }}
                />

                <Button
                  title="🔗 Sync from Google Sheets (Live Link)"
                  onPress={() => setGSheetsModalVisible(true)}
                  variant="secondary"
                  size="md"
                  icon={<Ionicons name="link" size={18} color="#10B981" />}
                  style={{ width: '100%', marginBottom: spacing.sm }}
                />

                <Button
                  title="📋 Paste Raw Text / Roster"
                  onPress={() => setPasteModalVisible(true)}
                  variant="secondary"
                  size="md"
                  icon={<Ionicons name="clipboard-outline" size={18} color="#6366F1" />}
                  style={{ width: '100%', marginBottom: spacing.sm }}
                />

                <Button
                  title="Or Try Demo Data (Instant Sample)"
                  onPress={loadSyntheticBlueprintData}
                  variant="secondary"
                  size="md"
                  style={{ width: '100%', marginBottom: spacing.md }}
                />

                {/* FILE FORMAT SUPPORT TRANSPARENCY CARD */}
                <View
                  style={[
                    styles.formatSupportCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.formatBadgeRow}>
                    <Badge label="100% Full Support" variant="success" size="sm" />
                    <Text style={[styles.formatBadgeTitle, { color: colors.textPrimary }]}>
                      Excel (.xlsx, .xls) & CSV
                    </Text>
                  </View>
                  <Text style={[styles.formatBadgeDesc, { color: colors.textSecondary }]}>
                    Full auto-detection for all columns, customer names, phones, and custom attributes.
                  </Text>

                  <View style={[styles.formatBadgeRow, { marginTop: 8 }]}>
                    <Badge label="100% Live Sync" variant="success" size="sm" />
                    <Text style={[styles.formatBadgeTitle, { color: colors.textPrimary }]}>
                      Google Sheets Live Link
                    </Text>
                  </View>
                  <Text style={[styles.formatBadgeDesc, { color: colors.textSecondary }]}>
                    Direct real-time cloud synchronization from any public view link without exporting.
                  </Text>

                  <View style={[styles.formatBadgeRow, { marginTop: 8 }]}>
                    <Badge label="Digital Text Layer" variant="neutral" size="sm" />
                    <Text style={[styles.formatBadgeTitle, { color: colors.textPrimary }]}>
                      PDF Documents
                    </Text>
                  </View>
                  <Text style={[styles.formatBadgeDesc, { color: colors.textSecondary }]}>
                    Supports digitally exported PDFs with selectable text. Scanned photo PDFs (e.g. from camera scanner apps) will gain integrated OCR in an upcoming release.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MESSAGE STUDIO & WHATSAPP SIMULATOR               */}
        {/* ======================================================== */}
        {activeTab === 'STUDIO' && (
          <View style={styles.tabSection}>
            {/* Regional Language Switcher (भाषा) */}
            <View style={styles.languageSection}>
              <View style={styles.languageHeaderRow}>
                <Ionicons name="globe-outline" size={15} color="#10B981" />
                <Text style={[styles.subHeading, { color: colors.textPrimary }]}>
                  Message Language (भाषा)
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll}>
                {REGIONAL_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <Pressable
                      key={lang.code}
                      onPress={() => handleSelectLanguage(lang.code)}
                      style={({ pressed }) => [
                        styles.langPill,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? '#064E3B' : '#ECFDF5')
                            : (isDark ? '#1E293B' : colors.surfaceSubtle),
                          borderColor: isSelected ? '#10B981' : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={{ fontSize: 13 }}>{lang.flag}</Text>
                      <Text
                        style={[
                          styles.langPillText,
                          {
                            color: isSelected
                              ? (isDark ? '#34D399' : '#047857')
                              : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {lang.nativeName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Template Presets Quick Switcher */}
            <View style={styles.presetSection}>
              <Text style={[styles.subHeading, { color: colors.textPrimary, marginBottom: 8 }]}>
                {selectedLanguage === 'en'
                  ? 'Quick Template Presets'
                  : `Presets (${REGIONAL_LANGUAGES.find((l) => l.code === selectedLanguage)?.nativeName})`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                {getRegionalPresets(selectedLanguage).map((tpl) => (
                  <Pressable
                    key={tpl.id}
                    onPress={() => {
                      const matched = availableColumns.length > 0
                        ? autoMatchTemplate(tpl.text, availableColumns, mappingConfig).updatedTemplate
                        : tpl.text;
                      setTemplateText(matched);
                    }}
                    style={({ pressed }) => [
                      styles.presetPill,
                      {
                        backgroundColor: isDark ? '#1E293B' : colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Ionicons name="bookmark" size={13} color="#10B981" />
                    <Text style={[styles.presetPillText, { color: colors.textPrimary }]}>{tpl.title}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setTemplateText('')}
                  style={[styles.clearBtn, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: '#FECACA' }]}
                >
                  <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>Clear</Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* DYNAMIC VARIABLE TAGS DOCK (Tap to insert at cursor) */}
            {availableColumns.length > 0 && (
              <View style={styles.insertTagsDock}>
                <View style={styles.dockHeaderRow}>
                  <Text style={[styles.tagsDockLabel, { color: colors.textSecondary }]}>
                    Tap column to insert token:
                  </Text>
                  <Pressable
                    onPress={handleMatchSheetColumns}
                    style={({ pressed }) => [
                      styles.autoMatchBtn,
                      {
                        backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                        borderColor: isDark ? '#059669' : '#A7F3D0',
                      },
                      pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <Ionicons name="sparkles" size={11} color="#059669" />
                    <Text style={[styles.autoMatchBtnText, { color: isDark ? '#34D399' : '#059669' }]}>
                      Auto-Match To My Columns
                    </Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                  {availableColumns.map((col) => (
                    <Pressable
                      key={col}
                      onPress={() => handleInsertVariable(col)}
                      style={({ pressed }) => [
                        styles.tagInsertChip,
                        {
                          backgroundColor: isDark ? '#1E1B4B' : '#EFF6FF',
                          borderColor: isDark ? '#4338CA' : '#BFDBFE',
                        },
                        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                      ]}
                    >
                      <Ionicons name="add-circle" size={14} color={isDark ? '#A5B4FC' : '#2563EB'} />
                      <Text style={[styles.tagInsertText, { color: isDark ? '#A5B4FC' : '#2563EB' }]}>
                        {`{{${col}}}`}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* MESSAGE EDITOR INPUT */}
            <View
              style={[
                styles.composerBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.composerInput, { color: colors.textPrimary }]}
                multiline
                value={templateText}
                onChangeText={setTemplateText}
                onSelectionChange={(e) => setCursorSelection(e.nativeEvent.selection)}
                placeholder="Type your message here or tap variable chips above to insert {{Column}}..."
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="top"
              />
              <View style={[styles.composerFooter, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.charCountText, { color: colors.textTertiary }]}>
                  {templateText.length} characters • {templateText.trim().split(/\s+/).filter(Boolean).length} words
                </Text>
              </View>
            </View>

            {/* WHATSAPP CHAT BUBBLE SIMULATOR */}
            {records.length > 0 && templateText.trim().length > 0 && (
              <View style={styles.simulatorSection}>
                <View style={styles.simulatorHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
                    <Text style={[styles.subHeading, { color: colors.textPrimary }]}>
                      Live Simulator
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <CopyButton textToCopy={renderedPreview} label="Copy" size="sm" />

                    {/* Recipient Cycler */}
                    <View style={styles.cyclerControls}>
                    <Pressable
                      onPress={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={previewIndex === 0}
                      style={[
                        styles.cycleBtn,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                        previewIndex === 0 && { opacity: 0.3 },
                      ]}
                    >
                      <Ionicons name="chevron-back" size={14} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.cyclerText, { color: colors.textSecondary }]}>
                      {previewIndex + 1} / {records.length}
                    </Text>
                    <Pressable
                      onPress={() => setPreviewIndex((prev) => Math.min(records.length - 1, prev + 1))}
                      disabled={previewIndex === records.length - 1}
                      style={[
                        styles.cycleBtn,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                        previewIndex === records.length - 1 && { opacity: 0.3 },
                      ]}
                    >
                      <Ionicons name="chevron-forward" size={14} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </View>

                {/* WhatsApp Chat Container */}
                <View
                  style={[
                    styles.waChatWindow,
                    {
                      backgroundColor: isDark ? '#0D1B1E' : '#EFEAE2',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D1D5DB',
                    },
                  ]}
                >
                  {/* Chat Contact Header */}
                  <View style={styles.waContactHeader}>
                    <View style={styles.waAvatar}>
                      <Text style={styles.waAvatarText}>
                        {(currentPreviewRecord?.studentName || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.waContactName, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                        {currentPreviewRecord?.studentName || 'Contact'}
                      </Text>
                      <Text style={styles.waOnlineText}>online</Text>
                    </View>
                  </View>

                  {/* Outgoing WhatsApp Bubble */}
                  <View
                    style={[
                      styles.waBubble,
                      {
                        backgroundColor: isDark ? '#005C4B' : '#E7FCE8',
                        borderColor: isDark ? '#007A64' : '#BBF7D0',
                      },
                    ]}
                  >
                    <Text style={[styles.waMessageText, { color: isDark ? '#E9EDEF' : '#111827' }]}>
                      {renderedPreview}
                    </Text>
                    <View style={styles.waBubbleFooter}>
                      <Text style={[styles.waTimestamp, { color: isDark ? '#8696A0' : '#667781' }]}>
                        12:30 PM
                      </Text>
                      <Ionicons name="checkmark-done" size={14} color={isDark ? '#53BDEB' : '#53BDEB'} />
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* STICKY FLOATING BOTTOM BAR */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
          },
        ]}
      >
        <View style={styles.bottomSummary}>
          <View style={styles.statusPulseSmall} />
          <Text style={[styles.bottomSummaryText, { color: colors.textPrimary }]}>
            {records.length > 0
              ? `${filterResult.eligibleCount} of ${records.length} Targeted`
              : 'No Sheet Loaded'}
          </Text>
        </View>

        <Pressable
          onPress={handleNextStep}
          style={({ pressed }) => [
            styles.proceedPrimaryBtn,
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.proceedBtnText}>Choose Method →</Text>
        </Pressable>
      </View>

      {/* PASTE TEXT / ROSTER MODAL */}
      <Modal
        visible={pasteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Paste Roster or Chat Table
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Paste names, mobile numbers, and dues from WhatsApp, email, or bills.
                </Text>
              </View>
              <Pressable onPress={() => setPasteModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.pasteTextInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: isDark ? '#1E293B' : colors.surfaceSubtle,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                },
              ]}
              multiline
              value={pastedText}
              onChangeText={setPastedText}
              placeholder={`Example:\n1. Rajesh Kumar 9876543210 ₹4,500\n2. Sunita Sharma 9059478739 1200\n3. Amit Patel 9123456780`}
              placeholderTextColor={colors.textTertiary}
              textAlignVertical="top"
            />

            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setPasteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Parse Contacts"
                variant="primary"
                size="md"
                onPress={handleProcessPastedText}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* GOOGLE SHEETS LIVE SYNC MODAL */}
      <Modal
        visible={gSheetsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGSheetsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="link" size={18} color="#10B981" />
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    Sync Google Sheets
                  </Text>
                </View>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Paste any Google Sheet URL to import rows and dues in real time.
                </Text>
              </View>
              <Pressable onPress={() => setGSheetsModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.gSheetUrlInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: isDark ? '#1E293B' : colors.surfaceSubtle,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                },
              ]}
              value={gSheetUrl}
              onChangeText={setGSheetUrl}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              selectTextOnFocus
            />

            <View
              style={[
                styles.infoCalloutBox,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? '#059669' : '#A7F3D0',
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={16} color="#10B981" />
              <Text style={[styles.infoCalloutText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                Important: In Google Sheets, click "Share" → General Access → change to "Anyone with the link can view".
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setGSheetsModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={isSyncingGSheet ? 'Syncing...' : 'Fetch & Sync Data'}
                variant="primary"
                size="md"
                onPress={handleSyncGoogleSheet}
                loading={isSyncingGSheet}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PDF DIAGNOSTIC & ASSISTANCE MODAL */}
      <Modal
        visible={pdfDiagnosticModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPdfDiagnosticModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={pdfDiagnostic?.isScannedImageOnly ? 'scan-circle' : 'print'}
                    size={20}
                    color={pdfDiagnostic?.isScannedImageOnly ? '#F59E0B' : '#3B82F6'}
                  />
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {pdfDiagnostic?.isScannedImageOnly
                      ? 'Scanned Document Detected'
                      : 'Vector Outlined PDF'}
                  </Text>
                </View>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {pdfDiagnostic?.isScannedImageOnly
                    ? `${pdfFileName} contains scanned camera photos${
                        pdfDiagnostic?.producer ? ` (${pdfDiagnostic.producer})` : ''
                      } without selectable text. Choose how you'd like to import:`
                    : `${pdfFileName} was printed with text converted to vector paths${
                        pdfDiagnostic?.producer ? ` (${pdfDiagnostic.producer})` : ''
                      }. Choose how you'd like to import:`}
                </Text>
              </View>
              <Pressable onPress={() => setPdfDiagnosticModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {/* Option 1: Sync Google Sheets (Highlighted) */}
              <Pressable
                onPress={() => {
                  setPdfDiagnosticModalVisible(false);
                  setGSheetsModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.diagOptionCard,
                  {
                    backgroundColor: isDark
                      ? pressed
                        ? '#064E3B'
                        : '#064E3B40'
                      : pressed
                      ? '#D1FAE5'
                      : '#ECFDF5',
                    borderColor: '#10B981',
                  },
                ]}
              >
                <View style={[styles.diagOptionIconBox, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="link" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.diagOptionTitle, { color: colors.textPrimary }]}>
                      Sync from Google Sheets Link
                    </Text>
                    <Badge label="Recommended" variant="success" size="sm" />
                  </View>
                  <Text style={[styles.diagOptionSubtitle, { color: colors.textSecondary }]}>
                    If your data is from Google Sheets, sync all rows with live accuracy.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              {/* Option 2: Paste Raw Text / OCR */}
              <Pressable
                onPress={() => {
                  setPdfDiagnosticModalVisible(false);
                  setPasteModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.diagOptionCard,
                  {
                    backgroundColor: isDark
                      ? pressed
                        ? '#312E81'
                        : '#312E8140'
                      : pressed
                      ? '#E0E7FF'
                      : '#EEF2FF',
                    borderColor: '#6366F1',
                  },
                ]}
              >
                <View style={[styles.diagOptionIconBox, { backgroundColor: '#6366F120' }]}>
                  <Ionicons name="clipboard-outline" size={20} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.diagOptionTitle, { color: colors.textPrimary }]}>
                    Paste Roster Text / OCR
                  </Text>
                  <Text style={[styles.diagOptionSubtitle, { color: colors.textSecondary }]}>
                    Tip: Open this photo in Google Lens or Gallery, tap "Copy text", and paste here.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>

              {/* Option 3: Choose Excel or CSV */}
              <Pressable
                onPress={() => {
                  setPdfDiagnosticModalVisible(false);
                  handlePickDocument();
                }}
                style={({ pressed }) => [
                  styles.diagOptionCard,
                  {
                    backgroundColor: isDark
                      ? pressed
                        ? '#1E293B'
                        : '#1E293B60'
                      : pressed
                      ? '#F1F5F9'
                      : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.diagOptionIconBox, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.diagOptionTitle, { color: colors.textPrimary }]}>
                    Choose Excel (.xlsx) or CSV
                  </Text>
                  <Text style={[styles.diagOptionSubtitle, { color: colors.textSecondary }]}>
                    Export directly as Excel or CSV from Google Sheets or your school ERP.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            </ScrollView>

            <View style={{ marginTop: spacing.md }}>
              <Button
                title="Dismiss"
                variant="secondary"
                size="md"
                onPress={() => setPdfDiagnosticModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM AUDIENCE FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="funnel" size={18} color="#10B981" />
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    Add Custom Filter
                  </Text>
                </View>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Filter your audience by any column in your spreadsheet.
                </Text>
              </View>
              <Pressable onPress={() => setFilterModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Step 1: Select Column */}
              <Text style={[styles.customFilterFieldLabel, { color: colors.textSecondary }]}>
                1. SELECT COLUMN
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {availableColumns.map((col) => {
                    const isSelected = filterRuleCol === col;
                    return (
                      <Pressable
                        key={col}
                        onPress={() => setFilterRuleCol(col)}
                        style={[
                          styles.columnSelectPill,
                          {
                            backgroundColor: isSelected ? '#10B981' : isDark ? '#1E293B' : colors.surfaceSubtle,
                            borderColor: isSelected ? '#10B981' : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.columnSelectPillText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {col}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Step 2: Select Operator */}
              <Text style={[styles.customFilterFieldLabel, { color: colors.textSecondary }]}>
                2. CONDITION
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                {[
                  { id: 'equals', label: 'Equals (=)' },
                  { id: 'contains', label: 'Contains' },
                  { id: 'greater_than', label: 'Greater than (>)' },
                  { id: 'less_than', label: 'Less than (<)' },
                  { id: 'not_empty', label: 'Not Empty' },
                ].map((op) => {
                  const isSelected = filterRuleOp === op.id;
                  return (
                    <Pressable
                      key={op.id}
                      onPress={() => setFilterRuleOp(op.id as any)}
                      style={[
                        styles.opSelectPill,
                        {
                          backgroundColor: isSelected ? '#6366F1' : isDark ? '#1E293B' : colors.surfaceSubtle,
                          borderColor: isSelected ? '#6366F1' : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.opSelectPillText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                        {op.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Step 3: Target Value */}
              {filterRuleOp !== 'not_empty' && (
                <>
                  <Text style={[styles.customFilterFieldLabel, { color: colors.textSecondary }]}>
                    3. VALUE TO MATCH
                  </Text>
                  <TextInput
                    style={[
                      styles.customFilterInput,
                      {
                        color: colors.textPrimary,
                        backgroundColor: isDark ? '#1E293B' : colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                    value={filterRuleVal}
                    onChangeText={setFilterRuleVal}
                    placeholder="e.g. VIP, Mumbai, Pending, 1000..."
                    placeholderTextColor={colors.textTertiary}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setFilterModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Apply Filter"
                variant="primary"
                size="md"
                onPress={handleAddCustomFilterRule}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  stepItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepNumberCircleActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepItemLabelActive: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepItemInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepNumberCircleInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberTextInactive: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepItemLabelInactive: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabContainer: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    padding: 3,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.md,
    gap: 6,
  },
  segmentPillActive: {
    ...shadows.subtle,
  },
  segmentText: {
    fontSize: 13,
  },
  body: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: 90, // room for floating bottom bar
  },
  tabSection: {
    gap: spacing.base,
  },
  fileCard: {
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
  },
  fileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetailsWrap: {
    flex: 1,
  },
  fileTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  fileSub: {
    fontSize: 12,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  replaceBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  worksheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.15)',
    gap: 8,
  },
  worksheetLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 6,
  },
  sheetPillText: {
    fontSize: 12,
  },
  columnTagsBox: {
    gap: 6,
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  columnPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  columnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  columnPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dataInspectorCard: {
    gap: spacing.sm,
  },
  rowInspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cyclerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cycleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyclerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordRowCard: {
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
  },
  recordMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  recordAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  recordName: {
    fontSize: 15,
    fontWeight: '700',
  },
  recordPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  rawAttributesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  attrChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  attrChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  switchToStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  switchToStudioText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  dropZoneContainer: {
    borderRadius: radii.xxl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dropZoneTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  dropZoneSub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  presetSection: {
    gap: 4,
  },
  presetScroll: {
    flexGrow: 0,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 8,
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insertTagsDock: {
    gap: 8,
  },
  dockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsDockLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  autoMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  autoMatchBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tagsScroll: {
    flexGrow: 0,
  },
  tagInsertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 6,
  },
  tagInsertText: {
    fontSize: 12,
    fontWeight: '700',
  },
  composerBox: {
    borderRadius: radii.xl,
    borderWidth: 1,
    minHeight: 130,
    padding: spacing.md,
  },
  composerInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 90,
  },
  composerFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  charCountText: {
    fontSize: 11,
    fontWeight: '500',
  },
  simulatorSection: {
    gap: spacing.sm,
  },
  simulatorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waChatWindow: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  waContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  waAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  waContactName: {
    fontSize: 13,
    fontWeight: '700',
  },
  waOnlineText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  waBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  waMessageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  waBubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  waTimestamp: {
    fontSize: 10,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: 12,
    borderTopWidth: 1,
    ...shadows.card,
  },
  bottomSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPulseSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  bottomSummaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  proceedPrimaryBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.lg,
  },
  proceedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  pasteTextInput: {
    height: 160,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  audienceFilterCard: {
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
  },
  audienceFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  audienceFilterSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  activeRulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  activeRulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: 6,
  },
  activeRuleText: {
    fontSize: 12,
  },
  customFilterFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  columnSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  columnSelectPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  opSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  opSelectPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customFilterInput: {
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  formatSupportCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    width: '100%',
  },
  formatBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  formatBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  formatBadgeDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  languageSection: {
    marginBottom: spacing.md,
  },
  languageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  langScroll: {
    flexDirection: 'row',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 8,
  },
  langPillText: {
    fontSize: 12,
  },
  gSheetUrlInput: {
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  infoCalloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  diagOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  diagOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  diagOptionSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});
