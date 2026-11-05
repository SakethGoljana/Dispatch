import * as XLSX from 'xlsx';
import { parseSpreadsheet } from '../core/parsers/spreadsheetParser';
import { detectHeaderRow } from '../core/parsers/headerDetector';
import { autoDetectMappings } from '../core/mapper/columnMapper';
import {
  normalizeAndValidateDataset,
  normalizePhoneNumber,
  parseMonetaryValue,
} from '../core/validator/recordValidator';

describe('Universal Header Detector', () => {
  it('detects header on row 0 for standard spreadsheets', () => {
    const matrix = [
      ['Student Name', 'Phone Number', 'Class', 'Fee Balance'],
      ['Aarav Sharma', '9876543210', '2', '5000'],
      ['Priya Patel', '9123456789', '2', '0'],
    ];

    const result = detectHeaderRow(matrix);
    expect(result.headerRowIndex).toBe(0);
    expect(result.headers).toEqual(['Student Name', 'Phone Number', 'Class', 'Fee Balance']);
  });

  it('detects header on row 2 when school banners and blank rows precede the table', () => {
    const matrix = [
      ['ST. XAVIER HIGH SCHOOL — ANNUAL FEE REGISTER 2026'],
      ['', ''], // blank row
      ['S.NO', 'STUDENT NAME', 'PHONE NO', 'TOTAL DUE', 'REMARKS'],
      ['1', 'Aarav Sharma', '9876543210', '12500', 'Paid partial'],
    ];

    const result = detectHeaderRow(matrix);
    expect(result.headerRowIndex).toBe(2);
    expect(result.headers).toEqual(['S.NO', 'STUDENT NAME', 'PHONE NO', 'TOTAL DUE', 'REMARKS']);
  });
});

describe('Phone Number Normalization & Validation', () => {
  it('normalizes standard 10-digit Indian numbers with +91', () => {
    const res = normalizePhoneNumber('9876543210', '+91');
    expect(res.isValid).toBe(true);
    expect(res.normalizedPhone).toBe('+919876543210');
  });

  it('normalizes 11-digit numbers with leading zero', () => {
    const res = normalizePhoneNumber('09876543210', '+91');
    expect(res.isValid).toBe(true);
    expect(res.normalizedPhone).toBe('+919876543210');
  });

  it('normalizes numbers already starting with country code 91', () => {
    const res = normalizePhoneNumber('919876543210', '+91');
    expect(res.isValid).toBe(true);
    expect(res.normalizedPhone).toBe('+919876543210');
  });

  it('preserves valid international + numbers', () => {
    const res = normalizePhoneNumber('+14155552671', '+91');
    expect(res.isValid).toBe(true);
    expect(res.normalizedPhone).toBe('+14155552671');
  });

  it('flags numbers with invalid length', () => {
    const res = normalizePhoneNumber('12345', '+91');
    expect(res.isValid).toBe(false);
  });

  it('flags missing or empty numbers', () => {
    expect(normalizePhoneNumber('', '+91').isValid).toBe(false);
    expect(normalizePhoneNumber(null, '+91').isValid).toBe(false);
  });
});

describe('Monetary Value Parsing', () => {
  it('parses formatted Indian currency strings with ₹ and commas', () => {
    expect(parseMonetaryValue('₹11,500')).toBe(11500);
    expect(parseMonetaryValue('14,667.50')).toBe(14667.5);
  });

  it('parses negative credit balances correctly', () => {
    expect(parseMonetaryValue('-1333')).toBe(-1333);
    expect(parseMonetaryValue('-₹1,200')).toBe(-1200);
  });

  it('handles zero values', () => {
    expect(parseMonetaryValue(0)).toBe(0);
    expect(parseMonetaryValue('0')).toBe(0);
  });
});

describe('Universal Column Mapping & Blueprint Edge Cases', () => {
  it('detects multiple balance columns and flags balance ambiguity', () => {
    const blueprintHeaders = [
      'S.NO',
      'RECEIPT.NO',
      'C',
      'SEC',
      'SUR NAME',
      'STUDENT NAME',
      'PHONE NO',
      '25-26 Bal',
      'Up to S2.Bal',
      'Upto B2.Bal',
      'Up to T2.Bal',
      'REMARKS',
    ];

    const result = autoDetectMappings(blueprintHeaders, '+91');
    expect(result.balanceAmbiguityDetected).toBe(true);
    expect(result.candidateBalanceColumns).toContain('25-26 Bal');
    expect(result.candidateBalanceColumns).toContain('Up to S2.Bal');
    expect(result.candidateBalanceColumns).toContain('Upto B2.Bal');
    expect(result.candidateBalanceColumns).toContain('Up to T2.Bal');

    // Semantic fields mapped
    expect(result.config.mappings.studentName).toBe('STUDENT NAME');
    expect(result.config.mappings.parentPhone).toBe('PHONE NO');
    expect(result.config.mappings.surname).toBe('SUR NAME');
    expect(result.config.mappings.class).toBe('C');
    expect(result.config.mappings.section).toBe('SEC');
  });

  it('handles arbitrary spreadsheet headers gracefully', () => {
    const arbitraryHeaders = [
      'Roll Number',
      'Candidate Name',
      'Father Mobile',
      'Quarterly Dues',
      'Bus Route No',
      'Hostel Room',
    ];

    const result = autoDetectMappings(arbitraryHeaders, '+91');
    expect(result.config.mappings.studentName).toBe('Candidate Name');
    expect(result.config.mappings.parentPhone).toBe('Father Mobile');
    expect(result.config.mappings.outstandingBalance).toBe('Quarterly Dues');

    // Unmapped columns preserved for templates
    expect(result.unmappedColumns).toContain('Bus Route No');
    expect(result.unmappedColumns).toContain('Hostel Room');
  });
});

describe('Spreadsheet Generation & Parsing Roundtrip', () => {
  it('creates an in-memory workbook and parses it accurately', () => {
    const worksheetData = [
      ['Roll', 'Student Name', 'Phone', 'Fee Due'],
      [101, 'Aarav Sharma', '9876543210', 9500],
      [102, 'Priya Patel', '9123456789', 0],
      [103, 'Vikram Reddy', '9876543210', -500], // sibling sharing phone
      ['', '', '', ''], // blank row to skip
      [104, 'Ananya Verma', '', 4000], // missing phone
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FeeRegister');

    // Generate Base64
    const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Parse Base64 back
    const parsed = parseSpreadsheet(b64, { type: 'base64' });

    expect(parsed.sheetNames).toEqual(['FeeRegister']);
    expect(parsed.totalRowsRead).toBe(4); // 4 valid rows (blank row skipped)
    expect(parsed.blankRowsSkipped).toBe(1);

    const auto = autoDetectMappings(parsed.headers, '+91');
    const validated = normalizeAndValidateDataset(parsed.rows, auto.config);

    expect(validated.summary.totalRecords).toBe(4);
    expect(validated.summary.validPhoneCount).toBe(3);
    expect(validated.summary.invalidPhoneCount).toBe(1); // Row 104 has no phone
    expect(validated.summary.zeroBalanceCount).toBe(1);
    expect(validated.summary.negativeBalanceCount).toBe(1);
    expect(validated.summary.positiveBalanceCount).toBe(2);
    expect(validated.summary.sharedPhoneGroupCount).toBe(1); // 9876543210 shared by 2 students
  });
});
