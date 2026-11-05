/**
 * Universal Spreadsheet Parser
 * Reads .xlsx, .xls, and .csv files, detects headers, extracts sheets,
 * preserves phone number strings without leading zero truncation.
 */

import * as XLSX from 'xlsx';
import { RawSpreadsheetRow } from '../../types';
import { detectHeaderRow } from './headerDetector';

export interface ParseOptions {
  sheetName?: string;
  headerRowIndexOverride?: number;
  type?: 'base64' | 'binary' | 'buffer' | 'string' | 'array';
}

export interface ParsedSpreadsheetResult {
  sheetNames: string[];
  selectedSheet: string;
  headerRowIndex: number;
  headers: string[];
  rows: RawSpreadsheetRow[];
  totalRowsRead: number;
  blankRowsSkipped: number;
}

export function parseSpreadsheet(
  data: any,
  options: ParseOptions = {}
): ParsedSpreadsheetResult {
  const readType = options.type || (typeof data === 'string' ? 'base64' : 'buffer');

  // Read workbook preserving formatted text representation (cellText: true, raw: false)
  const workbook = XLSX.read(data, {
    type: readType,
    cellText: true,
    raw: false,
    cellDates: true,
  });

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('No worksheets found in spreadsheet');
  }

  const selectedSheet =
    options.sheetName && sheetNames.includes(options.sheetName)
      ? options.sheetName
      : sheetNames[0];

  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    throw new Error(`Worksheet "${selectedSheet}" not found`);
  }

  // Convert worksheet to a dense 2D array of rows
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    return {
      sheetNames,
      selectedSheet,
      headerRowIndex: 0,
      headers: [],
      rows: [],
      totalRowsRead: 0,
      blankRowsSkipped: 0,
    };
  }

  // Determine header row (auto-detected or manual override)
  let headerRowIndex = 0;
  let headers: string[] = [];

  if (typeof options.headerRowIndexOverride === 'number') {
    headerRowIndex = options.headerRowIndexOverride;
    const specifiedRow = rawMatrix[headerRowIndex] || [];
    headers = specifiedRow.map((c: any, i: number) =>
      c !== null && c !== undefined && String(c).trim() !== ''
        ? String(c).trim()
        : `Column_${i + 1}`
    );
  } else {
    const detection = detectHeaderRow(rawMatrix);
    headerRowIndex = detection.headerRowIndex;
    headers = detection.headers;
  }

  // Deduplicate identical headers by appending _2, _3 etc.
  const headerCountMap = new Map<string, number>();
  const uniqueHeaders: string[] = headers.map((h) => {
    const cleanHeader = h.trim();
    const count = headerCountMap.get(cleanHeader) || 0;
    headerCountMap.set(cleanHeader, count + 1);
    return count === 0 ? cleanHeader : `${cleanHeader}_${count + 1}`;
  });

  // Extract records following the header row
  const rows: RawSpreadsheetRow[] = [];
  let blankRowsSkipped = 0;

  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const rawRow = rawMatrix[r];
    if (!rawRow || !Array.isArray(rawRow)) {
      blankRowsSkipped++;
      continue;
    }

    // Check if the row is entirely blank
    const isBlank = rawRow.every(
      (cell) => cell === null || cell === undefined || String(cell).trim() === ''
    );

    if (isBlank) {
      blankRowsSkipped++;
      continue;
    }

    const rowObj: RawSpreadsheetRow = {
      __rowNumber: r + 1, // 1-indexed for human readability
    };

    for (let c = 0; c < uniqueHeaders.length; c++) {
      const headerName = uniqueHeaders[c];
      const cellVal = rawRow[c];
      rowObj[headerName] =
        cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';
    }

    rows.push(rowObj);
  }

  return {
    sheetNames,
    selectedSheet,
    headerRowIndex,
    headers: uniqueHeaders,
    rows,
    totalRowsRead: rows.length,
    blankRowsSkipped,
  };
}
