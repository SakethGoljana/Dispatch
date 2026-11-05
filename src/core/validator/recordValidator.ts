/**
 * Record Validator & Normalizer
 * Normalizes phone numbers (E.164), parses balances (including negatives and ₹ currency),
 * flags missing values, and identifies shared sibling numbers.
 */

import {
  ColumnMappingConfig,
  NormalizedStudentRecord,
  RawSpreadsheetRow,
} from '../../types';

export interface PhoneValidationResult {
  normalizedPhone: string;
  isValid: boolean;
  error?: string;
}

export function normalizePhoneNumber(
  rawPhoneInput: string | number | null | undefined,
  defaultCountryCode = '+91'
): PhoneValidationResult {
  if (rawPhoneInput === null || rawPhoneInput === undefined) {
    return { normalizedPhone: '', isValid: false, error: 'Phone number is missing' };
  }

  const rawStr = String(rawPhoneInput).trim();
  if (rawStr === '') {
    return { normalizedPhone: '', isValid: false, error: 'Phone number is empty' };
  }

  // Remove non-digit characters except leading plus
  let cleaned = rawStr.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1);
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return { normalizedPhone: cleaned, isValid: true };
    }
    return { normalizedPhone: cleaned, isValid: false, error: 'Invalid international number length' };
  }

  // Pure digits handling
  const digits = cleaned.replace(/\D/g, '');

  // 10-digit standard Indian mobile
  if (digits.length === 10) {
    const cleanPrefix = defaultCountryCode.startsWith('+')
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    return { normalizedPhone: `${cleanPrefix}${digits}`, isValid: true };
  }

  // 11-digit with leading zero (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    const cleanPrefix = defaultCountryCode.startsWith('+')
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    return { normalizedPhone: `${cleanPrefix}${digits.slice(1)}`, isValid: true };
  }

  // 12-digit already prefixed with 91 (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return { normalizedPhone: `+${digits}`, isValid: true };
  }

  return {
    normalizedPhone: rawStr,
    isValid: false,
    error: `Expected 10-digit phone number, got ${digits.length} digits`,
  };
}

export function parseMonetaryValue(val: string | number | null | undefined): number | undefined {
  if (val === null || val === undefined || String(val).trim() === '') {
    return undefined;
  }

  if (typeof val === 'number') {
    return isNaN(val) ? undefined : val;
  }

  // Clean currency symbols, commas, spaces
  const cleanStr = String(val).replace(/[₹$,\s]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? undefined : parsed;
}

export interface ValidationSummaryReport {
  totalRecords: number;
  validPhoneCount: number;
  invalidPhoneCount: number;
  zeroBalanceCount: number;
  negativeBalanceCount: number;
  positiveBalanceCount: number;
  sharedPhoneGroupCount: number;
}

export function normalizeAndValidateDataset(
  rawRows: RawSpreadsheetRow[],
  mappingConfig: ColumnMappingConfig
): {
  records: NormalizedStudentRecord[];
  summary: ValidationSummaryReport;
} {
  const { mappings, defaultCountryCode } = mappingConfig;
  const nameCol = mappings.studentName;
  const surnameCol = mappings.surname;
  const phoneCol = mappings.parentPhone;
  const classCol = mappings.class;
  const sectionCol = mappings.section;
  const balanceCol = mappingConfig.balanceColumnKey || mappings.outstandingBalance;
  const remarksCol = mappings.remarks;

  const phoneFrequency = new Map<string, number>();

  // First pass: Count phone numbers for sibling detection
  for (const row of rawRows) {
    if (phoneCol && row[phoneCol]) {
      const rawP = String(row[phoneCol]).trim();
      const norm = normalizePhoneNumber(rawP, defaultCountryCode);
      if (norm.isValid) {
        phoneFrequency.set(norm.normalizedPhone, (phoneFrequency.get(norm.normalizedPhone) || 0) + 1);
      }
    }
  }

  const records: NormalizedStudentRecord[] = [];
  let validPhoneCount = 0;
  let invalidPhoneCount = 0;
  let zeroBalanceCount = 0;
  let negativeBalanceCount = 0;
  let positiveBalanceCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const errors: string[] = [];

    // Extract student name
    const studentName = nameCol && raw[nameCol] ? String(raw[nameCol]).trim() : '';
    if (!studentName) {
      errors.push('Student name is missing');
    }

    const surname = surnameCol && raw[surnameCol] ? String(raw[surnameCol]).trim() : undefined;
    const studentClass = classCol && raw[classCol] ? String(raw[classCol]).trim() : undefined;
    const section = sectionCol && raw[sectionCol] ? String(raw[sectionCol]).trim() : undefined;

    // Extract phone
    const rawPhone = phoneCol && raw[phoneCol] ? String(raw[phoneCol]).trim() : '';
    const phoneNorm = normalizePhoneNumber(rawPhone, defaultCountryCode);

    if (phoneNorm.isValid) {
      validPhoneCount++;
    } else {
      invalidPhoneCount++;
      errors.push(phoneNorm.error || 'Invalid phone number');
    }

    // Extract balance
    const rawBalance = balanceCol && raw[balanceCol] !== undefined ? raw[balanceCol] : undefined;
    const balance = parseMonetaryValue(rawBalance);

    if (balance !== undefined) {
      if (balance > 0) positiveBalanceCount++;
      else if (balance === 0) zeroBalanceCount++;
      else if (balance < 0) negativeBalanceCount++;
    }

    const remarks = remarksCol && raw[remarksCol] ? String(raw[remarksCol]).trim() : undefined;

    // Preserve all other arbitrary columns dynamically
    const customFields: Record<string, string | number> = {};
    for (const [colName, val] of Object.entries(raw)) {
      if (colName === '__rowNumber') continue;
      if (val !== null && val !== undefined) {
        customFields[colName] = val;
      }
    }

    records.push({
      id: `std-${raw.__rowNumber || i + 1}`,
      rowNumber: raw.__rowNumber || i + 1,
      studentName,
      surname,
      class: studentClass,
      section,
      parentPhone: phoneNorm.normalizedPhone,
      rawPhone,
      outstandingBalance: balance,
      remarks,
      customFields,
      isValidPhone: phoneNorm.isValid,
      validationErrors: errors,
    });
  }

  // Count shared phone groups (siblings)
  let sharedPhoneGroupCount = 0;
  for (const count of phoneFrequency.values()) {
    if (count > 1) sharedPhoneGroupCount++;
  }

  const summary: ValidationSummaryReport = {
    totalRecords: records.length,
    validPhoneCount,
    invalidPhoneCount,
    zeroBalanceCount,
    negativeBalanceCount,
    positiveBalanceCount,
    sharedPhoneGroupCount,
  };

  return { records, summary };
}
