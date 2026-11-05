/**
 * Dynamic Column Mapping Types
 * Supports any arbitrary Excel or CSV file.
 */

export type SemanticFieldKey =
  | 'studentName'
  | 'surname'
  | 'class'
  | 'section'
  | 'parentPhone'
  | 'outstandingBalance'
  | 'remarks'
  | 'date'
  | 'attendanceStatus'
  | 'marks';

export interface SemanticFieldDefinition {
  key: SemanticFieldKey;
  label: string;
  required: boolean;
  description: string;
  aliases: string[]; // Known common names across school ERPs/spreadsheets
}

export interface ColumnMappingConfig {
  mappings: Partial<Record<SemanticFieldKey, string>>; // semanticKey -> originalColumnHeader
  balanceColumnKey?: string; // Explicitly chosen balance column when multiple exist
  unmappedColumns: string[];  // Available as raw template variables
  defaultCountryCode: string; // e.g. "+91"
}

export interface SavedMappingPreset {
  id: string;
  name: string;
  mapping: ColumnMappingConfig;
  createdAt: string;
}
