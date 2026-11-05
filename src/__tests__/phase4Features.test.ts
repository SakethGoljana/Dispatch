jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    write: jest.fn(),
    uri: 'file:///cache/export.xlsx',
  })),
  Paths: { cache: 'file:///cache' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { extractGoogleSheetCsvUrl } from '../core/parsers/googleSheetsSync';
import {
  REGIONAL_LANGUAGES,
  REGIONAL_TEMPLATES,
  getRegionalPresets,
} from '../core/template/regionalTemplates';
import { generateWhatsAppWebDataset } from '../core/export/whatsappWebCompanion';
import { NormalizedStudentRecord } from '../types';

describe('Phase 4: Google Sheets Live Sync Parser', () => {
  it('correctly extracts sheet ID and builds export CSV url for standard Google Sheets', () => {
    const rawUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
    const info = extractGoogleSheetCsvUrl(rawUrl);

    expect(info.sheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    expect(info.gid).toBe('0');
    expect(info.isPublished).toBe(false);
    expect(info.exportCsvUrl).toBe(
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv&gid=0'
    );
  });

  it('correctly extracts sheet ID and builds export CSV url for published Google Sheets (pubhtml)', () => {
    const rawUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTw3bV7N9m12345/pubhtml?gid=105';
    const info = extractGoogleSheetCsvUrl(rawUrl);

    expect(info.sheetId).toBe('2PACX-1vTw3bV7N9m12345');
    expect(info.gid).toBe('105');
    expect(info.isPublished).toBe(true);
    expect(info.exportCsvUrl).toBe(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTw3bV7N9m12345/pub?output=csv&gid=105'
    );
  });

  it('throws an error for non-Google-Sheet URLs', () => {
    expect(() => extractGoogleSheetCsvUrl('https://example.com/sheet.xlsx')).toThrow(
      'Invalid Google Sheets URL'
    );
  });
});

describe('Phase 4: Regional Language Templates', () => {
  it('contains all 8 supported Indian regional languages', () => {
    const codes = REGIONAL_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(expect.arrayContaining(['en', 'hi', 'mr', 'te', 'ta', 'kn', 'bn', 'gu']));
    expect(REGIONAL_LANGUAGES.length).toBe(8);
  });

  it('provides authentic presets for Hindi and Marathi containing tokens', () => {
    const hindiPresets = getRegionalPresets('hi');
    expect(hindiPresets.length).toBeGreaterThanOrEqual(3);
    const hindiFee = hindiPresets.find((p) => p.category === 'fee');
    expect(hindiFee).toBeDefined();
    expect(hindiFee?.text).toContain('{{Student Name}}');
    expect(hindiFee?.text).toContain('{{Balance}}');

    const marathiPresets = getRegionalPresets('mr');
    const marathiFee = marathiPresets.find((p) => p.category === 'fee');
    expect(marathiFee).toBeDefined();
    expect(marathiFee?.text).toContain('{{Student Name}}');
  });

  it('falls back to English when an unknown language code is requested', () => {
    const fallback = getRegionalPresets('xyz');
    expect(fallback).toEqual(REGIONAL_TEMPLATES.en);
  });
});

describe('Phase 4: WhatsApp Web Companion', () => {
  const mockStudents: NormalizedStudentRecord[] = [
    {
      id: 'stud-1',
      rowNumber: 1,
      studentName: 'Rohan Mehra',
      parentPhone: '9876543210',
      rawPhone: '9876543210',
      outstandingBalance: 2500,
      isValidPhone: true,
      customFields: {},
      validationErrors: [],
    },
    {
      id: 'stud-2',
      rowNumber: 2,
      studentName: 'Ananya Roy',
      parentPhone: '+919123456789',
      rawPhone: '+919123456789',
      outstandingBalance: 1200,
      isValidPhone: true,
      customFields: {},
      validationErrors: [],
    },
  ];

  it('generates desktop companion items with direct web.whatsapp.com links', () => {
    const template = 'Hello {{Student Name}}, fee due is ₹{{Balance}}';
    const items = generateWhatsAppWebDataset(mockStudents, template);

    expect(items.length).toBe(2);

    expect(items[0].name).toBe('Rohan Mehra');
    expect(items[0].phone).toBe('919876543210');
    expect(items[0].message).toContain('₹2,500');
    expect(items[0].webLink).toContain('https://web.whatsapp.com/send?phone=919876543210');
    expect(items[0].webLink).toContain(encodeURIComponent('Hello Rohan Mehra, fee due is ₹2,500'));

    expect(items[1].name).toBe('Ananya Roy');
    expect(items[1].phone).toBe('919123456789');
    expect(items[1].webLink).toContain('https://web.whatsapp.com/send?phone=919123456789');
  });
});
