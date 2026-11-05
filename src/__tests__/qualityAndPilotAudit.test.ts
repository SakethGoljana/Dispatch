/**
 * Phase 7: Quality Assurance & Pilot Readiness End-to-End Audit Test Suite
 * Validates edge case recovery, sibling shared phone detection, negative balance handling,
 * multi-column ambiguous balance resolution, template compiler safety, and privacy redaction.
 */

import { parseSpreadsheet } from '../core/parsers/spreadsheetParser';
import { detectHeaderRow } from '../core/parsers/headerDetector';
import { autoDetectMappings } from '../core/mapper/columnMapper';
import {
  normalizeAndValidateDataset,
  normalizePhoneNumber,
  parseMonetaryValue,
} from '../core/validator/recordValidator';
import {
  renderStudentMessage,
  extractTemplateTokens,
  formatIndianCurrency,
} from '../core/template/templateCompiler';
import { generateWhatsAppLink } from '../adapters/whatsappLink';
import { RawSpreadsheetRow } from '../types';

describe('Phase 7 QA Audit: Spreadsheet Parser & Dirty Data Handling', () => {
  it('correctly parses raw CSV with empty lines, quotes, and whitespace', () => {
    const rawCsv = `
"ACADEMIC YEAR 2025-2026 FEE SUMMARY"
,,,

"S.No","Student Name","Father Mobile","Class","Section","25-26 Bal","Remarks"
"1","Aarav Sharma","9876543210","2","A","5000","Term 1 Paid"
"2","Diya Patel","9876543211","2","A","-1333","Advance credit"
"3","Kabir Singh"," 9876543210 ","2","A","0","Fully cleared"
"4","Ananya Rao","","2","B","4500","Missing phone"
,,,
`;
    const parsed = parseSpreadsheet(rawCsv, { type: 'string' });
    expect(parsed.rows.length).toBe(4);
    expect(parsed.headers).toEqual([
      'S.No',
      'Student Name',
      'Father Mobile',
      'Class',
      'Section',
      '25-26 Bal',
      'Remarks',
    ]);
  });

  it('handles negative credit balances and Indian currency formatting correctly', () => {
    expect(parseMonetaryValue('-1333')).toBe(-1333);
    expect(parseMonetaryValue('₹ -1,333')).toBe(-1333);
    expect(parseMonetaryValue('₹ 25,000')).toBe(25000);
    expect(parseMonetaryValue('0')).toBe(0);
    expect(parseMonetaryValue(null)).toBeUndefined();
    expect(parseMonetaryValue('')).toBeUndefined();

    expect(formatIndianCurrency(11500)).toBe('11,500');
    expect(formatIndianCurrency(150000)).toBe('1,50,000');
    expect(formatIndianCurrency(0)).toBe('0');
  });

  it('detects sibling groups sharing the same parent phone number', () => {
    const rows: RawSpreadsheetRow[] = [
      { __rowNumber: 1, 'Student Name': 'Aarav Sharma', 'Father Mobile': '9876543210', '25-26 Bal': '5000' },
      { __rowNumber: 2, 'Student Name': 'Kabir Sharma', 'Father Mobile': '9876543210', '25-26 Bal': '3500' }, // Brother
      { __rowNumber: 3, 'Student Name': 'Priya Nair', 'Father Mobile': '9123456789', '25-26 Bal': '2000' },
    ];

    const mappingConfig = {
      mappings: {
        studentName: 'Student Name',
        parentPhone: 'Father Mobile',
        outstandingBalance: '25-26 Bal',
      },
      balanceColumnKey: '25-26 Bal',
      defaultCountryCode: '+91',
      unmappedColumns: [],
    };

    const { records, summary } = normalizeAndValidateDataset(rows, mappingConfig);

    expect(summary.totalRecords).toBe(3);
    expect(summary.sharedPhoneGroupCount).toBe(1); // One sibling pair sharing a number
    expect(records.length).toBe(3);
    expect(records[0].parentPhone).toBe('+919876543210');
    expect(records[1].parentPhone).toBe('+919876543210');
  });

  it('detects ambiguous balance columns and flags them for teacher confirmation', () => {
    const headers = [
      'Roll No',
      'Name',
      'Phone',
      '25-26 Bal',
      'Up to S2.Bal',
      'Upto B2.Bal',
      'Up to T2.Bal',
    ];

    const result = autoDetectMappings(headers);

    expect(result.balanceAmbiguityDetected).toBe(true);
    expect(result.candidateBalanceColumns.length).toBe(4);
    expect(result.candidateBalanceColumns).toContain('25-26 Bal');
    expect(result.candidateBalanceColumns).toContain('Up to S2.Bal');
    expect(result.candidateBalanceColumns).toContain('Upto B2.Bal');
    expect(result.candidateBalanceColumns).toContain('Up to T2.Bal');
  });
});

describe('Phase 7 QA Audit: Template Safety & Encoding Verification', () => {
  it('extracts all variable tokens including fallbacks and filters', () => {
    const template = 'Dear Parent of {{STUDENT_NAME}}, dues are {{OUTSTANDING_BALANCE}} for Class {{CLASS | default: "Primary"}}.';
    const tokens = extractTemplateTokens(template);

    expect(tokens.map((t) => t.key)).toEqual(['STUDENT_NAME', 'OUTSTANDING_BALANCE', 'CLASS']);
    expect(tokens[2].fallback).toBe('Primary');
  });

  it('safely renders template with fallback values when secondary field is missing', () => {
    const template = 'Dear Parent, student {{STUDENT_NAME}} in Section {{SECTION | default: "General"}} has balance ₹{{OUTSTANDING_BALANCE}}.';
    const record = {
      id: 'rec-1',
      rowNumber: 1,
      studentName: 'Aarav Sharma',
      parentPhone: '+919876543210',
      rawPhone: '9876543210',
      outstandingBalance: 5000,
      class: '5',
      section: '', // missing section
      isValidPhone: true,
      validationErrors: [],
      customFields: {},
    };

    const result = renderStudentMessage(template, record, ['STUDENT_NAME']);
    expect(result.isValid).toBe(true);
    expect(result.renderedText).toContain('Section General');
    expect(result.renderedText).toContain('balance ₹5,000');
  });

  it('blocks rendering when a required primary variable (like studentName) is missing', () => {
    const template = 'Dear Parent of {{STUDENT_NAME}}, dues are {{OUTSTANDING_BALANCE}}.';
    const record = {
      id: 'rec-2',
      rowNumber: 2,
      studentName: '', // empty!
      parentPhone: '+919876543210',
      rawPhone: '9876543210',
      outstandingBalance: 5000,
      isValidPhone: true,
      validationErrors: [],
      customFields: {},
    };

    const result = renderStudentMessage(template, record, ['STUDENT_NAME']);
    expect(result.isValid).toBe(false);
    expect(result.missingRequiredFields).toContain('STUDENT_NAME');
  });

  it('encodes WhatsApp click-to-chat URL with proper URL percent encoding', () => {
    const phone = '+91 98765 43210';
    const text = 'Dear Parent,\nYour child\'s fee balance is ₹12,500 & due on 15th.';
    const linkResult = generateWhatsAppLink(phone, text, '91');

    expect(linkResult.cleanPhone).toBe('919876543210');
    expect(linkResult.nativeUri).toContain('whatsapp://send?phone=919876543210&text=');
    // Ensure newline is encoded
    expect(linkResult.nativeUri).toContain('%0A');
    // Ensure ampersand is encoded
    expect(linkResult.nativeUri).toContain('%26');
  });
});
