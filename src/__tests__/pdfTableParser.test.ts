import fs from 'fs';
import path from 'path';
import {
  extractTextFromPDFBytes,
  inspectPDFDocument,
  decodePdfLiteral,
  decodePdfHex,
  parseRawTextToStructuredRecords,
} from '../core/parsers/pdfTableParser';

describe('PDF & Document Table Parser', () => {
  it('parses typical invoice and statement lines into contacts and dues', () => {
    const rawRoster = `
      1. Rajesh Kumar   9876543210   ₹4,500   Tuition Oct
      2. Sunita Sharma  9059478739   1,200    Pending Exam Fee
      3. Amit Patel     +91 9123456780  ₹850   Transport Due
    `;

    const result = parseRawTextToStructuredRecords(rawRoster);

    expect(result.rows).toHaveLength(3);

    expect(result.rows[0].Name).toContain('Rajesh Kumar');
    expect(result.rows[0].Mobile).toBe('9876543210');
    expect(result.rows[0].Balance).toBe(4500);

    expect(result.rows[1].Name).toContain('Sunita Sharma');
    expect(result.rows[1].Mobile).toBe('9059478739');
    expect(result.rows[1].Balance).toBe(1200);

    expect(result.rows[2].Name).toContain('Amit Patel');
    expect(result.rows[2].Mobile).toBe('9123456780');
    expect(result.rows[2].Balance).toBe(850);
  });

  it('parses multiline contact blocks where name precedes phone and amount succeeds', () => {
    const multilineRoster = `
      AARAV SHARMA
      9876543210
      ₹11,500

      PRIYA PATEL
      9812345678
      8,500
    `;

    const result = parseRawTextToStructuredRecords(multilineRoster);
    expect(result.rows).toHaveLength(2);

    expect(result.rows[0].Name).toBe('AARAV SHARMA');
    expect(result.rows[0].Mobile).toBe('9876543210');
    expect(result.rows[0].Balance).toBe(11500);

    expect(result.rows[1].Name).toBe('PRIYA PATEL');
    expect(result.rows[1].Mobile).toBe('9812345678');
    expect(result.rows[1].Balance).toBe(8500);
  });

  it('correctly decodes PDF literal escape characters and UTF-16BE strings', () => {
    expect(decodePdfLiteral('Hello\\ World\\!')).toBe('Hello World!');
    expect(decodePdfLiteral('Contact\\: \\(9876543210\\)')).toBe('Contact: (9876543210)');
    // UTF-16BE "test dispatch"
    const utf16be = 'þÿ\x00t\x00e\x00s\x00t';
    expect(decodePdfLiteral(utf16be)).toBe('test');
  });

  it('correctly decodes PDF hex encoded text', () => {
    // ASCII "AARAV" in hex = 4141524156
    expect(decodePdfHex('4141524156')).toBe('AARAV');
    // UTF-16BE "AARAV" with BOM
    expect(decodePdfHex('feff00410041005200410056')).toBe('AARAV');
  });

  it('reads binary sample_school_roster.pdf and extracts all 10 students with balances', () => {
    const pdfPath = path.join(__dirname, '..', '..', 'sample_school_roster.pdf');
    if (fs.existsSync(pdfPath)) {
      const buffer = fs.readFileSync(pdfPath);
      const bytes = new Uint8Array(buffer);
      const extractedText = extractTextFromPDFBytes(bytes);

      expect(extractedText).toContain('Aarav Sharma');
      expect(extractedText).toContain('9876543210');

      const parsed = parseRawTextToStructuredRecords(extractedText);
      expect(parsed.rows.length).toBe(10);
      expect(parsed.rows[0].Name).toContain('Aarav Sharma');
      expect(parsed.rows[0].Mobile).toBe('9876543210');
      expect(parsed.rows[0].Balance).toBe(4500);

      expect(parsed.rows[4].Name).toContain('Vikram Malhotra');
      expect(parsed.rows[4].Mobile).toBe('9059478739');
      expect(parsed.rows[4].Balance).toBe(6500);
    }
  });

  it('inspects user uploaded scanned OKEN PDF and accurately diagnoses scanned image', () => {
    const okenPdfPath = 'C:/Users/saket/.gemini/antigravity/brain/b053a529-3d0f-48b6-aa24-537d3dce0245/.user_uploaded/media_1793340421349_0d8d839c.pdf';
    if (fs.existsSync(okenPdfPath)) {
      const bytes = new Uint8Array(fs.readFileSync(okenPdfPath));
      const inspection = inspectPDFDocument(bytes);

      expect(inspection.hasTextLayer).toBe(false);
      expect(inspection.isScannedImageOnly).toBe(true);
      expect(inspection.imageCount).toBeGreaterThan(0);
      expect(inspection.producer?.toLowerCase()).toContain('intsig');
      expect(inspection.userAdvice).toContain('scanned photos');
    }
  });

  it('inspects user uploaded Microsoft Print To PDF and accurately diagnoses vector outlines', () => {
    const printPdfPath = 'C:/Users/saket/.gemini/antigravity/brain/b053a529-3d0f-48b6-aa24-537d3dce0245/.user_uploaded/media_1793340421349_095059d3.pdf';
    if (fs.existsSync(printPdfPath)) {
      const bytes = new Uint8Array(fs.readFileSync(printPdfPath));
      const inspection = inspectPDFDocument(bytes);

      expect(inspection.hasTextLayer).toBe(false);
      expect(inspection.isVectorOutlineOnly).toBe(true);
      expect(inspection.producer).toBe('Microsoft: Print To PDF');
      expect(inspection.title).toBe('test dispatch - Google Sheets');
      expect(inspection.userAdvice).toContain('printed to PDF with text vectorized');
    }
  });

  it('handles lines without balance gracefully', () => {
    const rawRoster = `
      Vikram Singh   9876500000
    `;

    const result = parseRawTextToStructuredRecords(rawRoster);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].Name).toBe('Vikram Singh');
    expect(result.rows[0].Mobile).toBe('9876500000');
    expect(result.rows[0].Balance).toBeUndefined();
  });
});
