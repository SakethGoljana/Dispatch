/**
 * Student and Raw Row Models
 * Designed to handle any spreadsheet structure with arbitrary columns.
 */

export interface RawSpreadsheetRow {
  __rowNumber: number;
  [columnName: string]: string | number | null | undefined;
}

export interface NormalizedStudentRecord {
  id: string;
  rowNumber: number;

  // Semantic core fields (mapped by teacher)
  studentName: string;
  surname?: string;
  class?: string;
  section?: string;
  parentPhone: string;          // Normalized E.164 phone string
  rawPhone: string;             // Raw phone as imported from file
  outstandingBalance?: number;  // Numeric balance (can be 0 or negative)
  remarks?: string;

  // All other unmapped or arbitrary columns preserved dynamically
  customFields: Record<string, string | number>;
  rawRow?: Record<string, any>;

  // Validation flags
  isValidPhone: boolean;
  validationErrors: string[];
}
