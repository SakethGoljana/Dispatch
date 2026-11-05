import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  ColumnMappingConfig,
  NormalizedStudentRecord,
  SemanticFieldKey,
} from '../../types';
import { ParsedSpreadsheetResult, parseSpreadsheet } from '../parsers/spreadsheetParser';
import { autoDetectMappings } from '../mapper/columnMapper';
import {
  normalizeAndValidateDataset,
  ValidationSummaryReport,
} from '../validator/recordValidator';
import { SAMPLE_LEDGER_COLUMNS, SAMPLE_LEDGER_ROWS } from '../../fixtures/sampleLedger';
import { BUILT_IN_TEMPLATES } from '../template/templateLibrary';
import {
  filterAndPrepareRecipients,
  RecipientFilterCriteria,
  RecipientFilterResult,
} from '../filters/recipientFilter';
import { parseRawTextToStructuredRecords } from '../parsers/pdfTableParser';

export interface UploadedFileMetadata {
  name: string;
  size?: number;
  uri?: string;
  sheetNames: string[];
}

interface DatasetContextType {
  fileInfo: UploadedFileMetadata | null;
  parsedResult: ParsedSpreadsheetResult | null;
  mappingConfig: ColumnMappingConfig;
  isBalanceAmbiguous: boolean;
  candidateBalanceColumns: string[];
  records: NormalizedStudentRecord[];
  summary: ValidationSummaryReport | null;
  isLoading: boolean;
  error: string | null;

  // Template State
  templateText: string;
  setTemplateText: (text: string) => void;
  requiredTokens: string[];
  setRequiredTokens: (tokens: string[]) => void;
  selectTemplatePreset: (templateId: string) => void;

  // Recipient Filter State & Computed Result
  filterCriteria: RecipientFilterCriteria;
  setFilterCriteria: (criteria: Partial<RecipientFilterCriteria>) => void;
  filterResult: RecipientFilterResult;
  toggleStudentExclusion: (studentId: string) => void;

  // Actions
  loadSpreadsheetData: (data: string | ArrayBuffer, fileName: string, type?: 'base64' | 'string' | 'buffer') => void;
  loadTextOrPDFData: (rawText: string, docName: string) => void;
  loadSyntheticBlueprintData: () => void;
  selectWorksheet: (sheetName: string) => void;
  setFieldMapping: (key: SemanticFieldKey, columnName: string) => void;
  setBalanceColumn: (columnName: string) => void;
  clearDataset: () => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileInfo, setFileInfo] = useState<UploadedFileMetadata | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSpreadsheetResult | null>(null);
  const [rawWorkbookData, setRawWorkbookData] = useState<any>(null);
  const [rawDataType, setRawDataType] = useState<any>('base64');

  const [mappingConfig, setMappingConfig] = useState<ColumnMappingConfig>({
    mappings: {},
    unmappedColumns: [],
    defaultCountryCode: '+91',
  });

  const [isBalanceAmbiguous, setIsBalanceAmbiguous] = useState(false);
  const [candidateBalanceColumns, setCandidateBalanceColumns] = useState<string[]>([]);
  const [records, setRecords] = useState<NormalizedStudentRecord[]>([]);
  const [summary, setSummary] = useState<ValidationSummaryReport | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template state (default to universal payment/balance reminder)
  const [templateText, setTemplateText] = useState(BUILT_IN_TEMPLATES[0].body);
  const [requiredTokens, setRequiredTokens] = useState<string[]>(['STUDENT_NAME']);

  // Filter criteria state - default to universal inclusion (100% of valid contacts)
  const [filterCriteria, setFilterCriteriaState] = useState<RecipientFilterCriteria>({
    selectedClass: 'ALL',
    selectedSection: 'ALL',
    onlyPositiveBalance: false,
    customRules: [],
    manuallyExcludedIds: new Set<string>(),
  });

  const setFilterCriteria = (updates: Partial<RecipientFilterCriteria>) => {
    setFilterCriteriaState((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const toggleStudentExclusion = (studentId: string) => {
    setFilterCriteriaState((prev) => {
      const nextSet = new Set(prev.manuallyExcludedIds);
      if (nextSet.has(studentId)) {
        nextSet.delete(studentId);
      } else {
        nextSet.add(studentId);
      }
      return {
        ...prev,
        manuallyExcludedIds: nextSet,
      };
    });
  };

  const selectTemplatePreset = (templateId: string) => {
    const found = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
    if (found) {
      setTemplateText(found.body);
      const req = found.variables.filter((v) => v.required).map((v) => v.token);
      setRequiredTokens(req);
    }
  };

  // Helper to re-process mapping and validation
  const processParsedData = (
    result: ParsedSpreadsheetResult,
    configOverride?: Partial<ColumnMappingConfig>
  ) => {
    const auto = autoDetectMappings(result.headers, mappingConfig.defaultCountryCode);
    const effectiveConfig: ColumnMappingConfig = {
      ...auto.config,
      ...configOverride,
      mappings: {
        ...auto.config.mappings,
        ...(configOverride?.mappings || {}),
      },
    };

    setIsBalanceAmbiguous(auto.balanceAmbiguityDetected);
    setCandidateBalanceColumns(auto.candidateBalanceColumns);
    setMappingConfig(effectiveConfig);

    const validated = normalizeAndValidateDataset(result.rows, effectiveConfig);
    setRecords(validated.records);
    setSummary(validated.summary);
  };

  const loadSpreadsheetData = (
    data: string | ArrayBuffer,
    fileName: string,
    type: 'base64' | 'string' | 'buffer' = 'base64'
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setRawWorkbookData(data);
      setRawDataType(type);

      const parsed = parseSpreadsheet(data, { type });
      setParsedResult(parsed);

      setFileInfo({
        name: fileName,
        sheetNames: parsed.sheetNames,
      });

      processParsedData(parsed);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse spreadsheet');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyntheticBlueprintData = () => {
    setIsLoading(true);
    setError(null);

    const syntheticResult: ParsedSpreadsheetResult = {
      sheetNames: ['CLASS-2-AS ON 25-09-2026'],
      selectedSheet: 'CLASS-2-AS ON 25-09-2026',
      headerRowIndex: 0,
      headers: SAMPLE_LEDGER_COLUMNS,
      rows: SAMPLE_LEDGER_ROWS,
      totalRowsRead: SAMPLE_LEDGER_ROWS.length,
      blankRowsSkipped: 0,
    };

    setFileInfo({
      name: 'CLASS-2-AS ON 25-09-2026(1).xlsx',
      sheetNames: ['CLASS-2-AS ON 25-09-2026'],
    });

    setParsedResult(syntheticResult);
    processParsedData(syntheticResult);
    setIsLoading(false);
  };

  const loadTextOrPDFData = (rawText: string, docName: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const extracted = parseRawTextToStructuredRecords(rawText);
      if (extracted.rows.length === 0) {
        throw new Error('No contacts with valid 10-digit phone numbers were found in this text or document.');
      }

      const parsed: ParsedSpreadsheetResult = {
        sheetNames: ['Extracted Document'],
        selectedSheet: 'Extracted Document',
        headerRowIndex: 0,
        headers: extracted.headers,
        rows: extracted.rows,
        totalRowsRead: extracted.rows.length,
        blankRowsSkipped: 0,
      };

      setParsedResult(parsed);
      setFileInfo({
        name: docName,
        sheetNames: ['Extracted Document'],
      });

      processParsedData(parsed);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract contacts from document');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const selectWorksheet = (sheetName: string) => {
    if (!rawWorkbookData) return;
    try {
      setIsLoading(true);
      const parsed = parseSpreadsheet(rawWorkbookData, {
        type: rawDataType,
        sheetName,
      });
      setParsedResult(parsed);
      processParsedData(parsed);
    } catch (err: any) {
      setError(err?.message || 'Failed to switch worksheet');
    } finally {
      setIsLoading(false);
    }
  };

  const setFieldMapping = (key: SemanticFieldKey, columnName: string) => {
    const updatedMappings = { ...mappingConfig.mappings, [key]: columnName };
    const updatedConfig: ColumnMappingConfig = {
      ...mappingConfig,
      mappings: updatedMappings,
    };
    setMappingConfig(updatedConfig);

    if (parsedResult) {
      const validated = normalizeAndValidateDataset(parsedResult.rows, updatedConfig);
      setRecords(validated.records);
      setSummary(validated.summary);
    }
  };

  const setBalanceColumn = (columnName: string) => {
    const updatedConfig: ColumnMappingConfig = {
      ...mappingConfig,
      balanceColumnKey: columnName,
      mappings: {
        ...mappingConfig.mappings,
        outstandingBalance: columnName,
      },
    };
    setMappingConfig(updatedConfig);

    if (parsedResult) {
      const validated = normalizeAndValidateDataset(parsedResult.rows, updatedConfig);
      setRecords(validated.records);
      setSummary(validated.summary);
    }
  };

  const clearDataset = () => {
    setFileInfo(null);
    setParsedResult(null);
    setRawWorkbookData(null);
    setRecords([]);
    setSummary(null);
    setError(null);
  };

  // Dynamically compute filtered recipients using the single source of truth
  const filterResult = useMemo(() => {
    return filterAndPrepareRecipients(records, templateText, requiredTokens, filterCriteria, mappingConfig);
  }, [records, templateText, requiredTokens, filterCriteria, mappingConfig]);

  return (
    <DatasetContext.Provider
      value={{
        fileInfo,
        parsedResult,
        mappingConfig,
        isBalanceAmbiguous,
        candidateBalanceColumns,
        records,
        summary,
        isLoading,
        error,
        templateText,
        setTemplateText,
        requiredTokens,
        setRequiredTokens,
        selectTemplatePreset,
        filterCriteria,
        setFilterCriteria,
        filterResult,
        toggleStudentExclusion,
        loadSpreadsheetData,
        loadTextOrPDFData,
        loadSyntheticBlueprintData,
        selectWorksheet,
        setFieldMapping,
        setBalanceColumn,
        clearDataset,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};
